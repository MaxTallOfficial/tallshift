import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCommerceFixture,release} from './helpers/commerce-fixture.ts';
import {LedgerError} from '../src/server/orders/ledger.ts';
import {currentAccess,subscriptionPlanItems} from '../src/server/orders/subscription.ts';

type Fixture = ReturnType<typeof createCommerceFixture>;
const one = (f: Fixture, sql: string, ...values: unknown[]) => ({...f.sqlite.prepare(sql).get(...values as never[]) as Record<string, unknown>});
const invalid = (e: unknown) => e instanceof LedgerError && e.code === 'INVALID_INPUT';

test('a manual refund before download closes exactly that period and records the amount sent', async () => {
  const f = createCommerceFixture();
  try {
    const {quote} = await f.settle('buyer', 'product');
    await f.fulfil();
    const refund = await f.ledger.recordRefund({orderId: quote.orderId, amountMinor: 1600, reason: 'before_download', reference: 'keeper-tx-1', at: 2000});
    assert.deepEqual({status: refund.status, refunded: refund.refundedSubtotalMinor}, {status: 'refunded', refunded: 1600});
    assert.deepEqual(one(f, 'SELECT status,revoked_at FROM commerce_access_periods WHERE order_id=?', quote.orderId), {status: 'revoked', revoked_at: 2000});
    assert.equal(currentAccess(await f.ledger.accessPeriods('buyer'), 2001), null);
    assert.equal((await f.ledger.receipts('buyer'))[0].status, 'refunded');
    // Nothing is left to refund, and the record itself is final.
    await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, amountMinor: 1, reason: 'other', reference: 'again', at: 2001}));
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_refunds SET reason='other'").run(), /refund record is final/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_refunds').run(), /ledger row/);
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_receipts SET status='paid',refunded_subtotal_minor=0").run(), /receipt history only moves forward/);
  } finally {f.sqlite.close();}
});

test('"before_download" is refused once anything was served after the payment; the amount never exceeds what was paid', async () => {
  const f = createCommerceFixture();
  try {
    const {quote, paidAt} = await f.settle('buyer', 'product');
    await f.fulfil();
    await f.ledger.recordDownload('buyer', 'S004', f.releases.find(r => r.itemId === 'S004')!.sha256, 'served', paidAt + 5);
    await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, amountMinor: 1600, reason: 'before_download', reference: 'tx', at: 2000}), /already downloaded after this payment/);
    await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, amountMinor: 1601, reason: 'defect', reference: 'tx', at: 2000}), /refund needs an active paid period/);
    for (const amountMinor of [0, -1, 1.5]) await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, amountMinor, reason: 'defect', reference: 'tx', at: 2000}), invalid);
    await assert.rejects(() => f.ledger.recordRefund({orderId: quote.orderId, amountMinor: 800, reason: 'defect', reference: 'bad reference with spaces', at: 2000}), invalid);
    await assert.rejects(() => f.ledger.recordRefund({orderId: 'unknown-order', amountMinor: 800, reason: 'defect', reference: 'tx', at: 2000}), invalid);
    // Refund rules are not decided: the journal records what support actually sent, here half.
    const partial = await f.ledger.recordRefund({orderId: quote.orderId, amountMinor: 800, reason: 'defect', reference: 'tx-half', at: 2000});
    assert.deepEqual({status: partial.status, refunded: partial.refundedSubtotalMinor}, {status: 'refunded', refunded: 800});
    assert.equal(one(f, 'SELECT status FROM commerce_access_periods WHERE order_id=?', quote.orderId).status, 'revoked');
  } finally {f.sqlite.close();}
});

