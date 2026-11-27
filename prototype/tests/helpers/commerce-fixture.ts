import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createD1Fixture} from './ton-d1.ts';
import {createCommerceStore} from '../../src/server/orders/store.ts';
import {createCommerceService,type CommerceDependencies} from '../../src/server/orders/service.ts';
import {createCommerceLedger} from '../../src/server/orders/ledger.ts';
import {createFulfillmentWorker} from '../../src/server/orders/fulfillment.ts';
import {subscriptionPlanItems,usdtBaseUnits,type SubscriptionPlan} from '../../src/server/orders/subscription.ts';
import {createTonPaymentStore,type TonAsset} from '../../src/server/payments/ton/store.ts';
import {currentReleaseHashes,paidReleaseObjectKey,type PaidRelease} from '../../src/server/delivery/releases.ts';
import type {R2BucketLike} from '../../src/server/delivery/storage.ts';

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
  const items = options.items ?? subscriptionPlanItems.all;
  const built = items.map(itemId => release(itemId, '1.0.0', 500));
  const releases: PaidRelease[] = built.map(entry => entry.release);
  const objects = new Map(built.map(entry => [entry.release.objectKey, entry.bytes]));
  // Fixture prices only (USDT minor units); production prices live in src/server/orders/launch.ts.
  const state = {now: 1000, ready: true, tax: 0, terms: 'terms-v1', taxRevision: 'tax-v1', prices: {product: {1: 1600, 3: 4500}, all: {1: 3900}} as Record<SubscriptionPlan, Record<number, number>>};
  const store = createCommerceStore(f.db), ledger = createCommerceLedger(f.db), ton = createTonPaymentStore(f.db);
  const deps: CommerceDependencies = {enabled: true, store, periods: ledger.accessPeriods, price: (plan, months) => state.prices[plan][months] ?? null, readiness: async () => ({deliveryReady: state.ready, sellerTermsReady: state.ready, termsRevision: state.terms}), tax: async () => ({amountMinor: state.tax, revision: state.taxRevision}), releases: currentReleaseHashes(releases), revokedReleases: ledger.revokedReleases, now: () => state.now};
  const service = createCommerceService(deps);
  let sequence = 0;
  /** Quote -> pending TON invoice; payment is recorded separately with pay(). */
  type Change = {usdMinor?: number; asset?: TonAsset; months?: number};
  /** Quote -> pending invoice (USDT by default: the price itself, no market rate); pay() records payment. */
  async function invoice(userId: string, plan: SubscriptionPlan, change: Change = {}) {
    const n = ++sequence;
    const q = await service.createQuote(userId, {plan, months: change.months ?? 1, idempotencyKey: `quote-${n}`});
    const asset = change.asset ?? 'USDT', usdt = asset === 'USDT';
    const input = {id: `invoice-${n}`, userId, quoteId: q.id, itemIds: q.itemIds, termsRevision: q.termsRevision, asset, network: 'ton-testnet' as const, recipient: fixtureRecipient, jettonMaster: usdt ? '0:' + 'b'.repeat(64) : null, amountBaseUnits: usdt ? usdtBaseUnits(q.amountMinor) : '5000000000', comment: `ts_${n.toString(16).padStart(32, '0')}`, createdAt: state.now, expiresAt: state.now + 800, fxQuoteId: `fx-${n}`, fxSnapshot: {source: usdt ? 'tallshift:usdt-price' : 'fixture-gram', usdPerUnit: usdt ? '1' : '3.2', quotedAt: state.now, expiresAt: state.now + 800, usdMinor: change.usdMinor ?? q.amountMinor}, idempotencyKey: `invoice-${n}`, inputDigest: 'c'.repeat(64)};
    await ton.createInvoice(input);
    return {quote: q, invoiceId: input.id, input, n};
  }
  /** Records the verified on-chain settlement the TON verifier would produce. */
  async function pay(issued: Awaited<ReturnType<typeof invoice>>, transactionAt = state.now + 10) {
    const {input, n} = issued;
    await ton.recordVerifiedPayment({eventKey: `event-${n}`, txIdentity: `ton-testnet:tx-${n}`, invoiceId: input.id, asset: input.asset, network: input.network, recipient: input.recipient, comment: input.comment, amountBaseUnits: input.amountBaseUnits, transactionAt, observedAt: Math.max(transactionAt, state.now) + 1, proofDigest: 'd'.repeat(64)});
    return transactionAt;
  }
  async function settle(userId: string, plan: SubscriptionPlan, change: Change = {}) {
    const issued = await invoice(userId, plan, change);
    const paidAt = await pay(issued);
    return {quote: issued.quote, invoiceId: issued.invoiceId, paidAt};
  }
  const fulfil = (limit = 25) => createFulfillmentWorker({ledger, now: () => state.now}).process(limit);
  return {...f, state, store, ledger, ton, deps, service, releases, objects, settle, invoice, pay, fulfil};
}
