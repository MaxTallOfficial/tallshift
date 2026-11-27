import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerceFixture} from './helpers/commerce-fixture.ts';
import {addUtcMonths,inclusiveUtcDate} from '../src/server/delivery/releases.ts';
import {CommerceError} from '../src/server/orders/store.ts';
import {currentAccess} from '../src/server/orders/subscription.ts';
import {releaseAccess} from '../src/server/delivery/releases.ts';

type Fixture = ReturnType<typeof createCommerceFixture>;
const rows = (f: Fixture, sql: string, ...values: unknown[]) => f.sqlite.prepare(sql).all(...values as never[]) as Record<string, unknown>[];
const one = (f: Fixture, sql: string, ...values: unknown[]) => ({...rows(f, sql, ...values)[0]});
const isCode = (code: CommerceError['code']) => (error: unknown) => error instanceof CommerceError && error.code === code;
const at = (iso: string) => Date.parse(iso) / 1000;
const day = 86400;

test('calendar months in UTC clamp the end of month and the leap day; inclusive date is the day before the exclusive end', () => {
  assert.equal(addUtcMonths(at('2027-01-31T10:00:00Z'), 1), at('2027-02-28T10:00:00Z'));
  assert.equal(addUtcMonths(at('2028-01-31T10:00:00Z'), 1), at('2028-02-29T10:00:00Z'));
  assert.equal(addUtcMonths(at('2026-11-27T12:30:00Z'), 1), at('2026-12-27T12:30:00Z'));
  assert.equal(addUtcMonths(at('2026-12-15T00:00:00Z'), 1), at('2027-01-15T00:00:00Z'));
  assert.equal(addUtcMonths(at('2028-02-29T10:00:00Z'), 12), at('2029-02-28T10:00:00Z'));
  assert.equal(inclusiveUtcDate(at('2026-12-27T00:00:00Z')), '2026-12-26');
  assert.equal(inclusiveUtcDate(at('2026-12-27T12:30:00Z')), '2026-12-27');
});

test('a settled invoice becomes a receipt and one access period in one idempotent batch; paid is distinct from fulfilled', async () => {
  const f = createCommerceFixture();
  try {
    const {quote, invoiceId, paidAt} = await f.settle('buyer', 'product');
    assert.equal((await f.service.orderStatus('buyer', quote.orderId)).deliveryStatus, 'pending');
    assert.equal(f.count('commerce_access_periods'), 0);
    assert.deepEqual(await f.fulfil(), {fulfilled: 1, retried: 0, review: 0, skipped: 0});
    assert.deepEqual(one(f, 'SELECT plan,months,paid_at,starts_at,ends_at,status FROM commerce_access_periods WHERE order_id=?', quote.orderId),
      {plan: 'product', months: 1, paid_at: paidAt, starts_at: paidAt, ends_at: addUtcMonths(paidAt, 1), status: 'active'});
    const receipt = one(f, 'SELECT * FROM commerce_receipts WHERE order_id=?', quote.orderId);
    assert.deepEqual([receipt.plan, receipt.months, receipt.currency, receipt.subtotal_minor, receipt.status, receipt.invoice_id, receipt.asset, receipt.amount_base_units], ['product', 1, 'USDT', 1600, 'paid', invoiceId, 'USDT', '16000000']);
    assert.equal(one(f, 'SELECT state FROM ton_payment_outbox WHERE invoice_id=?', invoiceId).state, 'delivered');
    assert.equal(one(f, 'SELECT delivery_state FROM ton_invoices WHERE id=?', invoiceId).delivery_state, 'delivered');
    const order = await f.service.orderStatus('buyer', quote.orderId);
    assert.equal(order.status, 'paid'); assert.equal(order.deliveryStatus, 'fulfilled');
    // Replays and concurrent workers never duplicate receipts or periods.
    assert.deepEqual(await f.fulfil(), {fulfilled: 0, retried: 0, review: 0, skipped: 0});
    await Promise.all([f.fulfil(), f.fulfil()]);
    assert.equal(f.count('commerce_receipts'), 1); assert.equal(f.count('commerce_access_periods'), 1);
    assert.equal((await f.service.orderStatus('other', quote.orderId).catch(e => e)).code, 'NOT_FOUND');
  } finally {f.sqlite.close();}
});

