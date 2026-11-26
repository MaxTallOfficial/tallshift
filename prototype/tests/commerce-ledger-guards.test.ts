import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerceFixture,release} from './helpers/commerce-fixture.ts';
import {createFulfillmentWorker} from '../src/server/orders/fulfillment.ts';
import {LedgerError} from '../src/server/orders/ledger.ts';
import {pricingPlanScopes} from '../src/foundations/pricing-plans.ts';

const fulfil = (f: ReturnType<typeof createCommerceFixture>) => createFulfillmentWorker({ledger: f.ledger, releases: f.releases, now: () => f.state.now}).process(25);
const one = (f: ReturnType<typeof createCommerceFixture>, sql: string, ...values: unknown[]) => f.sqlite.prepare(sql).get(...values as never[]) as Record<string, unknown>;

test('manual refund before download revokes exactly that order and removes it from pricing', async () => {
  const f = createCommerceFixture();
  try {
    const {quote} = await f.settle('buyer', 'product');
    await fulfil(f);
    const refund = await f.ledger.recordRefund({orderId: quote.orderId, items: 'all', reason: 'before_download', reference: 'tonkeeper-tx-1', at: 2000});
    assert.deepEqual({status: refund.status, refunded: refund.refundedSubtotalMinor}, {status: 'refunded', refunded: 1600});
    assert.equal(one(f, "SELECT count(*) AS n FROM commerce_grants WHERE status='active'").n, 0);
    assert.deepEqual(await f.ledger.pricingOwnership('buyer'), {itemIds: [], productNetPaidMinor: 0, productReceiptOrderId: null});
    assert.equal((await f.ledger.receipts('buyer'))[0].status, 'refunded');
    // Nothing is left to refund, and the record itself is final.
    await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, items: 'all', reason: 'other', reference: 'again', at: 2001}));
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_refunds SET reason='other'").run(), /refund record is final/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_refunds').run(), /ledger row/);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_receipts SET status='paid',refunded_subtotal_minor=0").run(), /receipt history only moves forward/);
  } finally {f.sqlite.close();}
});

test('"before_download" is refused once an item was served; partial refunds follow per-item allocations', async () => {
  const f = createCommerceFixture();
  try {
    const {quote} = await f.settle('buyer', 'product');
    await fulfil(f);
    await f.ledger.recordDownload('buyer', 'S004', f.releases.find(r => r.itemId === 'S004')!.sha256, 'served', 1500);
    await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, items: ['S004'], reason: 'before_download', reference: 'tx', at: 2000}), /item was already downloaded/);
    // Allocation for $16 over the sorted six IDs: C003, C004, E002, S004 = 267; S005, S006 = 266.
    const partial = await f.ledger.recordRefund({orderId: quote.orderId, items: ['S005', 'S006'], reason: 'before_download', reference: 'tx-partial', at: 2000});
    assert.deepEqual({status: partial.status, refunded: partial.refundedSubtotalMinor}, {status: 'partially_refunded', refunded: 532});
    assert.deepEqual((await f.ledger.pricingOwnership('buyer')).itemIds, ['C003', 'C004', 'E002', 'S004']);
    assert.equal((await f.ledger.pricingOwnership('buyer')).productNetPaidMinor, 1068);
    // Duplicate, unknown or already revoked items are refused atomically.
    for (const items of [['S005'], ['S012'], ['S004', 'S004']]) await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, items, reason: 'defect', reference: 'tx', at: 2001}));
    const rest = await f.ledger.recordRefund({orderId: quote.orderId, items: 'all', reason: 'defect', reference: 'tx-rest', at: 2002});
    assert.deepEqual({status: rest.status, refunded: rest.refundedSubtotalMinor}, {status: 'refunded', refunded: 1600});
    await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, items: 'all', reason: 'other', reference: 'bad reference with spaces', at: 1}), (e: unknown) => e instanceof LedgerError && e.code === 'INVALID_INPUT');
  } finally {f.sqlite.close();}
});

test('refunding Product after an upgrade keeps the 17 upgrade items; refunding the upgrade keeps Product', async () => {
  const f = createCommerceFixture();
  try {
    const product = await f.settle('buyer', 'product');
    await fulfil(f);
    const upgrade = await f.settle('buyer', 'bundle');
    await fulfil(f);
    assert.equal(upgrade.quote.subtotalMinor, 2300);
    assert.equal((await f.ledger.pricingOwnership('buyer')).itemIds.length, 23);
    await f.ledger.recordRefund({orderId: product.quote.orderId, items: 'all', reason: 'defect', reference: 'tx-product', at: 3000});
    const after = await f.ledger.pricingOwnership('buyer');
    assert.equal(after.itemIds.length, 17);
    assert.ok(!after.itemIds.some(id => (pricingPlanScopes.product as readonly string[]).includes(id)));
    assert.equal(one(f, 'SELECT status FROM commerce_receipts WHERE order_id=?', upgrade.quote.orderId).status, 'paid');
  } finally {f.sqlite.close();}
});

