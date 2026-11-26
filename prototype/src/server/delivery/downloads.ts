import {inclusiveUtcDate,releaseAccess,validatePaidReleases,type PaidRelease,type ReleaseAccess} from './releases.ts';
import {ArtifactError,type PrivateArtifactStore} from './storage.ts';
import {downloadTicketSeconds,ticketBinding,type DownloadTicketSigner} from './tickets.ts';
import type {ActiveGrant,ReceiptSummary} from '../orders/ledger.ts';

/**
 * Entitlements and private delivery. Every response is private/no-store. Ownership comes only
 * from the server ledger; a download needs the owner's live session, a short-lived ticket
 * bound to that session, current grant coverage and an unrevoked release, checked again on
 * every request. Storage, database or auth failures fail closed and never remove ownership.
 */
export interface DeliveryLedger {
  activeGrants(userId: string): Promise<ActiveGrant[]>;
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
    const grants = await deps.ledger.activeGrants(userId);
    const owned = new Set(grants.map(grant => grant.itemId));
    const relevant = releases.filter(release => owned.has(release.itemId));
    const revoked = await deps.ledger.revokedReleases(relevant.map(release => release.sha256));
    return {grants, relevant, revoked};
  }
  const access = (release: PaidRelease, state: Awaited<ReturnType<typeof coverage>>): ReleaseAccess => releaseAccess(release, state.grants, state.revoked);

  return {
    /** GET: authoritative ownership for the cabinet. Errors are never "no purchases". */
    async entitlements(request: Request) {
      if (request.method !== 'GET') return failure('METHOD_NOT_ALLOWED', 405, {Allow: 'GET'});
      if (!deps.enabled) return failure('COMMERCE_DISABLED', 503);
      try {
        const session = await deps.authenticate(request);
        if (!session) return failure('UNAUTHENTICATED', 401);
        if (!await deps.rateLimit(request, session.userId, 'entitlements')) return failure('RATE_LIMITED', 429, {'Retry-After': '60'});
        const state = await coverage(session.userId);
        const items = [...new Set(state.grants.map(grant => grant.itemId))].sort().map(itemId => {
          const updatesEnd = Math.max(...state.grants.filter(grant => grant.itemId === itemId).map(grant => grant.updatesEnd));
          return {
            itemId,
            functionalUpdatesUntil: inclusiveUtcDate(updatesEnd),
            releases: state.relevant.filter(release => release.itemId === itemId).sort((a, b) => b.publishedAt - a.publishedAt)
              .map(release => ({version: release.version, sha256: release.sha256, byteLength: release.byteLength, publishedAt: release.publishedAt, kind: release.kind, access: access(release, state)})),
          };
        });
        const receipts = (await deps.ledger.receipts(session.userId)).map(receipt => ({...receipt}));
        return json({verifiedAt: now(), items, receipts});
      } catch {return failure('TEMPORARILY_UNAVAILABLE', 503);}
    },
    /** POST {itemId, sha256?}: issues a ticket for one covered release of an owned item. */
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
        if (!state.grants.some(grant => grant.itemId === input.itemId)) return failure('RELEASE_NOT_COVERED', 403);
        const candidates = state.relevant.filter(release => release.itemId === input.itemId && (input.sha256 === undefined || release.sha256 === input.sha256));
        if (!candidates.length) return failure('NOT_FOUND', 404);
        const available = candidates.filter(release => access(release, state) === 'available').sort((a, b) => b.publishedAt - a.publishedAt);
        if (!available.length) return candidates.some(release => access(release, state) === 'revoked') ? failure('RELEASE_REVOKED', 410) : failure('RELEASE_NOT_COVERED', 403);
        const release = available[0], at = now(), expiresAt = at + downloadTicketSeconds;
        const ticket = await (await deps.tickets()).sign({binding: await ticketBinding(session.userId, session.sessionId), itemId: release.itemId, sha256: release.sha256, expiresAt});
        await deps.ledger.recordDownload(session.userId, release.itemId, release.sha256, 'issued', at);
        return json({url: `/api/v1/downloads/${ticket}`, expiresAt, itemId: release.itemId, version: release.version, sha256: release.sha256, byteLength: release.byteLength}, 201);
      } catch {return failure('TEMPORARILY_UNAVAILABLE', 503);}
    },
    /** GET /downloads/{ticket}: same session, fresh coverage, registry object key, verified bytes. */
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
        const verdict = access(release, state);
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