test('renewal starts at the current end: remaining days are kept and periods of a level never overlap', async () => {
  const f = createCommerceFixture();
  try {
    const first = await f.settle('buyer', 'product');
    await f.fulfil();
    const end1 = addUtcMonths(first.paidAt, 1);
    // Five days before the end the owner renews; the quote already shows where the new term starts.
    f.state.now = end1 - 5 * day;
    const second = await f.settle('buyer', 'product');
    assert.equal(second.quote.currentAccessEnd, end1);
    await f.fulfil();
    const end2 = addUtcMonths(end1, 1);
    assert.deepEqual(one(f, 'SELECT starts_at,ends_at FROM commerce_access_periods WHERE order_id=?', second.quote.orderId), {starts_at: end1, ends_at: end2});
    assert.deepEqual(currentAccess(await f.ledger.accessPeriods('buyer'), f.state.now), {plan: 'product', startsAt: first.paidAt, endsAt: end2});
    // A three-month term (fixture price) stacks the same way.
    f.state.now = end2 - day;
    const third = await f.settle('buyer', 'product', {months: 3});
    await f.fulfil();
    const end3 = addUtcMonths(end2, 3);
    assert.deepEqual(one(f, 'SELECT starts_at,ends_at,months FROM commerce_access_periods WHERE order_id=?', third.quote.orderId), {starts_at: end2, ends_at: end3, months: 3});
    // After everything has ended, a new payment starts at its own payment time.
    f.state.now = end3 + day;
    const fresh = await f.settle('buyer', 'product');
    assert.equal(fresh.quote.currentAccessEnd, null);
    await f.fulfil();
    assert.equal(one(f, 'SELECT starts_at FROM commerce_access_periods WHERE order_id=?', fresh.quote.orderId).starts_at, fresh.paidAt);
  } finally {f.sqlite.close();}
});

test('switching level while another level is paid is closed at the quote, at fulfilment and in the database', async () => {
  const f = createCommerceFixture();
  try {
    // A «Всё» invoice paid on time but observed only after a Product subscription started.
    const late = await f.invoice('buyer', 'all');
    const latePaidAt = f.state.now + 10;
    f.state.now += 801;
    const product = await f.settle('buyer', 'product');
    await f.fulfil();
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'all', months: 1, idempotencyKey: 'upgrade'}), isCode('PLAN_CHANGE_UNAVAILABLE'));
    await f.pay(late, latePaidAt);
    assert.deepEqual(await f.fulfil(), {fulfilled: 0, retried: 0, review: 1, skipped: 0});
    assert.equal(one(f, 'SELECT last_error FROM commerce_fulfillments WHERE invoice_id=?', late.invoiceId).last_error, 'PLAN_CONFLICT');
    assert.equal((await f.service.orderStatus('buyer', late.quote.orderId)).deliveryStatus, 'review');
    // The database refuses that period even if the worker check were bypassed; nothing is half-written.
    await assert.rejects(() => f.ledger.fulfill({invoiceId: late.invoiceId, orderId: late.quote.orderId, userId: 'buyer', kind: 'term', paidAt: latePaidAt, startsAt: latePaidAt, endsAt: addUtcMonths(latePaidAt, 1), now: f.state.now}), /another level is active/);
    assert.equal(one(f, 'SELECT status FROM commerce_orders WHERE id=?', late.quote.orderId).status, 'pending');
    assert.equal(rows(f, 'SELECT 1 FROM commerce_receipts WHERE order_id=?', late.quote.orderId).length, 0);
    assert.equal(f.count('commerce_access_periods'), 1);
    // Once the Product period has ended, «Всё» can be quoted as a new subscription.
    f.state.now = addUtcMonths(product.paidAt, 1);
    assert.equal((await f.service.createQuote('buyer', {plan: 'all', months: 1, idempotencyKey: 'after-end'})).currentAccessEnd, null);
  } finally {f.sqlite.close();}
});

