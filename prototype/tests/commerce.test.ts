import test from 'node:test';
import assert from 'node:assert/strict';
import type {D1Database} from '@cloudflare/workers-types';
import {createCommerceFixture} from './helpers/commerce-fixture.ts';
import {CommerceError} from '../src/server/orders/store.ts';
import {createCommerceService,publishedPaidReleases} from '../src/server/orders/service.ts';
import {createCommerceHttpHandlers} from '../src/server/orders/http.ts';
import {createCommerceHost} from '../src/server/orders/host.ts';
import {commerceLaunchDecisions,productionCommerceDependencies,subscriptionPrice} from '../src/server/orders/launch.ts';
import {subscriptionPlanItems,usdtBaseUnits} from '../src/server/orders/subscription.ts';
import {createTonPaymentService} from '../src/server/payments/ton/service.ts';
import type {UsdExchangeRate} from '../src/server/payments/ton/quote.ts';
import {createUsdExchangeRate,FxError} from '../src/server/payments/fx.ts';
import {issueCsrf} from '../src/server/auth/security.ts';
import {sessionCookie} from '../src/server/auth/engine.ts';
import {sha256} from '../src/server/auth/policy.ts';

const isCode = (code: CommerceError['code']) => (error: unknown) => error instanceof CommerceError && error.code === code;
const tonConfig = {enabled: true, network: 'ton-testnet' as const, recipient: '0:' + 'a'.repeat(64), usdtMaster: '0:' + 'b'.repeat(64)};

test('a quote prices one paid term of a level in USDT from approved prices; tax is added on the server', async () => {
  const f = createCommerceFixture();
  try {
    const product = await f.service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'p1'});
    assert.equal(product.currency, 'USDT'); assert.equal(product.amountMinor, 1600); assert.equal(product.months, 1); assert.equal(product.currentAccessEnd, null);
    assert.deepEqual(product.itemIds, [...subscriptionPlanItems.product]); assert.equal('releases' in product, false);
    f.state.tax = 120;
    const all = await f.service.createQuote('other', {plan: 'all', months: 1, idempotencyKey: 'a1'});
    assert.equal(all.subtotalMinor, 3900); assert.equal(all.amountMinor, 4020); assert.equal(all.itemIds.length, 23);
    const resolved = await f.service.resolveQuote(all.id, 'other');
    assert.equal(resolved?.currency, 'USDT'); assert.equal(resolved?.amountMinor, 4020);
    assert.equal(await f.service.resolveQuote(all.id, 'buyer'), null);
    assert.equal((await f.service.createQuote('buyer', {plan: 'product', months: 3, idempotencyKey: 'p3'})).subtotalMinor, 4500);
  } finally {f.sqlite.close();}
});

test('only approved terms are sold: monthly and discounted annual prices of 27.11; other terms and malformed input refused', async () => {
  const f = createCommerceFixture();
  try {
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', months: 6, idempotencyKey: 'half-year'}), isCode('TERM_UNAVAILABLE'));
    for (const months of [0, 13, 1.5, Number.NaN]) await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', months, idempotencyKey: `bad-${months}`}), isCode('INVALID_INPUT'));
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'bundle' as never, months: 1, idempotencyKey: 'old-plan'}), isCode('INVALID_INPUT'));
    assert.equal(f.count('commerce_orders'), 0);
    // Max Tall, 27.11.2026: Product 16 / «Всё» 39 USDT per month; a year costs 10 months (160 / 390 USDT).
    assert.deepEqual(commerceLaunchDecisions.prices, {product: {1: 1600, 12: 16000}, all: {1: 3900, 12: 39000}});
    assert.equal(subscriptionPrice(commerceLaunchDecisions.prices, 'product', 12), 16000);
    assert.equal(subscriptionPrice(commerceLaunchDecisions.prices, 'product', 6), null);
    assert.equal(subscriptionPrice(commerceLaunchDecisions.prices, 'all', 1), 3900);
    // Seller terms, tax and the Gram rate are still not approved, so production sales stay closed.
    assert.deepEqual([commerceLaunchDecisions.termsRevision, commerceLaunchDecisions.tax, commerceLaunchDecisions.gramFx], [null, null, null]);
    const production = productionCommerceDependencies({deliveryReady: true});
    assert.deepEqual(await production.readiness(), {deliveryReady: true, sellerTermsReady: false, termsRevision: ''});
    await assert.rejects(() => production.tax('buyer', 1600), isCode('COMMERCE_DISABLED'));
    assert.equal(production.price('product', 1), 1600); assert.equal(production.price('all', 12), 39000); assert.equal(production.price('all', 3), null);
  } finally {f.sqlite.close();}
});

