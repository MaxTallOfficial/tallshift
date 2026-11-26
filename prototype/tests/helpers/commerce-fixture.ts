import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createD1Fixture} from './ton-d1.ts';
import {createCommerceStore} from '../../src/server/orders/store.ts';
import {createCommerceService,type CommerceDependencies} from '../../src/server/orders/service.ts';
import {createCommerceLedger} from '../../src/server/orders/ledger.ts';
import {createTonPaymentStore,type TonAsset} from '../../src/server/payments/ton/store.ts';
import {currentReleaseHashes,paidReleaseObjectKey,type PaidRelease} from '../../src/server/delivery/releases.ts';
import type {R2BucketLike} from '../../src/server/delivery/storage.ts';
import {pricingPlanScopes} from '../../src/foundations/pricing-plans.ts';

/** Minimal valid empty ZIP (end-of-central-directory record) with a distinguishing comment. */
export function zipBytes(label: string) {
  const comment = new TextEncoder().encode(label);
  const bytes = new Uint8Array(22 + comment.length);
  bytes.set([0x50, 0x4b, 0x05, 0x06]);
  bytes[20] = comment.length & 0xff; bytes[21] = comment.length >> 8;
  bytes.set(comment, 22);
  return bytes;
}
export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export function release(itemId: string, version: string, publishedAt: number, kind: PaidRelease['kind'] = 'initial') {
  const bytes = zipBytes(`${itemId}@${version}`), hash = sha256(bytes);
  return {release: {itemId, version, sha256: hash, byteLength: bytes.length, objectKey: paidReleaseObjectKey(itemId, version, hash), publishedAt, kind} satisfies PaidRelease, bytes};
}
/** In-memory stand-in for the private R2 bucket (tests only, never on a production path). */
export function memoryBucket(objects: Map<string, Uint8Array>) {
  const calls: string[] = [];
  const bucket: R2BucketLike = {async get(key) {calls.push(key); const value = objects.get(key); return value ? {size: value.length, arrayBuffer: async () => value.slice().buffer} : null;}};
  return {bucket, calls, objects};
}
export const fixtureRecipient = '0:' + 'a'.repeat(64);

export function createCommerceFixture(options: {items?: readonly string[]} = {}) {
  const f = createD1Fixture();
  for (const file of ['0002_auth.sql', '0003_commerce.sql', '0004_commerce_fulfillment.sql']) f.sqlite.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), 'utf8'));
  for (const id of ['buyer', 'other']) f.sqlite.prepare('INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES(?,?,?,1,0,0)').run(id, id, `${id}@example.com`);
  const items = options.items ?? pricingPlanScopes.bundle;
  const built = items.map(itemId => release(itemId, '1.0.0', 500));
  const releases: PaidRelease[] = built.map(entry => entry.release);
  const objects = new Map(built.map(entry => [entry.release.objectKey, entry.bytes]));
  const state = {now: 1000, ready: true, tax: 0, terms: 'terms-v1', taxRevision: 'tax-v1'};
  const store = createCommerceStore(f.db), ledger = createCommerceLedger(f.db), ton = createTonPaymentStore(f.db);
  const deps: CommerceDependencies = {enabled: true, store, ownership: ledger.pricingOwnership, readiness: async () => ({deliveryReady: state.ready, sellerTermsReady: state.ready, termsRevision: state.terms}), tax: async () => ({amountMinor: state.tax, revision: state.taxRevision}), releases: currentReleaseHashes(releases), revokedReleases: ledger.revokedReleases, now: () => state.now};
  const service = createCommerceService(deps);
  let sequence = 0;
  /** Quote -> invoice -> verified settlement (as the TON verifier would record it). */
  async function settle(userId: string, plan: 'product' | 'bundle', change: {usdMinor?: number; asset?: TonAsset} = {}) {
    const n = ++sequence;
    const q = await service.createQuote(userId, {plan, idempotencyKey: `quote-${n}`});
    const asset = change.asset ?? 'TON';
    const invoice = {id: `invoice-${n}`, userId, quoteId: q.id, itemIds: q.itemIds, termsRevision: q.termsRevision, asset, network: 'ton-testnet' as const, recipient: fixtureRecipient, jettonMaster: asset === 'USDT' ? '0:' + 'b'.repeat(64) : null, amountBaseUnits: '5333333334', comment: `ts_${n.toString(16).padStart(32, '0')}`, createdAt: state.now, expiresAt: state.now + 800, fxQuoteId: `fx-${n}`, fxSnapshot: {source: 'fixture', usdPerUnit: '3', quotedAt: state.now, expiresAt: state.now + 800, usdMinor: change.usdMinor ?? q.amountMinor}, idempotencyKey: `invoice-${n}`, inputDigest: 'c'.repeat(64)};
    await ton.createInvoice(invoice);
    await ton.recordVerifiedPayment({eventKey: `event-${n}`, txIdentity: `ton-testnet:tx-${n}`, invoiceId: invoice.id, asset, network: invoice.network, recipient: invoice.recipient, comment: invoice.comment, amountBaseUnits: invoice.amountBaseUnits, transactionAt: state.now + 10, observedAt: state.now + 11, proofDigest: 'd'.repeat(64)});
    return {quote: q, invoiceId: invoice.id, paidAt: state.now + 10};
  }
  return {...f, state, store, ledger, ton, deps, service, releases, objects, settle};
}