test('the database also refuses a renewal that would not continue from the current end', async () => {
  const f = createCommerceFixture();
  try {
    await f.settle('buyer', 'product');
    await f.fulfil();
    const renewal = await f.settle('buyer', 'product');
    await assert.rejects(() => f.ledger.fulfill({invoiceId: renewal.invoiceId, orderId: renewal.quote.orderId, userId: 'buyer', kind: 'term', paidAt: renewal.paidAt, startsAt: renewal.paidAt, endsAt: addUtcMonths(renewal.paidAt, 1), now: f.state.now}), /access must continue from the current end/);
    assert.equal(f.count('commerce_receipts'), 1);
    assert.deepEqual(await f.fulfil(), {fulfilled: 1, retried: 0, review: 0, skipped: 0});
    assert.equal(f.count('commerce_access_periods'), 2);
  } finally {f.sqlite.close();}
});

test('concurrent workers on a fresh intent still produce one receipt and one period', async () => {
  const f = createCommerceFixture();
  try {
    await f.settle('buyer', 'product');
    const reports = await Promise.all([f.fulfil(), f.fulfil(), f.fulfil()]);
    assert.ok(reports.reduce((sum, r) => sum + r.fulfilled, 0) >= 1);
    assert.equal(f.count('commerce_receipts'), 1); assert.equal(f.count('commerce_access_periods'), 1); assert.equal(f.count('commerce_fulfillments'), 1);
  } finally {f.sqlite.close();}
});

test('a crash inside the fulfillment batch rolls back everything and is retried with backoff', async () => {
  const f = createCommerceFixture();
  try {
    const {quote, invoiceId} = await f.settle('buyer', 'product');
    f.sqlite.exec("CREATE TRIGGER fixture_period_crash BEFORE INSERT ON commerce_access_periods BEGIN SELECT RAISE(ABORT,'fixture crash'); END");
    assert.deepEqual(await f.fulfil(), {fulfilled: 0, retried: 1, review: 0, skipped: 0});
    assert.equal(f.count('commerce_receipts'), 0); assert.equal(f.count('commerce_access_periods'), 0);
    assert.equal(one(f, 'SELECT status FROM commerce_orders WHERE id=?', quote.orderId).status, 'pending');
    assert.equal(one(f, 'SELECT state FROM ton_payment_outbox WHERE invoice_id=?', invoiceId).state, 'pending');
    assert.deepEqual(one(f, 'SELECT state,attempts,next_attempt_at FROM commerce_fulfillments WHERE invoice_id=?', invoiceId), {state: 'retry', attempts: 1, next_attempt_at: 1060});
    f.sqlite.exec('DROP TRIGGER fixture_period_crash');
    assert.deepEqual(await f.fulfil(), {fulfilled: 0, retried: 0, review: 0, skipped: 0}, 'backoff is respected');
    f.state.now = 1060;
    assert.deepEqual(await f.fulfil(), {fulfilled: 1, retried: 0, review: 0, skipped: 0});
    assert.equal(f.count('commerce_access_periods'), 1);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_fulfillments SET state='retry' WHERE invoice_id=?").run(invoiceId), /fulfillment is final/);
  } finally {f.sqlite.close();}
});

test('repeated transient failures stop after eight attempts in operator review', async () => {
  const f = createCommerceFixture();
  try {
    const {invoiceId} = await f.settle('buyer', 'product');
    f.sqlite.exec("CREATE TRIGGER fixture_receipt_crash BEFORE INSERT ON commerce_receipts BEGIN SELECT RAISE(ABORT,'fixture crash'); END");
    for (let i = 0; i < 8; i++) {await f.fulfil(); f.state.now += 3600;}
    assert.deepEqual(one(f, 'SELECT state,attempts,last_error FROM commerce_fulfillments WHERE invoice_id=?', invoiceId), {state: 'review', attempts: 8, last_error: 'RETRY_EXHAUSTED'});
    assert.deepEqual(await f.fulfil(), {fulfilled: 0, retried: 0, review: 0, skipped: 0});
  } finally {f.sqlite.close();}
});