test('idempotent quote retry recovers the exact original order; another level or term conflicts; expiry never refreshes', async () => {
  const f = createCommerceFixture();
  try {
    const input = {plan: 'product' as const, months: 1, idempotencyKey: 'same'};
    const results = await Promise.all([f.service.createQuote('buyer', input), f.service.createQuote('buyer', input)]);
    assert.deepEqual(results[0], results[1]); assert.equal(f.count('commerce_orders'), 1); assert.equal(f.count('commerce_quotes'), 1);
    await assert.rejects(() => f.service.createQuote('buyer', {...input, plan: 'all'}), isCode('IDEMPOTENCY_CONFLICT'));
    await assert.rejects(() => f.service.createQuote('buyer', {...input, months: 3}), isCode('IDEMPOTENCY_CONFLICT'));
    f.state.now = 1900;
    assert.deepEqual(await f.service.createQuote('buyer', input), results[0]);
    await assert.rejects(() => f.service.resolveQuote(results[0].id, 'buyer'), isCode('QUOTE_EXPIRED'));
    assert.throws(() => f.sqlite.prepare('UPDATE commerce_quotes SET total_minor=1').run(), /immutable commerce quote/);
  } finally {f.sqlite.close();}
});

test('closed readiness, nothing deliverable, and changed terms, tax, price or releases all prevent invoices', async () => {
  const f = createCommerceFixture();
  try {
    assert.equal(Object.keys(publishedPaidReleases).length, 0);
    const closed = createCommerceService({...f.deps, releases: publishedPaidReleases});
    await assert.rejects(() => closed.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'planned'}), isCode('COMMERCE_DISABLED'));
    assert.equal(f.count('commerce_orders'), 0);
    f.state.ready = false;
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'not-ready'}), isCode('COMMERCE_DISABLED'));
    f.state.ready = true;
    const releases: Record<string, string> = {...f.deps.releases}, original = releases.S004;
    const service = createCommerceService({...f.deps, releases});
    const changes = [() => {f.state.terms = 'terms-v2';}, () => {f.state.tax = 1;}, () => {f.state.taxRevision = 'tax-v2';}, () => {releases.S004 = 'b'.repeat(64);}, () => {f.state.prices.product[1] = 1700;}, () => {delete f.state.prices.product[1];}];
    for (const change of changes) {
      f.state.terms = 'terms-v1'; f.state.tax = 0; f.state.taxRevision = 'tax-v1'; releases.S004 = original; f.state.prices.product = {1: 1600, 3: 4500, 12: 16000};
      const q = await service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: crypto.randomUUID()});
      change();
      await assert.rejects(() => service.resolveQuote(q.id, 'buyer'), isCode('OFFER_CHANGED'));
    }
  } finally {f.sqlite.close();}
});

