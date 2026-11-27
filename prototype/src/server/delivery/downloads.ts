import {inclusiveUtcDate,releaseAccess,validatePaidReleases,type PaidRelease} from './releases.ts';
import {ArtifactError,type PrivateArtifactStore} from './storage.ts';
import {downloadTicketSeconds,ticketBinding,type DownloadTicketSigner} from './tickets.ts';
import type {ReceiptSummary} from '../orders/ledger.ts';
import {currentAccess,planCovers,type AccessPeriod,type CurrentAccess} from '../orders/subscription.ts';

/**
 * Entitlements and private delivery. Every response is private/no-store. Access comes only from
 * the server ledger; a download needs the owner's live session, a short-lived ticket bound to
 * that session, a subscription level open right now that covers the item and an unrevoked
 * release, checked again on every request. After the paid period ends new downloads answer 403;
 * nothing already downloaded is touched. Storage, database or auth failures fail closed.
 */
export interface DeliveryLedger {
  accessPeriods(userId: string): Promise<AccessPeriod[]>;
  receipts(userId: string): Promise<ReceiptSummary[]>;
  revokedReleases(hashes: readonly string[]): Promise<Set<string>>;
  recordDownload(userId: string, itemId: string, releaseSha256: string, outcome: 'issued' | 'served', at: number): Promise<void>;
}
export interface DeliverySession {userId: string; sessionId: string}
export interface DeliveryDependencies {
  /** Delivery flag plus a configured private bucket; independent of new-sale flags. */
  enabled: boolean;
  mainOrigin: string;
  releases: readonly PaidRelease[];
  ledger: DeliveryLedger;
  storage: PrivateArtifactStore | null;
  tickets: () => Promise<DownloadTicketSigner>;
  authenticate(request: Request): Promise<DeliverySession | null>;
  verifyCsrf(request: Request): Promise<boolean>;
  rateLimit(request: Request, userId: string, action: 'entitlements' | 'download-issue' | 'download-serve'): Promise<boolean>;
  now?: () => number;
}

const baseHeaders = {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'};
const json = (value: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(value, {status, headers: {...baseHeaders, ...extra}});
const failure = (code: string, status: number, extra: Record<string, string> = {}) => json({error: {code, requestId: crypto.randomUUID(), retryable: status === 429 || status >= 500}}, status, extra);

async function strictJson(request: Request, limit: number): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return undefined;
  if (Number(request.headers.get('content-length') ?? 0) > limit || !request.body) return undefined;
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) {await reader.cancel(); return undefined;}
      chunks.push(next.value);
    }
  } finally {reader.releaseLock();}
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
  try {return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));} catch {return undefined;}
}