test('an invoice that does not match its quote goes to review without access', async () => {
  const f = createCommerceFixture();
  try {
    const wrong = await f.settle('buyer', 'product', {usdMinor: 1});
    assert.deepEqual(await f.fulfil(), {fulfilled: 0, retried: 0, review: 1, skipped: 0});
    assert.equal(one(f, 'SELECT last_error FROM commerce_fulfillments WHERE invoice_id=?', wrong.invoiceId).last_error, 'SNAPSHOT_MISMATCH');
    assert.equal(f.count('commerce_access_periods'), 0);
    // The owner sees the review state, not an endless "paid, preparing access".
    const order = await f.service.orderStatus('buyer', wrong.quote.orderId);
    assert.equal(order.status, 'pending'); assert.equal(order.deliveryStatus, 'review');
  } finally {f.sqlite.close();}
});

test('SQL triggers refuse periods and receipts without a paid order and keep the ledger immutable', async () => {
  const f = createCommerceFixture();
  try {
    const pending = await f.service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'pending'});
    assert.throws(() => f.sqlite.prepare("INSERT INTO commerce_access_periods(id,user_id,order_id,plan,months,paid_at,starts_at,ends_at,created_at) VALUES('p','buyer',?,'product',1,1,1,2678401,1)").run(pending.orderId), /paid receipt required/);
    assert.throws(() => f.sqlite.prepare("INSERT INTO commerce_receipts(id,order_id,user_id,quote_id,invoice_id,plan,months,currency,subtotal_minor,tax_minor,total_minor,asset,amount_base_units,terms_revision,tax_revision,paid_at,created_at) VALUES('r',?,'buyer',?,'none','product',1,'USDT',1600,0,1600,'USDT','16000000','terms-v1','tax-v1',1,1)").run(pending.orderId, pending.id), /paid order required/);
    const {quote} = await f.settle('buyer', 'product');
    await f.fulfil();
    const period = one(f, 'SELECT id FROM commerce_access_periods WHERE order_id=?', quote.orderId).id;
    assert.throws(() => f.sqlite.prepare('UPDATE commerce_access_periods SET ends_at=ends_at+1 WHERE id=?').run(period), /immutable access period/);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_access_periods SET plan='all' WHERE id=?").run(period), /immutable access period/);
    assert.throws(() => f.sqlite.prepare('UPDATE commerce_receipts SET subtotal_minor=1').run(), /immutable commerce receipt/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_access_periods').run(), /ledger row/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_receipts').run(), /ledger row/);
    f.sqlite.prepare("UPDATE commerce_access_periods SET status='revoked',revoked_at=2000,revoke_reason='operator' WHERE id=?").run(period);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_access_periods SET status='active',revoked_at=NULL,revoke_reason=NULL WHERE id=?").run(period), /closed period is final/);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_access_periods SET revoke_reason='other' WHERE id=?").run(period), /closed period is final/);
  } finally {f.sqlite.close();}
});

test('one open checkout per user and overlapping level: a second invoice waits until the first expires or is delivered', async () => {
  const f = createCommerceFixture();
  try {
    const first = await f.invoice('buyer', 'product');
    // «Всё» overlaps Product: it can be priced, but cannot become a payable invoice in parallel.
    const second = await f.service.createQuote('buyer', {plan: 'all', months: 1, idempotencyKey: 'second'});
    await assert.rejects(() => f.service.resolveQuote(second.id, 'buyer'), isCode('CHECKOUT_IN_PROGRESS'));
    // The database guard holds even if the service check is bypassed (race between two requests).
    await assert.rejects(() => f.invoice('buyer', 'product'), /checkout in progress/);
    assert.equal(f.count('ton_invoices'), 1);
    await f.invoice('other', 'product');
    // Paid but not yet delivered still blocks; after delivery Product is paid, so «Всё» is a level change.
    await f.pay(first);
    await assert.rejects(() => f.service.resolveQuote(second.id, 'buyer'), isCode('CHECKOUT_IN_PROGRESS'));
    await f.fulfil();
    await assert.rejects(() => f.service.resolveQuote(second.id, 'buyer'), isCode('OFFER_CHANGED'));
  } finally {f.sqlite.close();}
});

