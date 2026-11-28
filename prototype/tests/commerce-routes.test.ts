import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {D1Database} from '@cloudflare/workers-types';
import {createCommerceFixture,memoryBucket} from './helpers/commerce-fixture.ts';
import {createD1Fixture} from './helpers/ton-d1.ts';
import {commerceRoutes} from '../src/server/orders/routes.ts';
import {createCommerceHost} from '../src/server/orders/host.ts';
import {runCommerceSchedule} from '../src/server/orders/schedule.ts';
import {createR2ArtifactStore} from '../src/server/delivery/storage.ts';
import {createUsdExchangeRate} from '../src/server/payments/fx.ts';
import {paymentConfig} from '../src/server/payments/ton/config.ts';
import {TonChainError} from '../src/server/payments/ton/toncenter.ts';
import type {TonChainProof} from '../src/server/payments/ton/verification.ts';
import type {TallshiftCloudflareEnv} from '../src/server/cloudflare/env.ts';
import {issueCsrf} from '../src/server/auth/security.ts';
import {sessionCookie} from '../src/server/auth/engine.ts';
import {sha256} from '../src/server/auth/policy.ts';
import {pricingPlanScopes} from '../src/foundations/pricing-plans.ts';

const origin = 'https://tallshift.test', secret = 'test-only-secret-at-least-32-characters';
const untouchable = {prepare() {throw new Error('database touched');}, batch() {throw new Error('database touched');}, withSession() {throw new Error('database touched');}} as unknown as D1Database;
const base: TallshiftCloudflareEnv = {DB: untouchable, APP_URL: origin, AUTH_ENABLED: 'true', AUTH_SECRET: secret};

test('with commerce flags off every mounted route answers 503 before touching the database', async () => {
  const post = (path: string, body: unknown) => new Request(origin + path, {method: 'POST', headers: {origin, 'content-type': 'application/json'}, body: JSON.stringify(body)});
  for (const env of [base, {...base, COMMERCE_ENABLED: 'false', TON_PAYMENTS_ENABLED: 'false'}, {...base, COMMERCE_ENABLED: 'true'}, null]) {
    const responses = await Promise.all([
      commerceRoutes.quote(post('/api/v1/checkout-quotes', {plan: 'product', months: 1}), env),
      commerceRoutes.createInvoice(post('/api/v1/payments/ton/invoices', {quoteId: 'q', asset: 'TON'}), env),
      commerceRoutes.order(new Request(origin), 'order', env),
      commerceRoutes.invoiceStatus(new Request(origin), 'invoice', env),
      commerceRoutes.entitlements(new Request(origin), env),
      commerceRoutes.issueDownload(post('/api/v1/downloads', {itemId: 'S004'}), env),
      commerceRoutes.serveDownload(new Request(origin), 'v1.x.y', env),
      commerceRoutes.tonWebhook(post('/api/v1/payment/webhooks/tonapi', {}), env),
    ]);
    for (const response of responses) {
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal((await response.json()).error.code, 'COMMERCE_DISABLED');
    }
  }
});

test('mounted route files only delegate to the server adapter; nothing commerce-related is client code', () => {
  const root = fileURLToPath(new URL('../app/api/v1/', import.meta.url));
  const files: string[] = [];
  const walk = (dir: string) => {for (const name of readdirSync(dir)) {const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else files.push(path);}};
  walk(root);
  assert.equal(files.length, 8);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /src\/server\/orders\/routes'/);
    assert.match(source, /export const dynamic='force-dynamic'/);
    assert.doesNotMatch(source, /'use client'|process\.env|getCloudflareEnv/);
  }
});

test('documented exception: with its bearer secret the webhook stores a hint even while sales are off', async () => {
  const f = createCommerceFixture();
  try {
    const secret = 'w'.repeat(40), config = paymentConfig();
    const env: TallshiftCloudflareEnv = {DB: f.db as unknown as D1Database, TONAPI_WEBHOOK_SECRET: secret};
    const hint = (authorization: string) => new Request(origin + '/api/v1/payment/webhooks/tonapi', {method: 'POST', headers: {authorization, 'content-type': 'application/json'}, body: JSON.stringify({event_type: 'account_tx', account_id: config.recipient, lt: '101', tx_hash: '3'.repeat(64)})});
    assert.equal((await commerceRoutes.tonWebhook(hint('Bearer wrong-secret-of-sufficient-length-000'), env)).status, 401);
    assert.equal((await commerceRoutes.tonWebhook(hint(`Bearer ${secret}`), env)).status, 202);
    assert.equal(f.count('ton_webhook_inbox'), 1, 'a hint, not a payment: existing invoices keep reconciling when new sales stop');
    assert.equal(f.count('ton_payment_events'), 0);
  } finally {f.sqlite.close();}
});

