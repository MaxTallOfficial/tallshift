import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerceFixture} from './helpers/commerce-fixture.ts';
import {allocateMinor,createFulfillmentWorker} from '../src/server/orders/fulfillment.ts';
import {addUtcMonths,inclusiveUtcDate,currentReleaseHashes} from '../src/server/delivery/releases.ts';
import {CommerceError} from '../src/server/orders/store.ts';
import {createCommerceService} from '../src/server/orders/service.ts';
import {pricingPlanScopes} from '../src/foundations/pricing-plans.ts';

const worker = (f: ReturnType<typeof createCommerceFixture>) => createFulfillmentWorker({ledger: f.ledger, releases: f.releases, now: () => f.state.now});
const rows = (f: ReturnType<typeof createCommerceFixture>, sql: string, ...values: unknown[]) => f.sqlite.prepare(sql).all(...values as never[]) as Record<string, unknown>[];

test('allocation follows the contract: $23 over 17 IDs gives five 136 and twelve 135; $16 over 6 IDs sums exactly', () => {
  const ids = [...pricingPlanScopes.bundle].filter(id => !pricingPlanScopes.product.includes(id as never)).sort();
  const split = allocateMinor(2300, ids);
  assert.equal(split.length, 17);
  assert.deepEqual(split.map(x => x.allocationMinor), [136, 136, 136, 136, 136, ...Array(12).fill(135)]);
  assert.equal(allocateMinor(1600, [...pricingPlanScopes.product].sort()).reduce((sum, x) => sum + x.allocationMinor, 0), 1600);
  assert.throws(() => allocateMinor(-1, ['S004']));
});

test('12 calendar months in UTC clamp end of month and leap day; inclusive date is the day before the exclusive end', () => {
  const at = (iso: string) => Date.parse(iso) / 1000;
  assert.equal(addUtcMonths(at('2028-02-29T10:00:00Z'), 12), at('2029-02-28T10:00:00Z'));
  assert.equal(addUtcMonths(at('2027-01-31T00:00:00Z'), 12), at('2028-01-31T00:00:00Z'));
  assert.equal(addUtcMonths(at('2026-11-26T12:30:00Z'), 12), at('2027-11-26T12:30:00Z'));
  assert.equal(inclusiveUtcDate(at('2027-11-26T00:00:00Z')), '2027-11-25');
  assert.equal(inclusiveUtcDate(at('2027-11-26T12:30:00Z')), '2027-11-26');
});

test('settled invoice becomes receipt + exact paid grants in one idempotent batch; paid is distinct from fulfilled', async () => {
  const f = createCommerceFixture();
  try {
    const {quote, invoiceId, paidAt} = await f.settle('buyer', 'product');
    assert.equal((await f.service.orderStatus('buyer', quote.orderId)).deliveryStatus, 'pending');
    assert.equal(f.count('commerce_grants'), 0);
    const report = await worker(f).process();
    assert.deepEqual(report, {fulfilled: 1, retried: 0, review: 0, skipped: 0});
    const grants = rows(f, 'SELECT item_id,allocation_minor,paid_at,updates_end,status,release_sha256 FROM commerce_grants WHERE order_id=? ORDER BY item_id', quote.orderId);
    assert.deepEqual(grants.map(g => g.item_id), [...pricingPlanScopes.product].sort());
    assert.equal(grants.reduce((sum, g) => sum + Number(g.allocation_minor), 0), 1600);
    assert.ok(grants.every(g => g.paid_at === paidAt && g.updates_end === addUtcMonths(paidAt, 12) && g.status === 'active'));
    const hashes = currentReleaseHashes(f.releases);
    assert.ok(grants.every(g => g.release_sha256 === hashes[String(g.item_id)]));
    const receipt = rows(f, 'SELECT * FROM commerce_receipts WHERE order_id=?', quote.orderId)[0];
    assert.equal(receipt.subtotal_minor, 1600); assert.equal(receipt.status, 'paid'); assert.equal(receipt.invoice_id, invoiceId); assert.equal(receipt.asset, 'TON');
    assert.equal(rows(f, 'SELECT state FROM ton_payment_outbox WHERE invoice_id=?', invoiceId)[0].state, 'delivered');
    assert.equal(rows(f, 'SELECT delivery_state FROM ton_invoices WHERE id=?', invoiceId)[0].delivery_state, 'delivered');
    const order = await f.service.orderStatus('buyer', quote.orderId);
    assert.equal(order.status, 'paid'); assert.equal(order.deliveryStatus, 'fulfilled');
    // Replays and concurrent workers never duplicate receipts or grants.
    assert.deepEqual(await worker(f).process(), {fulfilled: 0, retried: 0, review: 0, skipped: 0});
    await Promise.all([worker(f).process(), worker(f).process()]);
    assert.equal(f.count('commerce_receipts'), 1); assert.equal(f.count('commerce_grants'), 6);
    assert.equal((await f.service.orderStatus('other', quote.orderId).catch(e => e)).code, 'NOT_FOUND');
  } finally {f.sqlite.close();}
});