test('a late-observed on-time payment for the same level extends access instead of being lost', async () => {
  const f = createCommerceFixture();
  try {
    const first = await f.invoice('buyer', 'product');
    const firstPaidAt = f.state.now + 10;
    // The first invoice looks expired before its on-time transfer is observed, so a new checkout opens.
    f.state.now += 801;
    const second = await f.invoice('buyer', 'product');
    const secondPaidAt = await f.pay(second);
    await f.fulfil();
    await f.pay(first, firstPaidAt);
    assert.deepEqual(await f.fulfil(), {fulfilled: 1, retried: 0, review: 0, skipped: 0});
    const end2 = addUtcMonths(secondPaidAt, 1);
    assert.deepEqual(one(f, 'SELECT starts_at,ends_at FROM commerce_access_periods WHERE order_id=?', first.quote.orderId), {starts_at: end2, ends_at: addUtcMonths(end2, 1)});
    assert.equal(currentAccess(await f.ledger.accessPeriods('buyer'), secondPaidAt)?.endsAt, addUtcMonths(end2, 1));
  } finally {f.sqlite.close();}
});

test('a withdrawn release is left out of new quotes; a level with nothing deliverable is not sold; the journal is append-only', async () => {
  const f = createCommerceFixture({items: ['S004', 'S012']});
  try {
    await f.ledger.revokeRelease('S004', f.releases.find(r => r.itemId === 'S004')!.sha256, 'security', 900);
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'blocked'}), isCode('COMMERCE_DISABLED'));
    assert.equal(f.count('commerce_orders'), 0);
    const all = await f.service.createQuote('buyer', {plan: 'all', months: 1, idempotencyKey: 'all'});
    assert.deepEqual(Object.keys(JSON.parse(String(one(f, 'SELECT release_snapshot_json AS r FROM commerce_quotes WHERE id=?', all.id).r))), ['S012']);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_release_revocations').run(), /release revocation is final/);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_release_revocations SET reason='withdrawn'").run(), /release revocation is final/);
  } finally {f.sqlite.close();}
});

test('switching from Product to «Всё» mid-term: the rest is recalculated, only the difference is paid, «Всё» lasts until the Product end', async () => {
  const f = createCommerceFixture();
  try {
    const product = await f.settle('buyer', 'product');
    await f.fulfil();
    const end = addUtcMonths(product.paidAt, 1), total = end - product.paidAt;
    // Exactly half of the paid month is left: half of the 23 USDT price difference is due.
    f.state.now = product.paidAt + total / 2;
    const upgrade = await f.settle('buyer', 'all', {upgrade: true});
    assert.deepEqual([upgrade.quote.kind, upgrade.quote.months, upgrade.quote.subtotalMinor, upgrade.quote.currentAccessEnd], ['upgrade', null, 1150, end]);
    assert.deepEqual(upgrade.quote.upgrade, [{orderId: product.quote.orderId, startsAt: product.paidAt, endsAt: end, remainingSeconds: total / 2, paidMinor: 1600, allPriceMinor: 3900, topUpMinor: 1150}]);
    assert.deepEqual(await f.fulfil(), {fulfilled: 1, retried: 0, review: 0, skipped: 0});
    assert.deepEqual(one(f, 'SELECT plan,kind,months,starts_at,ends_at,status FROM commerce_access_periods WHERE order_id=?', upgrade.quote.orderId), {plan: 'all', kind: 'upgrade', months: null, starts_at: upgrade.paidAt, ends_at: end, status: 'active'});
    assert.deepEqual(one(f, 'SELECT status,revoked_at,revoke_reason FROM commerce_access_periods WHERE order_id=?', product.quote.orderId), {status: 'upgraded', revoked_at: upgrade.paidAt, revoke_reason: `upgrade:${upgrade.quote.orderId}`});
    assert.deepEqual(one(f, 'SELECT kind,months,subtotal_minor,amount_base_units FROM commerce_receipts WHERE order_id=?', upgrade.quote.orderId), {kind: 'upgrade', months: null, subtotal_minor: 1150, amount_base_units: '11500000'});
    const access = currentAccess(await f.ledger.accessPeriods('buyer'), upgrade.paidAt);
    assert.deepEqual(access, {plan: 'all', startsAt: upgrade.paidAt, endsAt: end});
    assert.equal(releaseAccess(f.releases.find(r => r.itemId === 'S012')!, access, new Set(), new Set()), 'available');
    // A renewal continues «Всё» from the same end; back to Product mid-term and a second switch stay closed.
    assert.equal((await f.service.createQuote('buyer', {plan: 'all', months: 1, idempotencyKey: 'renew'})).currentAccessEnd, end);
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', months: 1, idempotencyKey: 'down'}), isCode('PLAN_CHANGE_UNAVAILABLE'));
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'all', upgrade: true, idempotencyKey: 'again'}), isCode('PLAN_CHANGE_UNAVAILABLE'));
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_access_periods SET status='active',revoked_at=NULL,revoke_reason=NULL WHERE order_id=?").run(product.quote.orderId), /closed period is final/);
  } finally {f.sqlite.close();}
});