test('a USDT invoice is the price × 10⁴ base units without a market rate; Gram needs an approved FX provider', async () => {
  const f = createCommerceFixture();
  try {
    const production = productionCommerceDependencies({deliveryReady: true, now: () => f.state.now});
    const payments = (exchangeRate: (asset: 'TON' | 'USDT') => Promise<UsdExchangeRate>) => createTonPaymentService({config: tonConfig, store: f.ton, resolveQuote: f.service.resolveQuote, exchangeRate, isRecipientActive: async () => true, readProof: async () => {throw new Error('not used');}, now: () => f.state.now});
    const q = await f.service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'q'});
    const svc = payments(production.exchangeRate);
    const invoice = await svc.createInvoice('buyer', {quoteId: q.id, asset: 'USDT', idempotencyKey: 'invoice'});
    assert.equal(invoice.amountBaseUnits, '16000000'); assert.equal(invoice.amountBaseUnits, usdtBaseUnits(1600)); assert.equal(invoice.amount, '16');
    assert.equal(invoice.deliveryStatus, 'not_ready');
    const stored = await f.ton.findOwnedInvoice(invoice.id, 'buyer') as {fxSnapshot: {source: string; usdPerUnit: string; usdMinor: number}} | null;
    assert.deepEqual([stored?.fxSnapshot.source, stored?.fxSnapshot.usdPerUnit, stored?.fxSnapshot.usdMinor], ['tallshift:usdt-price', '1', 1600]);
    assert.deepEqual(await svc.createInvoice('buyer', {quoteId: q.id, asset: 'USDT', idempotencyKey: 'invoice'}), invoice);
    await assert.rejects(() => svc.createInvoice('buyer', {quoteId: q.id, asset: 'TON', idempotencyKey: 'invoice'}), /IDEMPOTENCY_CONFLICT/);
    await assert.rejects(() => svc.createInvoice('other', {quoteId: q.id, asset: 'USDT', idempotencyKey: 'invoice'}), /NOT_FOUND/);
    // Gram: no approved provider in production, so a Gram invoice cannot be priced.
    await assert.rejects(() => production.exchangeRate('TON'), (e: unknown) => e instanceof FxError && e.code === 'FX_NOT_CONFIGURED');
    const other = await f.service.createQuote('other', {plan: 'product', months: 1, idempotencyKey: 'q'});
    await assert.rejects(() => svc.createInvoice('other', {quoteId: other.id, asset: 'TON', idempotencyKey: 'gram-closed'}), /FX_NOT_CONFIGURED/);
    // With a provider (test-only adapter) the Gram amount follows the USDT price at the provider's rate.
    const gram = createUsdExchangeRate({providers: [{source: 'fixture-gram-usdt', quote: async () => ({usdPerUnit: '3.2', quotedAt: f.state.now})}], policy: {maxAgeSeconds: 30, ttlSeconds: 600, clockSkewSeconds: 5, minSources: 1, maxDeviationBps: 50}, now: () => f.state.now});
    const gramInvoice = await payments(async asset => asset === 'TON' ? gram(asset) : production.exchangeRate(asset)).createInvoice('other', {quoteId: other.id, asset: 'TON', idempotencyKey: 'gram'});
    assert.equal(gramInvoice.amountBaseUnits, '5000000000');
  } finally {f.sqlite.close();}
});

test('paid order requires the exact settled owner invoice and never claims delivery or opens access', async () => {
  const f = createCommerceFixture();
  try {
    const issued = await f.invoice('buyer', 'product');
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_orders SET status='paid',paid_at=1100 WHERE id=?").run(issued.quote.orderId), /verified invoice required/);
    assert.equal(await f.store.ownedOrder(issued.quote.orderId, 'other'), null);
    await f.pay(issued);
    const order = await f.service.orderStatus('buyer', issued.quote.orderId);
    assert.equal(order.status, 'paid'); assert.equal(order.deliveryStatus, 'pending'); assert.equal(order.currency, 'USDT'); assert.equal(order.plan, 'product');
    assert.deepEqual(await f.service.orderStatus('buyer', issued.quote.orderId), order); assert.equal(f.count('ton_payment_outbox'), 1);
    // Paid is not delivered: reading the order never creates receipts or periods; only the fulfillment worker does.
    assert.equal(f.count('commerce_receipts'), 0); assert.equal(f.count('commerce_access_periods'), 0);
  } finally {f.sqlite.close();}
});