async function signedIn(f: ReturnType<typeof createCommerceFixture>) {
  const raw = 'test-session-token-with-enough-entropy', at = Date.now();
  f.sqlite.prepare('INSERT INTO auth_session VALUES(?,?,?,?,?,?,?,?,?)').run('session-1', await sha256(raw), 'buyer', at + 86_400_000, at, at, null, null, 0);
  const seed = new Request(origin, {method: 'POST', headers: {origin, cookie: `${sessionCookie}=${raw}`}});
  const csrf = (await issueCsrf(seed, origin, secret))!;
  const cookie = `${sessionCookie}=${raw}; ${csrf.cookie.split(';')[0]}`;
  return {
    post: (path: string, body: unknown, key = crypto.randomUUID()) => new Request(origin + path, {method: 'POST', headers: {origin, cookie, 'content-type': 'application/json', 'x-csrf-token': csrf.csrfToken, 'idempotency-key': key}, body: JSON.stringify(body)}),
    get: (path: string) => new Request(origin + path, {headers: {cookie}}),
  };
}

test('flags on but no approved terms, tax, FX or released files still keeps sales closed', async () => {
  const f = createCommerceFixture();
  try {
    const env: TallshiftCloudflareEnv = {...base, DB: f.db as unknown as D1Database, COMMERCE_ENABLED: 'true', TON_PAYMENTS_ENABLED: 'true', COMMERCE_DELIVERY_ENABLED: 'true'};
    const user = await signedIn(f);
    const response = await commerceRoutes.quote(user.post('/api/v1/checkout-quotes', {plan: 'product', months: 1}), env);
    assert.equal(response.status, 503); assert.equal((await response.json()).error.code, 'COMMERCE_DISABLED');
    assert.equal(f.count('commerce_quotes'), 0);
    // Delivery flag without a private bucket binding stays closed as well.
    assert.equal((await commerceRoutes.entitlements(user.get('/api/v1/me/entitlements'), env)).status, 503);
  } finally {f.sqlite.close();}
});

test('schedule skips without database, without the commerce schema, or when there is nothing to reconcile', async () => {
  assert.deepEqual(await runCommerceSchedule({}), {state: 'skipped', reason: 'NO_DATABASE', errors: []});
  const partial = createD1Fixture();
  try {assert.equal((await runCommerceSchedule({}, {db: partial.db})).reason, 'SCHEMA_MISSING');} finally {partial.sqlite.close();}
  const f = createCommerceFixture();
  try {
    let reads = 0;
    const reader = {scan: async () => {reads++; return [];}, head: async () => {reads++; return null;}, readProof: async (): Promise<TonChainProof> => {throw new Error('unused');}};
    // First run only creates the scan cursor (one head read) so no early payment can ever be skipped.
    const first = await runCommerceSchedule({}, {db: f.db, reader});
    assert.equal(first.reason, 'NOTHING_TO_RECONCILE'); assert.equal((first.scan as {state: string}).state, 'initialized');
    assert.equal(reads, 1);
    assert.equal((await runCommerceSchedule({}, {db: f.db, reader})).reason, 'NOTHING_TO_RECONCILE');
    assert.equal(reads, 1, 'no further chain reads while sales are off and no invoice exists');
  } finally {f.sqlite.close();}
});