test('an annual Product with a queued month is recalculated per period at the «Всё» price for the same term', async () => {
  const f = createCommerceFixture();
  try {
    const year = await f.settle('buyer', 'product', {months: 12});
    await f.fulfil();
    const yearEnd = addUtcMonths(year.paidAt, 12);
    const month = await f.settle('buyer', 'product');
    await f.fulfil();
    const monthEnd = addUtcMonths(yearEnd, 1);
    f.state.now = year.paidAt + 90 * day;
    const yearLeft = yearEnd - f.state.now, expectedYear = Math.ceil(23000 * yearLeft / (yearEnd - year.paidAt));
    const upgrade = await f.settle('buyer', 'all', {upgrade: true});
    assert.deepEqual(upgrade.quote.upgrade!.map(line => [line.orderId, line.paidMinor, line.allPriceMinor, line.remainingSeconds, line.topUpMinor]),
      [[year.quote.orderId, 16000, 39000, yearLeft, expectedYear], [month.quote.orderId, 1600, 3900, monthEnd - yearEnd, 2300]]);
    assert.deepEqual([upgrade.quote.subtotalMinor, upgrade.quote.currentAccessEnd], [expectedYear + 2300, monthEnd]);
    await f.fulfil();
    assert.deepEqual(f.sqlite.prepare("SELECT status FROM commerce_access_periods WHERE plan='product' ORDER BY starts_at").all().map(row => row.status), ['upgraded', 'upgraded']);
    assert.deepEqual(currentAccess(await f.ledger.accessPeriods('buyer'), upgrade.paidAt), {plan: 'all', startsAt: upgrade.paidAt, endsAt: monthEnd});
  } finally {f.sqlite.close();}
});

test('a changed Product access voids the switch: the quote is refused, a paid switch goes to review, the database needs the paid receipt', async () => {
  const f = createCommerceFixture();
  try {
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'all', upgrade: true, idempotencyKey: 'nothing'}), isCode('PLAN_CHANGE_UNAVAILABLE'));
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', upgrade: true, idempotencyKey: 'wrong'}), isCode('INVALID_INPUT'));
    const product = await f.settle('buyer', 'product');
    await f.fulfil();
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_access_periods SET status='upgraded',revoked_at=2000,revoke_reason='upgrade:forged' WHERE order_id=?").run(product.quote.orderId), /upgrade receipt required/);
    f.state.now = 2000;
    const quote = await f.service.createQuote('buyer', {plan: 'all', upgrade: true, idempotencyKey: 'upgrade'});
    await f.ledger.recordRefund({orderId: product.quote.orderId, amountMinor: 1600, reason: 'before_download', reference: 'tx-refund', at: 2001});
    await assert.rejects(() => f.service.resolveQuote(quote.id, 'buyer'), isCode('OFFER_CHANGED'));
    // The same change after the invoice was issued: the paid switch is not applied automatically.
    const other = await f.settle('other', 'product');
    await f.fulfil();
    const issued = await f.invoice('other', 'all', {upgrade: true});
    await f.ledger.recordRefund({orderId: other.quote.orderId, amountMinor: 1600, reason: 'before_download', reference: 'tx-other', at: 2002});
    await f.pay(issued);
    assert.deepEqual(await f.fulfil(), {fulfilled: 0, retried: 0, review: 1, skipped: 0});
    assert.equal(one(f, 'SELECT last_error FROM commerce_fulfillments WHERE invoice_id=?', issued.invoiceId).last_error, 'UPGRADE_CHANGED');
    assert.equal((await f.service.orderStatus('other', issued.quote.orderId)).deliveryStatus, 'review');
  } finally {f.sqlite.close();}
});