test('concurrent workers on a fresh intent still produce one receipt and one grant per item', async () => {
  const f = createCommerceFixture();
  try {
    await f.settle('buyer', 'product');
    const reports = await Promise.all([worker(f).process(), worker(f).process(), worker(f).process()]);
    assert.equal(reports.reduce((sum, r) => sum + r.fulfilled, 0) >= 1, true);
    assert.equal(f.count('commerce_receipts'), 1); assert.equal(f.count('commerce_grants'), 6); assert.equal(f.count('commerce_fulfillments'), 1);
  } finally {f.sqlite.close();}
});

test('crash inside the fulfillment batch rolls back everything and is retried with backoff', async () => {
  const f = createCommerceFixture();
  try {
    const {quote, invoiceId} = await f.settle('buyer', 'product');
    f.sqlite.exec("CREATE TRIGGER fixture_grant_crash BEFORE INSERT ON commerce_grants WHEN NEW.item_id='E002' BEGIN SELECT RAISE(ABORT,'fixture crash'); END");
    assert.deepEqual(await worker(f).process(), {fulfilled: 0, retried: 1, review: 0, skipped: 0});
    assert.equal(f.count('commerce_receipts'), 0); assert.equal(f.count('commerce_grants'), 0);
    assert.equal(rows(f, 'SELECT status FROM commerce_orders WHERE id=?', quote.orderId)[0].status, 'pending');
    assert.equal(rows(f, 'SELECT state FROM ton_payment_outbox WHERE invoice_id=?', invoiceId)[0].state, 'pending');
    const attempt = rows(f, 'SELECT state,attempts,next_attempt_at FROM commerce_fulfillments WHERE invoice_id=?', invoiceId)[0];
    assert.equal(attempt.state, 'retry'); assert.equal(attempt.attempts, 1); assert.equal(attempt.next_attempt_at, 1060);
    f.sqlite.exec('DROP TRIGGER fixture_grant_crash');
    assert.deepEqual(await worker(f).process(), {fulfilled: 0, retried: 0, review: 0, skipped: 0}, 'backoff is respected');
    f.state.now = 1060;
    assert.deepEqual(await worker(f).process(), {fulfilled: 1, retried: 0, review: 0, skipped: 0});
    assert.equal(f.count('commerce_grants'), 6);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_fulfillments SET state='retry' WHERE invoice_id=?").run(invoiceId), /fulfillment is final/);
  } finally {f.sqlite.close();}
});

test('repeated transient failures stop after eight attempts in operator review', async () => {
  const f = createCommerceFixture();
  try {
    const {invoiceId} = await f.settle('buyer', 'product');
    f.sqlite.exec("CREATE TRIGGER fixture_receipt_crash BEFORE INSERT ON commerce_receipts BEGIN SELECT RAISE(ABORT,'fixture crash'); END");
    for (let i = 0; i < 8; i++) {await worker(f).process(); f.state.now += 3600;}
    const row = rows(f, 'SELECT state,attempts,last_error FROM commerce_fulfillments WHERE invoice_id=?', invoiceId)[0];
    assert.equal(row.state, 'review'); assert.equal(row.attempts, 8); assert.equal(row.last_error, 'RETRY_EXHAUSTED');
    assert.deepEqual(await worker(f).process(), {fulfilled: 0, retried: 0, review: 0, skipped: 0});
  } finally {f.sqlite.close();}
});

test('invoice that does not match its quote, or an unknown release, goes to review without grants', async () => {
  const f = createCommerceFixture();
  try {
    const wrong = await f.settle('buyer', 'product', {usdMinor: 1});
    assert.deepEqual(await worker(f).process(), {fulfilled: 0, retried: 0, review: 1, skipped: 0});
    assert.equal(rows(f, 'SELECT last_error FROM commerce_fulfillments WHERE invoice_id=?', wrong.invoiceId)[0].last_error, 'SNAPSHOT_MISMATCH');
    assert.equal(f.count('commerce_grants'), 0);
    const order = await f.service.orderStatus('buyer', wrong.quote.orderId);
    assert.equal(order.status, 'pending'); assert.equal(order.deliveryStatus, 'review');

    const other = await f.settle('other', 'product');
    // A registry entry whose hash belongs to another item is not accepted either.
    const s004 = f.releases.find(r => r.itemId === 'S004')!;
    const strict = createFulfillmentWorker({ledger: f.ledger, releases: [...f.releases.filter(r => r.itemId !== 'S004' && r.itemId !== 'S012'), {...s004, itemId: 'S012', objectKey: s004.objectKey.replace('S004', 'S012')}], now: () => f.state.now});
    assert.deepEqual(await strict.process(), {fulfilled: 0, retried: 0, review: 1, skipped: 0});
    assert.equal(rows(f, 'SELECT last_error FROM commerce_fulfillments WHERE invoice_id=?', other.invoiceId)[0].last_error, 'RELEASE_UNKNOWN');
    assert.equal(f.count('commerce_grants'), 0);
    // The owner sees the review state, not an endless "paid, preparing access".
    const stuck = await f.service.orderStatus('other', other.quote.orderId);
    assert.equal(stuck.status, 'paid'); assert.equal(stuck.deliveryStatus, 'review');
  } finally {f.sqlite.close();}
});