test('SQLite chain: quote -> TON invoice -> scanned hint -> verified payment -> fulfilment -> entitlements -> private download', async () => {
  const f = createCommerceFixture({items: [...pricingPlanScopes.product]});
  try {
    const clock = {now: Math.floor(Date.now() / 1000)};
    const config = paymentConfig();
    const chain = {txs: [{lt: '100', hash: '1'.repeat(64), finalized: true, utime: clock.now - 100}], proofs: new Map<string, TonChainProof>()};
    const reader = {
      isRecipientActive: async () => true,
      readProof: async (hash: string, asset: 'TON' | 'USDT') => {const proof = chain.proofs.get(hash); if (!proof || proof.asset !== asset) throw new TonChainError('UNMATCHED_TRANSFER'); return proof;},
      scan: async (afterLt: string, limit = 100) => chain.txs.filter(tx => BigInt(tx.lt) > BigInt(afterLt)).slice(0, limit).map(({lt, hash, finalized}) => ({lt, hash, finalized})),
      head: async () => {const last = chain.txs.at(-1)!; return {lt: last.lt, utime: last.utime, finalized: last.finalized};},
    };
    const env: TallshiftCloudflareEnv = {...base, DB: f.db as unknown as D1Database, COMMERCE_ENABLED: 'true', TON_PAYMENTS_ENABLED: 'true', COMMERCE_DELIVERY_ENABLED: 'true'};
    // Test-only FX adapter; production has none until an owner-approved provider exists.
    const exchangeRate = createUsdExchangeRate({providers: [{source: 'fixture-ton-usd', quote: async () => ({usdPerUnit: '3.2', quotedAt: clock.now})}], policy: {maxAgeSeconds: 30, ttlSeconds: 600, clockSkewSeconds: 5, minSources: 1, maxDeviationBps: 50}, now: () => clock.now});
    const storage = memoryBucket(f.objects);
    const host = createCommerceHost(env, {readiness: async () => ({deliveryReady: true, sellerTermsReady: true, termsRevision: 'terms-v1'}), tax: async () => ({amountMinor: 0, revision: 'tax-v1'}), price: (plan, months) => plan === 'product' && months === 1 ? 1600 : null, exchangeRate}, {releases: f.releases, storage: createR2ArtifactStore(storage.bucket), reader, now: () => clock.now});
    const user = await signedIn(f);

    const quoteResponse = await host.commerce.quote(user.post('/api/v1/checkout-quotes', {plan: 'product', months: 1}, 'quote-1'));
    assert.equal(quoteResponse.status, 201);
    const quote = await quoteResponse.json();
    assert.equal(quote.amountMinor, 1600);
    const invoiceResponse = await host.createInvoice(user.post('/api/v1/payments/ton/invoices', {quoteId: quote.id, asset: 'TON'}, 'invoice-1'));
    assert.equal(invoiceResponse.status, 201);
    const invoice = await invoiceResponse.json();
    assert.equal(invoice.amountBaseUnits, '5000000000');
    assert.equal(invoice.paymentStatus, 'pending');

    // First cron run: the cursor starts at the head, which predates the invoice.
    let report = await runCommerceSchedule(env, {db: f.db, reader, now: () => clock.now});
    assert.equal((report.scan as {state: string}).state, 'initialized');
    // The buyer pays from any wallet with the exact comment; the chain shows a finalized transfer.
    const hash = '2'.repeat(64);
    chain.txs.push({lt: '101', hash, finalized: true, utime: clock.now + 5});
    chain.proofs.set(hash, {network: config.network, account: config.recipient, transactionHash: hash, lt: '101', transactionAt: clock.now + 5, successful: true, aborted: false, finalized: true, masterchainSeqno: 1, outgoingMessageCount: 0, asset: 'TON', incoming: {bounced: false, source: '0:' + 'c'.repeat(64), destination: config.recipient, amountBaseUnits: invoice.amountBaseUnits, comment: invoice.comment}});
    clock.now += 10;
    report = await runCommerceSchedule(env, {db: f.db, reader, now: () => clock.now});
    assert.deepEqual(report.errors, []);
    assert.equal((report.scan as {hints: number}).hints, 1);
    assert.equal((report.inbox as {matched: number}).matched, 1);
    assert.equal((report.fulfillment as {fulfilled: number}).fulfilled, 1);

    const order = await (await host.commerce.order(user.get(`/api/v1/me/orders/${quote.orderId}`), quote.orderId)).json();
    assert.equal(order.status, 'paid'); assert.equal(order.deliveryStatus, 'fulfilled');
    const status = await (await host.invoiceStatus(user.get(`/api/v1/payments/ton/invoices/${invoice.id}`), invoice.id)).json();
    assert.equal(status.paymentStatus, 'paid'); assert.equal(status.deliveryStatus, 'delivered');
    const entitlements = await (await host.delivery.entitlements(user.get('/api/v1/me/entitlements'))).json();
    assert.deepEqual(entitlements.items.map((x: {itemId: string}) => x.itemId), [...pricingPlanScopes.product].sort());
    assert.deepEqual([entitlements.subscription.plan, entitlements.subscription.status], ['product', 'active']);
    const ticket = await (await host.delivery.issue(user.post('/api/v1/downloads', {itemId: 'S004'}))).json();
    const download = await host.delivery.serve(user.get(ticket.url), ticket.url.split('/').pop());
    assert.equal(download.status, 200);
    assert.deepEqual(new Uint8Array(await download.arrayBuffer()), f.objects.get(f.releases.find(r => r.itemId === 'S004')!.objectKey));

    // Replays change nothing; a renewal quote continues from the current end of the paid period.
    report = await runCommerceSchedule(env, {db: f.db, reader, now: () => clock.now});
    assert.deepEqual([(report.scan as {hints: number}).hints, (report.fulfillment as {fulfilled: number}).fulfilled], [0, 0]);
    assert.equal(f.count('commerce_access_periods'), 1); assert.equal(f.count('commerce_receipts'), 1);
    const again = await host.commerce.quote(user.post('/api/v1/checkout-quotes', {plan: 'product', months: 1}, 'quote-2'));
    assert.equal(again.status, 201); assert.equal((await again.json()).currentAccessEnd, entitlements.subscription.endsAt);
  } finally {f.sqlite.close();}
});