test('refunding one period of a renewal leaves the other period exactly as it was', async () => {
  const f = createCommerceFixture();
  try {
    const first = await f.settle('buyer', 'product');
    await f.fulfil();
    const second = await f.settle('buyer', 'product');
    await f.fulfil();
    const before = one(f, 'SELECT starts_at,ends_at,status FROM commerce_access_periods WHERE order_id=?', second.quote.orderId);
    await f.ledger.recordRefund({orderId: first.quote.orderId, amountMinor: 1600, reason: 'duplicate_payment', reference: 'tx-first', at: 2000});
    assert.deepEqual(one(f, 'SELECT starts_at,ends_at,status FROM commerce_access_periods WHERE order_id=?', second.quote.orderId), before);
    assert.equal(one(f, 'SELECT status FROM commerce_receipts WHERE order_id=?', second.quote.orderId).status, 'paid');
    // Later periods do not move forward on their own: how to treat such a gap is a refund-policy question.
    assert.equal(currentAccess(await f.ledger.accessPeriods('buyer'), 2001), null);
    assert.equal(currentAccess(await f.ledger.accessPeriods('buyer'), Number(before.starts_at))?.plan, 'product');
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
    await f.fulfil();
    assert.throws(() => f.sqlite.prepare("UPDATE commerce_orders SET status='pending',paid_at=NULL").run(), /paid order is final/);
    assert.throws(() => f.sqlite.prepare('DELETE FROM commerce_fulfillments').run(), /ledger row/);
    // A period cannot be longer than the paid term or start anywhere but the payment, even with a valid receipt.
    const period = one(f, 'SELECT * FROM commerce_access_periods LIMIT 1');
    f.sqlite.exec('DROP TRIGGER commerce_access_ledger');
    f.sqlite.prepare('DELETE FROM commerce_access_periods WHERE id=?').run(period.id as string);
    const insert = (startsAt: number, endsAt: number) => f.sqlite.prepare('INSERT INTO commerce_access_periods(id,user_id,order_id,plan,months,paid_at,starts_at,ends_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run('p2', period.user_id as string, period.order_id as string, period.plan as string, period.months as number, period.paid_at as number, startsAt, endsAt, 1);
    assert.throws(() => insert(period.starts_at as number, (period.starts_at as number) + 40 * 86400), /paid receipt required/);
    assert.throws(() => insert((period.starts_at as number) + 86400, (period.ends_at as number) + 86400), /access must continue from the current end/);
    insert(period.starts_at as number, period.ends_at as number);
  } finally {f.sqlite.close();}
});

test('withdrawal lookups stay correct with more than 100 registered releases', async () => {
  const f = createCommerceFixture();
  try {
    const many = subscriptionPlanItems.all.flatMap(itemId => [1, 2, 3, 4].map(minor => release(itemId, `1.${minor}.0`, 600 + minor).release));
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
    await f.fulfil();
    // Same text as in "Ручной возврат: порядок действий", docs/knowledge-base/commerce-stage-2026-11-26.ru.md.
    const doc = readFileSync(new URL('../../docs/knowledge-base/commerce-stage-2026-11-26.ru.md', import.meta.url), 'utf8');
    const sql = `INSERT INTO commerce_refunds(id,period_id,amount_minor,reason,refund_reference,created_at)
SELECT 'refund_'||lower(hex(randomblob(16))),id,<AMOUNT_MINOR>,'before_download','<TX_HASH>',CAST(strftime('%s','now') AS INTEGER)
FROM commerce_access_periods WHERE order_id='<ORDER_ID>';`;
    assert.ok(doc.split('\n').map(line => line.trim()).join('\n').includes(sql), 'the KB shows exactly this statement');
    assert.match(quote.orderId, /^[a-f0-9-]{36}$/);
    const run = (tx: string) => f.sqlite.exec(sql.replaceAll('<ORDER_ID>', quote.orderId).replace('<AMOUNT_MINOR>', '1600').replace('<TX_HASH>', tx));
    run('a'.repeat(64));
    assert.equal(one(f, 'SELECT status FROM commerce_receipts WHERE order_id=?', quote.orderId).status, 'refunded');
    assert.equal(one(f, 'SELECT status FROM commerce_access_periods WHERE order_id=?', quote.orderId).status, 'revoked');
    assert.throws(() => run('b'.repeat(64)), /refund needs an active paid period|UNIQUE constraint/);
  } finally {f.sqlite.close();}
});