test('paid can only come from a verified payment event; paid history and ledgers are final', async () => {
  const f = createCommerceFixture();
  try {
    const issued = await f.invoice('buyer', 'product');
    const columns = 'id,user_id,quote_id,item_ids_json,terms_revision,asset,network,recipient,jetton_master,amount_base_units,comment,created_at,expires_at,fx_quote_id,fx_snapshot_json,idempotency_key,input_digest';
    assert.throws(() => f.sqlite.prepare(`INSERT INTO ton_invoices(${columns},status,paid_at,settlement_event_key,delivery_state) SELECT 'forged','other','forged-quote',item_ids_json,terms_revision,asset,network,recipient,jetton_master,amount_base_units,'ts_${'f'.repeat(32)}',created_at,expires_at,fx_quote_id,fx_snapshot_json,'forged',input_digest,'paid',1,'fake','pending' FROM ton_invoices WHERE id=?`).run(issued.invoiceId), /invoices start pending/);
    assert.throws(() => f.sqlite.prepare("UPDATE ton_invoices SET status='paid',paid_at=1010,settlement_event_key='fake',delivery_state='pending' WHERE id=?").run(issued.invoiceId), /paid requires a verified payment event/);
    assert.throws(() => f.sqlite.prepare("INSERT INTO commerce_orders(id,user_id,quote_id,created_at,status,paid_at) VALUES('o2','buyer','x',1,'paid',1)").run(), /orders start pending/);
    await f.pay(issued);
    assert.throws(() => f.sqlite.prepare('UPDATE ton_invoices SET paid_at=paid_at+1 WHERE id=?').run(issued.invoiceId), /paid requires a verified payment event/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM ton_invoices').run(), /ledger row/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM ton_payment_events').run(), /ledger row/);
    await fulfil(f);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_orders SET status='pending',paid_at=NULL").run(), /paid order is final/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_fulfillments').run(), /ledger row/);
    // Grants cannot exceed the paid subtotal or the 12-month window, even with a valid receipt.
    const grant = one(f, 'SELECT * FROM commerce_grants LIMIT 1');
    f.sqlite.exec('DROP TRIGGER commerce_grant_ledger');
    f.sqlite.prepare('DELETE FROM commerce_grants WHERE id=?').run(grant.id);
    const insert = (allocation: number, end: number) => f.sqlite.prepare('INSERT INTO commerce_grants(id,user_id,order_id,item_id,release_sha256,allocation_minor,paid_at,updates_end,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run('g2', grant.user_id as string, grant.order_id as string, grant.item_id as string, grant.release_sha256 as string, allocation, grant.paid_at as number, end, 1);
    assert.throws(() => insert(9_999_999, grant.updates_end as number), /paid receipt required/);
    assert.throws(() => insert(grant.allocation_minor as number, (grant.paid_at as number) + 10_000_000_000), /paid receipt required/);
    insert(grant.allocation_minor as number, grant.updates_end as number);
  } finally {f.sqlite.close();}
});

test('withdrawal lookups stay correct with more than 100 registered releases', async () => {
  const f = createCommerceFixture();
  try {
    const many = pricingPlanScopes.bundle.flatMap(itemId => [1, 2, 3, 4].map(minor => release(itemId, `1.${minor}.0`, 600 + minor).release));
    const hashes = [...f.releases, ...many].map(r => r.sha256);
    assert.ok(hashes.length > 100);
    await f.ledger.revokeRelease('S004', many[3].sha256, 'security', 700);
    assert.deepEqual([...await f.ledger.revokedReleases(hashes)], [many[3].sha256]);
  } finally {f.sqlite.close();}
});

test('the documented one-statement operator refund SQL works as written', async () => {
  const f = createCommerceFixture();
  try {
    const {quote} = await f.settle('buyer', 'product');
    await fulfil(f);
    // Same text as "Ручной возврат: порядок действий" in docs/knowledge-base/commerce-stage-2026-11-26.ru.md.
    const sql = `INSERT INTO commerce_refunds(id,order_id,item_ids_json,reason,refund_reference,created_at)
SELECT 'refund_'||lower(hex(randomblob(16))),'<ORDER_ID>',json_group_array(item_id),'before_download','<TX_HASH>',CAST(strftime('%s','now') AS INTEGER)
FROM commerce_grants WHERE order_id='<ORDER_ID>' AND status='active';`;
    assert.match(quote.orderId, /^[a-f0-9-]{36}$/);
    f.sqlite.exec(sql.replaceAll('<ORDER_ID>', quote.orderId).replace('<TX_HASH>', 'a'.repeat(64)));
    assert.equal(one(f, 'SELECT status FROM commerce_receipts WHERE order_id=?', quote.orderId).status, 'refunded');
    assert.equal(one(f, "SELECT count(*) AS n FROM commerce_grants WHERE order_id=? AND status='revoked'", quote.orderId).n, 6);
    assert.throws(() => f.sqlite.exec(sql.replaceAll('<ORDER_ID>', quote.orderId).replace('<TX_HASH>', 'b'.repeat(64))), /refund needs active grants|CHECK constraint/);
  } finally {f.sqlite.close();}
});