export function createDeliveryHttpHandlers(deps: DeliveryDependencies) {
  const origin = new URL(deps.mainOrigin);
  if (origin.protocol !== 'https:' || origin.origin !== deps.mainOrigin) throw new Error('EXACT_HTTPS_ORIGIN_REQUIRED');
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const releases = validatePaidReleases(deps.releases);
  const byHash = new Map(releases.map(release => [release.sha256, release]));

  async function coverage(userId: string) {
    const periods = await deps.ledger.accessPeriods(userId), at = now();
    const access = currentAccess(periods, at);
    const relevant = access ? releases.filter(release => planCovers(access.plan, release.itemId)) : [];
    const revoked = await deps.ledger.revokedReleases(relevant.map(release => release.sha256));
    return {periods, access, relevant, revoked, at};
  }
  /** Level and end date for the cabinet; the inclusive last day is computed once on the server. */
  function subscription(periods: readonly AccessPeriod[], access: CurrentAccess | null, at: number) {
    const live = periods.filter(period => period.status === 'active');
    const describe = (status: 'active' | 'scheduled' | 'expired', plan: AccessPeriod['plan'], startsAt: number, endsAt: number) => ({plan, status, startsAt, endsAt, accessUntil: inclusiveUtcDate(endsAt)});
    if (access) return describe('active', access.plan, access.startsAt, access.endsAt);
    // Only after a manual refund of the current period can a paid period lie entirely in the future.
    const next = live.filter(period => period.startsAt > at).sort((a, b) => a.startsAt - b.startsAt)[0];
    if (next) return describe('scheduled', next.plan, next.startsAt, next.endsAt);
    const last = live.filter(period => period.endsAt <= at).sort((a, b) => b.endsAt - a.endsAt)[0];
    return last ? describe('expired', last.plan, last.startsAt, last.endsAt) : {plan: null, status: 'none' as const};
  }

  return {
    /** GET: authoritative level, end date and downloadable releases for the cabinet. Errors are never "no subscription". */
    async entitlements(request: Request) {
      if (request.method !== 'GET') return failure('METHOD_NOT_ALLOWED', 405, {Allow: 'GET'});
      if (!deps.enabled) return failure('COMMERCE_DISABLED', 503);
      try {
        const session = await deps.authenticate(request);
        if (!session) return failure('UNAUTHENTICATED', 401);
        if (!await deps.rateLimit(request, session.userId, 'entitlements')) return failure('RATE_LIMITED', 429, {'Retry-After': '60'});
        const state = await coverage(session.userId);
        const items = [...new Set(state.relevant.map(release => release.itemId))].sort().map(itemId => ({
          itemId,
          releases: state.relevant.filter(release => release.itemId === itemId).sort((a, b) => b.publishedAt - a.publishedAt)
            .map(release => ({version: release.version, sha256: release.sha256, byteLength: release.byteLength, publishedAt: release.publishedAt, kind: release.kind, access: releaseAccess(release, state.access, state.revoked)})),
        }));
        const periods = state.periods.map(period => ({orderId: period.orderId, plan: period.plan, months: period.months, startsAt: period.startsAt, endsAt: period.endsAt, status: period.status}));
        const receipts = (await deps.ledger.receipts(session.userId)).map(receipt => ({...receipt}));
        return json({verifiedAt: state.at, subscription: subscription(state.periods, state.access, state.at), items, periods, receipts});
      } catch {return failure('TEMPORARILY_UNAVAILABLE', 503);}
    },
    /** POST {itemId, sha256?}: issues a ticket for one release of an item the open level covers. */
    async issue(request: Request) {
      if (request.method !== 'POST') return failure('METHOD_NOT_ALLOWED', 405, {Allow: 'POST'});
      if (!deps.enabled || !deps.storage) return failure('COMMERCE_DISABLED', 503);
      try {
        if (request.headers.get('origin') !== deps.mainOrigin) return failure('INVALID_ORIGIN', 403);
        const session = await deps.authenticate(request);
        if (!session) return failure('UNAUTHENTICATED', 401);
        if (!await deps.verifyCsrf(request)) return failure('INVALID_CSRF', 403);
        if (!await deps.rateLimit(request, session.userId, 'download-issue')) return failure('RATE_LIMITED', 429, {'Retry-After': '60'});
        const body = await strictJson(request, 512);
        const keys = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body).sort().join(',') : '';
        const input = body as {itemId?: unknown; sha256?: unknown};
        if ((keys !== 'itemId' && keys !== 'itemId,sha256') || typeof input.itemId !== 'string' || !/^[SCEA]\d{3}$/.test(input.itemId) || (input.sha256 !== undefined && (typeof input.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(input.sha256)))) return failure('INVALID_INPUT', 400);
        const state = await coverage(session.userId);
        if (!state.access) return failure('SUBSCRIPTION_INACTIVE', 403);
        if (!planCovers(state.access.plan, input.itemId)) return failure('RELEASE_NOT_COVERED', 403);
        const candidates = state.relevant.filter(release => release.itemId === input.itemId && (input.sha256 === undefined || release.sha256 === input.sha256));
        if (!candidates.length) return failure('NOT_FOUND', 404);
        const available = candidates.filter(release => releaseAccess(release, state.access, state.revoked) === 'available').sort((a, b) => b.publishedAt - a.publishedAt);
        if (!available.length) return failure('RELEASE_REVOKED', 410);
        const release = available[0], at = now(), expiresAt = at + downloadTicketSeconds;
        const ticket = await (await deps.tickets()).sign({binding: await ticketBinding(session.userId, session.sessionId), itemId: release.itemId, sha256: release.sha256, expiresAt});
        await deps.ledger.recordDownload(session.userId, release.itemId, release.sha256, 'issued', at);
        return json({url: `/api/v1/downloads/${ticket}`, expiresAt, itemId: release.itemId, version: release.version, sha256: release.sha256, byteLength: release.byteLength}, 201);
      } catch {return failure('TEMPORARILY_UNAVAILABLE', 503);}
    },
    /** GET /downloads/{ticket}: same session, access still open now, registry object key, verified bytes. */
    async serve(request: Request, token: string) {
      if (request.method !== 'GET') return failure('METHOD_NOT_ALLOWED', 405, {Allow: 'GET'});
      if (!deps.enabled || !deps.storage) return failure('COMMERCE_DISABLED', 503);
      try {
        const session = await deps.authenticate(request);
        if (!session) return failure('UNAUTHENTICATED', 401);
        if (!await deps.rateLimit(request, session.userId, 'download-serve')) return failure('RATE_LIMITED', 429, {'Retry-After': '60'});
        const ticket = await (await deps.tickets()).verify(token, now());
        if (!ticket || ticket.binding !== await ticketBinding(session.userId, session.sessionId)) return failure('TICKET_INVALID', 403);
        const release = byHash.get(ticket.sha256);
        if (!release || release.itemId !== ticket.itemId) return failure('NOT_FOUND', 404);
        const state = await coverage(session.userId);
        const verdict = releaseAccess(release, state.access, state.revoked);
        if (verdict === 'inactive') return failure('SUBSCRIPTION_INACTIVE', 403);
        if (verdict === 'revoked') return failure('RELEASE_REVOKED', 410);
        if (verdict !== 'available') return failure('RELEASE_NOT_COVERED', 403);
        let bytes: Uint8Array<ArrayBuffer>;
        try {bytes = await deps.storage.read(release);} catch (cause) {return failure(cause instanceof ArtifactError && cause.code === 'ARTIFACT_INTEGRITY' ? 'ARTIFACT_INTEGRITY' : 'TEMPORARILY_UNAVAILABLE', 503);}
        await deps.ledger.recordDownload(session.userId, release.itemId, release.sha256, 'served', now());
        return new Response(bytes, {status: 200, headers: {...baseHeaders,
          'Content-Type': 'application/zip',
          'Content-Length': String(bytes.byteLength),
          'Content-Disposition': `attachment; filename="tallshift-${release.itemId}-${release.version}.zip"`,
          'Content-Security-Policy': "default-src 'none'; sandbox",
          'Cross-Origin-Resource-Policy': 'same-origin',
        }});
      } catch {return failure('TEMPORARILY_UNAVAILABLE', 503);}
    },
  };
}