test('SQL triggers refuse grants/receipts without a paid order and keep the ledger immutable', async () => {
  const f = createCommerceFixture();
  try {
    const pending = await f.service.createQuote('buyer', {plan: 'product', idempotencyKey: 'pending'});
    assert.throws(() => f.sqlite.prepare("INSERT INTO commerce_grants(id,user_id,order_id,item_id,release_sha256,allocation_minor,paid_at,updates_end,created_at) VALUES('g','buyer',?,'S004',?,1,1,2,1)").run(pending.orderId, 'a'.repeat(64)), /paid receipt required/);
    assert.throws(() => f.sqlite.prepare("INSERT INTO commerce_receipts(id,order_id,user_id,quote_id,invoice_id,plan,currency,subtotal_minor,tax_minor,total_minor,asset,amount_base_units,terms_revision,tax_revision,paid_at,created_at) VALUES('r',?,'buyer',?,'none','product','USD',1600,0,1600,'TON','1','terms-v1','tax-v1',1,1)").run(pending.orderId, pending.id), /paid order required/);
    const {quote} = await f.settle('buyer', 'product');
    await worker(f).process();
    const grant = rows(f, 'SELECT id FROM commerce_grants WHERE order_id=? LIMIT 1', quote.orderId)[0].id;
    assert.throws(() => f.sqlite.prepare('UPDATE commerce_grants SET updates_end=updates_end+1 WHERE id=?').run(grant), /immutable commerce grant/);
    assert.throws(() => f.sqlite.prepare('UPDATE commerce_receipts SET subtotal_minor=1').run(), /immutable commerce receipt/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_grants').run(), /ledger row/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_receipts').run(), /ledger row/);
    // A grant for an item outside the paid snapshot is refused even with a valid receipt.
    assert.throws(() => f.sqlite.prepare("INSERT INTO commerce_grants(id,user_id,order_id,item_id,release_sha256,allocation_minor,paid_at,updates_end,created_at) SELECT 'x',user_id,order_id,'S012',release_sha256,0,paid_at,updates_end,1 FROM commerce_grants WHERE id=?").run(grant), /paid receipt required/);
    f.sqlite.prepare("UPDATE commerce_grants SET status='revoked',revoked_at=2000,revoke_reason='refund' WHERE id=?").run(grant);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_grants SET status='active',revoked_at=NULL,revoke_reason=NULL WHERE id=?").run(grant), /revoked grant is final/);
  } finally {f.sqlite.close();}
});

test('server ledger is the pricing authority: Product owner gets the $23 upgrade for 17 IDs, refunds and disputes remove it', async () => {
  const f = createCommerceFixture();
  try {
    await f.settle('buyer', 'product');
    await worker(f).process();
    const productOrder = (f.sqlite.prepare("SELECT order_id FROM commerce_receipts WHERE user_id='buyer'").get() as {order_id: string}).order_id;
    assert.deepEqual(await f.ledger.pricingOwnership('buyer'), {itemIds: [...pricingPlanScopes.product].sort(), productNetPaidMinor: 1600, productReceiptOrderId: productOrder});
    assert.deepEqual(await f.ledger.pricingOwnership('other'), {itemIds: [], productNetPaidMinor: 0, productReceiptOrderId: null});
    const upgrade = await f.service.createQuote('buyer', {plan: 'bundle', idempotencyKey: 'upgrade'});
    assert.equal(upgrade.subtotalMinor, 2300); assert.equal(upgrade.itemIds.length, 17);
    // The quote records the applied rule and the Product order that enabled it (pricing contract section 4).
    assert.equal(upgrade.pricingKind, 'upgrade');
    assert.equal(f.sqlite.prepare('SELECT upgrade_basis_order_id FROM commerce_quotes WHERE id=?').get(upgrade.id)?.upgrade_basis_order_id, productOrder);
    assert.equal((await f.service.createQuote('other', {plan: 'bundle', idempotencyKey: 'new'})).subtotalMinor, 3900);
    // A partial refund lowers the upgrade credit to the net paid amount; the cheaper proportional price then wins.
    f.sqlite.prepare("UPDATE commerce_receipts SET status='partially_refunded',refunded_subtotal_minor=600 WHERE user_id='buyer'").run();
    assert.equal((await f.ledger.pricingOwnership('buyer')).productNetPaidMinor, 1000);
    assert.equal((await f.service.createQuote('buyer', {plan: 'bundle', idempotencyKey: 'after-partial-refund'})).subtotalMinor, 2883);
    // A disputed Product receipt is not a qualifying upgrade basis; grants alone give only proportional pricing.
    f.sqlite.prepare("UPDATE commerce_receipts SET status='disputed' WHERE user_id='buyer'").run();
    assert.equal((await f.ledger.pricingOwnership('buyer')).productNetPaidMinor, 0);
    f.state.now = 1001;
    assert.equal((await f.service.createQuote('buyer', {plan: 'bundle', idempotencyKey: 'after-dispute'})).subtotalMinor, 2883);
    // Owning everything means no payable quote.
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', idempotencyKey: 'owned'}), (e: unknown) => e instanceof CommerceError && e.code === 'OFFER_CHANGED');
  } finally {f.sqlite.close();}
});