test('HTTP accepts only the level and the term; client price, tax or dates are refused; reads are owner-only', async () => {
  const f = createCommerceFixture();
  try {
    const origin = 'https://tallshift.test'; let userId: string | null = 'buyer', csrf = true, limit = true;
    const h = createCommerceHttpHandlers({service: f.service, mainOrigin: origin, authenticate: async () => userId ? {userId} : null, verifyCsrf: async () => csrf, rateLimit: async () => limit});
    const request = (body: unknown, key = 'quote', customOrigin = origin) => new Request(origin + '/api/v1/checkout-quotes', {method: 'POST', headers: {origin: customOrigin, 'content-type': 'application/json', 'idempotency-key': key}, body: JSON.stringify(body)});
    assert.equal((await h.quote(new Request(origin + '/api/v1/checkout-quotes', {method: 'POST', headers: {origin, 'content-type': 'application/json'}, body: new Uint8Array([0xff])}))).status, 400);
    for (const body of [{plan: 'product', months: 1, amountMinor: 1}, {plan: 'product'}, {plan: 'product', months: '1'}, {plan: 'product', months: 1, currentAccessEnd: 5}, {plan: 'bundle', months: 1}, {plan: 'product', months: 1, ownership: []}, {plan: 'all', upgrade: true, months: 1}, {plan: 'product', upgrade: true}, {plan: 'all', upgrade: 'yes'}]) assert.equal((await h.quote(request(body))).status, 400);
    assert.equal((await h.quote(request({plan: 'product', months: 1}, 'quote', 'https://evil.test'))).status, 403);
    csrf = false; assert.equal((await h.quote(request({plan: 'product', months: 1}))).status, 403); csrf = true;
    limit = false; assert.equal((await h.quote(request({plan: 'product', months: 1}))).status, 429); limit = true;
    userId = null; assert.equal((await h.quote(request({plan: 'product', months: 1}))).status, 401); userId = 'buyer';
    const response = await h.quote(request({months: 1, plan: 'product'}));
    assert.equal(response.status, 201);
    const q = await response.json();
    assert.deepEqual([q.amountMinor, q.currency, q.months, q.plan], [1600, 'USDT', 1, 'product']);
    const halfYear = await h.quote(request({plan: 'product', months: 6}, 'half-year'));
    assert.equal(halfYear.status, 409); assert.equal((await halfYear.json()).error.code, 'TERM_UNAVAILABLE');
    // The switch to «Всё» is its own request; without paid Product there is nothing to switch.
    const upgrade = await h.quote(request({plan: 'all', upgrade: true}, 'upgrade'));
    assert.equal(upgrade.status, 409); assert.equal((await upgrade.json()).error.code, 'PLAN_CHANGE_UNAVAILABLE');
    userId = 'other'; assert.equal((await h.order(new Request(origin), q.orderId)).status, 404);
  } finally {f.sqlite.close();}
});

test('real host uses primary D1 auth/CSRF and the empty paid registry even when both env flags are enabled', async () => {
  const f = createCommerceFixture();
  try {
    // Extend the SQL fixture's statements only with the D1 run() needed by authoritative session touch.
    const basePrepare = f.db.prepare.bind(f.db); let primaryCalls = 0;
    const db = {...f.db, prepare(sql: string) {const decorate = (statement: ReturnType<typeof basePrepare>, args: unknown[] = []) => Object.assign(statement, {bind: (...values: unknown[]) => decorate(basePrepare(sql).bind(...values), values), run: async () => {const result = f.sqlite.prepare(sql).run(...args as never[]); return {success: true, meta: {changes: Number(result.changes)}};}}); return decorate(basePrepare(sql));}, withSession(mode: string) {assert.equal(mode, 'first-primary'); primaryCalls++; return db;}} as unknown as D1Database;
    const origin = 'https://tallshift.test', secret = 'test-only-secret-at-least-32-characters', raw = 'test-session-token-with-enough-entropy', at = Date.now();
    f.sqlite.prepare('INSERT INTO auth_session VALUES(?,?,?,?,?,?,?,?,?)').run('session', await sha256(raw), 'buyer', at + 86400000, at, at, null, null, 0);
    const host = createCommerceHost({DB: db, APP_URL: origin, AUTH_ENABLED: 'true', AUTH_SECRET: secret, COMMERCE_ENABLED: 'true', TON_PAYMENTS_ENABLED: 'true'}, {readiness: f.deps.readiness, tax: f.deps.tax, price: f.deps.price, exchangeRate: async () => {throw new Error('must not fetch FX');}});
    const req = new Request(origin + '/api/v1/checkout-quotes', {method: 'POST', headers: {origin, 'content-type': 'application/json', cookie: `${sessionCookie}=${raw}`}, body: '{"plan":"product","months":1}'});
    assert.equal((await host.commerce.quote(req)).status, 403);
    const issued = (await issueCsrf(req, origin, secret))!;
    const request = new Request(req, {headers: {origin, 'content-type': 'application/json', 'idempotency-key': 'q', cookie: `${sessionCookie}=${raw}; ${issued.cookie.split(';')[0]}`, 'x-csrf-token': issued.csrfToken}});
    const response = await host.commerce.quote(request);
    assert.equal(response.status, 503); assert.equal((await response.json()).error.code, 'COMMERCE_DISABLED'); assert.ok(primaryCalls > 0); assert.equal(f.count('commerce_orders'), 0);
    f.sqlite.prepare('UPDATE auth_user SET auth_version=auth_version+1 WHERE id=?').run('buyer');
    assert.equal((await host.commerce.order(new Request(origin, {headers: {cookie: `${sessionCookie}=${raw}`}}), 'unknown')).status, 401);
  } finally {f.sqlite.close();}
});