test('one open checkout per overlapping items: a second invoice is refused until the first expires or is delivered', async () => {
  const f = createCommerceFixture();
  try {
    const first = await f.invoice('buyer', 'product');
    // A second quote for overlapping items can be priced, but cannot become a payable invoice.
    const second = await f.service.createQuote('buyer', {plan: 'bundle', idempotencyKey: 'second'});
    await assert.rejects(() => f.service.resolveQuote(second.id, 'buyer'), (e: unknown) => e instanceof CommerceError && e.code === 'CHECKOUT_IN_PROGRESS');
    // The database guard holds even if the service check is bypassed (race between two requests).
    await assert.rejects(() => f.invoice('buyer', 'product'), /checkout in progress/);
    assert.equal(f.count('ton_invoices'), 1);
    // Another user is unaffected.
    await f.invoice('other', 'product');
    // Paid but not yet delivered still blocks; delivery or expiry releases the lock.
    await f.pay(first);
    await assert.rejects(() => f.service.resolveQuote(second.id, 'buyer'), (e: unknown) => e instanceof CommerceError && e.code === 'CHECKOUT_IN_PROGRESS');
    await worker(f).process();
    // After delivery the bundle quote no longer matches ownership: a fresh quote prices the upgrade.
    await assert.rejects(() => f.service.resolveQuote(second.id, 'buyer'), (e: unknown) => e instanceof CommerceError && e.code === 'OFFER_CHANGED');
  } finally {f.sqlite.close();}
});

test('a late-observed on-time payment that overlaps a newer purchase is still delivered and flagged for support', async () => {
  const f = createCommerceFixture();
  try {
    const first = await f.invoice('buyer', 'product');
    const firstPaidAt = f.state.now + 10;
    // The first invoice looks expired before its on-time transfer is observed, so a new checkout opens.
    f.state.now += 801;
    const second = await f.invoice('buyer', 'product');
    await f.pay(second);
    await worker(f).process();
    await f.pay(first, firstPaidAt);
    await worker(f).process();
    assert.equal(f.sqlite.prepare('SELECT note FROM commerce_fulfillments WHERE invoice_id=?').get(second.invoiceId)?.note, null);
    assert.equal(f.sqlite.prepare('SELECT note FROM commerce_fulfillments WHERE invoice_id=?').get(first.invoiceId)?.note, 'OWNERSHIP_OVERLAP');
    assert.equal(f.count('commerce_grants'), 12);
    assert.equal((await f.ledger.pricingOwnership('buyer')).itemIds.length, 6);
  } finally {f.sqlite.close();}
});

test('a withdrawn current release stops new quotes for that item; the journal is append-only', async () => {
  const f = createCommerceFixture();
  try {
    const s004 = f.releases.find(r => r.itemId === 'S004')!;
    await f.ledger.revokeRelease('S004', s004.sha256, 'security', 900);
    await assert.rejects(() => f.service.createQuote('buyer', {plan: 'product', idempotencyKey: 'blocked'}), (e: unknown) => e instanceof CommerceError && e.code === 'OFFER_CHANGED');
    assert.equal(f.count('commerce_orders'), 0);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_release_revocations').run(), /release revocation is final/);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_release_revocations SET reason='withdrawn'").run(), /release revocation is final/);
    // Without the journal dependency (older host) the item would still be sold: the real host always wires it.
    const unguarded = createCommerceService({...f.deps, revokedReleases: undefined});
    assert.ok((await unguarded.createQuote('buyer', {plan: 'product', idempotencyKey: 'unguarded'})).id);
  } finally {f.sqlite.close();}
});