test('quote and order insert roll back together if durable order creation fails', async () => {
  const f = createCommerceFixture();
  try {
    f.sqlite.exec("CREATE TRIGGER fail_order BEFORE INSERT ON commerce_orders BEGIN SELECT RAISE(ABORT,'fixture order failure'); END");
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'atomic'}));
    assert.equal(f.count('commerce_quotes'), 0); assert.equal(f.count('commerce_orders'), 0);
    f.sqlite.exec('DROP TRIGGER fail_order');
    const q = await f.service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'atomic'});
    assert.ok(q.orderId); assert.equal(f.count('commerce_quotes'), 1); assert.equal(f.count('commerce_orders'), 1);
  } finally {f.sqlite.close();}
});

test('a settled invoice with a mismatched quote value cannot promote the order to paid', async () => {
  const f = createCommerceFixture();
  try {
    const issued = await f.invoice('buyer', 'product', {usdMinor: 1});
    await f.pay(issued);
    // The mismatch never promotes the order; the read stays available and asks for support review.
    const order = await f.service.orderStatus('buyer', issued.quote.orderId);
    assert.equal(order.status, 'pending'); assert.equal(order.deliveryStatus, 'review');
    assert.equal(f.sqlite.prepare('SELECT status FROM commerce_orders WHERE id=?').get(issued.quote.orderId)?.status, 'pending');
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_orders SET status='paid',paid_at=1010 WHERE id=?").run(issued.quote.orderId), /verified invoice required/);
  } finally {f.sqlite.close();}
});

test('one transaction identity cannot settle a second order under a different asset and owner', async () => {
  const f = createCommerceFixture();
  try {
    const first = await f.invoice('buyer', 'product', {asset: 'TON'}), second = await f.invoice('other', 'product');
    const settle = (issued: typeof first, index: number) => f.ton.recordVerifiedPayment({eventKey: `event-${index}`, txIdentity: 'ton-testnet:same-account:123:same-hash', invoiceId: issued.input.id, asset: issued.input.asset, network: issued.input.network, recipient: issued.input.recipient, comment: issued.input.comment, amountBaseUnits: issued.input.amountBaseUnits, transactionAt: 1010, observedAt: 1011, proofDigest: 'd'.repeat(64)});
    await settle(first, 0);
    assert.equal((await f.service.orderStatus('buyer', first.quote.orderId)).status, 'paid');
    await assert.rejects(() => settle(second, 1), /PAYMENT_CONFLICT/);
    assert.equal((await f.service.orderStatus('other', second.quote.orderId)).status, 'pending');
    assert.equal(f.count('ton_payment_events'), 1); assert.equal(f.count('ton_payment_outbox'), 1);
  } finally {f.sqlite.close();}
});
