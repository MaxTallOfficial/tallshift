import type {PricingOwnership} from '../../foundations/pricing-quote.ts';
import {pricingPlanTerms} from '../../foundations/pricing-plans.ts';
import type {D1DatabaseLike,D1StatementLike} from '../payments/ton/store.ts';
import type {CoverageGrant} from '../delivery/releases.ts';

/**
 * Authoritative ownership ledger (receipts, grants, fulfillment state, release withdrawals).
 * Browser storage, URL examples and client payloads are never inputs to these reads.
 */
export class LedgerError extends Error {
  readonly code: 'INVALID_INPUT' | 'DATABASE_ERROR';
  constructor(code: LedgerError['code']) {super(code); this.code = code;}
}
type Row = Record<string, unknown>;
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const sha = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const time = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

export interface ActiveGrant extends CoverageGrant {orderId: string; paidAt: number}
export interface ReceiptSummary {
  orderId: string; plan: 'product' | 'bundle'; currency: 'USD'; subtotalMinor: number; taxMinor: number; totalMinor: number;
  refundedSubtotalMinor: number; asset: 'TON' | 'USDT'; paidAt: number; status: 'paid' | 'partially_refunded' | 'refunded' | 'disputed';
}
export interface FulfillmentCandidate {invoiceId: string; attempts: number}
export interface Settlement {
  invoice: {id: string; userId: string; quoteId: string; status: string; paidAt: number | null; itemIdsJson: string; termsRevision: string; usdMinor: number | null};
  quote: {id: string; userId: string; plan: string; subtotalMinor: number; totalMinor: number; itemIds: string[]; releases: Record<string, string>; termsRevision: string} | null;
  order: {id: string; userId: string; status: string} | null;
}
export interface GrantPlan {itemId: string; releaseSha256: string; allocationMinor: number}

/** SQL fragment: the order's settled invoice exactly matches its immutable quote (mirrors the 0003 trigger). */
export const matchingSettledInvoice = `SELECT 1 FROM ton_invoices i JOIN commerce_quotes q ON q.id=i.quote_id
  WHERE q.id=commerce_orders.quote_id AND q.user_id=commerce_orders.user_id AND i.user_id=commerce_orders.user_id
  AND i.status='paid' AND i.item_ids_json=q.item_ids_json AND i.terms_revision=q.terms_revision
  AND json_extract(i.fx_snapshot_json,'$.usdMinor')=q.total_minor`;

export function createCommerceLedger(db: D1DatabaseLike) {
  const statement = (sql: string, ...values: unknown[]) => db.prepare(sql).bind(...values);
  const batch = async (statements: D1StatementLike[]) => {
    const result = await db.batch(statements);
    if (result.length !== statements.length || result.some(item => !item.success)) throw new LedgerError('DATABASE_ERROR');
    return result;
  };
  return {
    async activeGrants(userId: string): Promise<ActiveGrant[]> {
      if (!identifier(userId)) throw new LedgerError('INVALID_INPUT');
      const rows = await statement("SELECT order_id,item_id,release_sha256,paid_at,updates_end FROM commerce_grants WHERE user_id=? AND status='active' ORDER BY item_id,paid_at", userId).all<Row>();
      return rows.results.map(row => ({orderId: String(row.order_id), itemId: String(row.item_id), releaseSha256: String(row.release_sha256), paidAt: Number(row.paid_at), updatesEnd: Number(row.updates_end)}));
    },
    async receipts(userId: string): Promise<ReceiptSummary[]> {
      if (!identifier(userId)) throw new LedgerError('INVALID_INPUT');
      const rows = await statement('SELECT order_id,plan,currency,subtotal_minor,tax_minor,total_minor,refunded_subtotal_minor,asset,paid_at,status FROM commerce_receipts WHERE user_id=? ORDER BY paid_at DESC,order_id', userId).all<Row>();
      return rows.results.map(row => ({orderId: String(row.order_id), plan: row.plan as ReceiptSummary['plan'], currency: 'USD', subtotalMinor: Number(row.subtotal_minor), taxMinor: Number(row.tax_minor), totalMinor: Number(row.total_minor), refundedSubtotalMinor: Number(row.refunded_subtotal_minor), asset: row.asset as ReceiptSummary['asset'], paidAt: Number(row.paid_at), status: row.status as ReceiptSummary['status']}));
    },
    /**
     * Pricing input from active grants and one qualifying Product receipt: paid (or partially
     * refunded) net of refunds, before tax, capped at the Product price. Disputed/refunded
     * receipts never qualify and several receipts are not summed.
     */
    async pricingOwnership(userId: string): Promise<PricingOwnership> {
      if (!identifier(userId)) throw new LedgerError('INVALID_INPUT');
      const items = await statement("SELECT DISTINCT item_id FROM commerce_grants WHERE user_id=? AND status='active' ORDER BY item_id", userId).all<Row>();
      const best = await statement(`SELECT max(subtotal_minor-refunded_subtotal_minor) AS net FROM commerce_receipts r
        WHERE r.user_id=? AND r.plan='product' AND r.status IN ('paid','partially_refunded')
        AND EXISTS (SELECT 1 FROM commerce_grants g WHERE g.order_id=r.order_id AND g.status='active')`, userId).first<Row>();
      const net = best?.net === null || best?.net === undefined ? 0 : Number(best.net);
      if (!Number.isSafeInteger(net) || net < 0) throw new LedgerError('DATABASE_ERROR');
      return {itemIds: items.results.map(row => String(row.item_id)), productNetPaidMinor: Math.min(net, pricingPlanTerms.product.priceMinor)};
    },
    async revokedReleases(hashes: readonly string[]): Promise<Set<string>> {
      const unique = [...new Set(hashes)];
      if (unique.length > 100 || !unique.every(sha)) throw new LedgerError('INVALID_INPUT');
      if (!unique.length) return new Set();
      const rows = await statement(`SELECT release_sha256 FROM commerce_release_revocations WHERE release_sha256 IN (${unique.map(() => '?').join(',')})`, ...unique).all<Row>();
      return new Set(rows.results.map(row => String(row.release_sha256)));
    },
    async recordDownload(userId: string, itemId: string, releaseSha256: string, outcome: 'issued' | 'served', at: number) {
      if (!identifier(userId) || !/^[SCEA]\d{3}$/.test(itemId) || !sha(releaseSha256) || !time(at)) throw new LedgerError('INVALID_INPUT');
      await batch([statement('INSERT INTO commerce_download_events(id,user_id,item_id,release_sha256,outcome,created_at) VALUES(?,?,?,?,?,?)', crypto.randomUUID(), userId, itemId, releaseSha256, outcome, at)]);
    },
    /** Settled invoices whose fulfillment intent is open and not quarantined for review. */
    async fulfillmentCandidates(now: number, limit = 25): Promise<FulfillmentCandidate[]> {
      if (!time(now) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new LedgerError('INVALID_INPUT');
      const rows = await statement(`SELECT o.invoice_id,coalesce(f.attempts,0) AS attempts FROM ton_payment_outbox o
        LEFT JOIN commerce_fulfillments f ON f.invoice_id=o.invoice_id
        WHERE o.state='pending' AND (f.invoice_id IS NULL OR (f.state='retry' AND f.next_attempt_at<=?))
        ORDER BY o.created_at,o.invoice_id LIMIT ?`, now, limit).all<Row>();
      return rows.results.map(row => ({invoiceId: String(row.invoice_id), attempts: Number(row.attempts)}));
    },
    async settlement(invoiceId: string): Promise<Settlement | null> {
      if (!identifier(invoiceId)) throw new LedgerError('INVALID_INPUT');
      const invoice = await statement('SELECT id,user_id,quote_id,status,paid_at,item_ids_json,terms_revision,json_extract(fx_snapshot_json,\'$.usdMinor\') AS usd_minor FROM ton_invoices WHERE id=?', invoiceId).first<Row>();
      if (!invoice) return null;
      const quote = await statement('SELECT id,user_id,plan,subtotal_minor,total_minor,item_ids_json,release_snapshot_json,terms_revision FROM commerce_quotes WHERE id=? AND user_id=?', invoice.quote_id, invoice.user_id).first<Row>();
      const order = quote ? await statement('SELECT id,user_id,status FROM commerce_orders WHERE quote_id=? AND user_id=?', quote.id, quote.user_id).first<Row>() : null;
      return {
        invoice: {id: String(invoice.id), userId: String(invoice.user_id), quoteId: String(invoice.quote_id), status: String(invoice.status), paidAt: invoice.paid_at === null ? null : Number(invoice.paid_at), itemIdsJson: String(invoice.item_ids_json), termsRevision: String(invoice.terms_revision), usdMinor: invoice.usd_minor === null || invoice.usd_minor === undefined ? null : Number(invoice.usd_minor)},
        quote: quote ? {id: String(quote.id), userId: String(quote.user_id), plan: String(quote.plan), subtotalMinor: Number(quote.subtotal_minor), totalMinor: Number(quote.total_minor), itemIds: JSON.parse(String(quote.item_ids_json)), releases: JSON.parse(String(quote.release_snapshot_json)), termsRevision: String(quote.terms_revision)} : null,
        order: order ? {id: String(order.id), userId: String(order.user_id), status: String(order.status)} : null,
      };
    },
    /**
     * One transaction: paid order (trigger-verified), receipt, grants, fulfilled state, closed
     * outbox intent and invoice delivery state. Replays are no-ops; a crash leaves nothing half-done.
     */
    async fulfill(input: {invoiceId: string; orderId: string; userId: string; paidAt: number; updatesEnd: number; grants: readonly GrantPlan[]; note: string | null; now: number}) {
      const {invoiceId, orderId, userId, paidAt, updatesEnd, grants, note, now} = input;
      if (![invoiceId, orderId, userId].every(identifier) || !time(paidAt) || !time(updatesEnd) || updatesEnd <= paidAt || !time(now) || !grants.length || grants.length > 32
        || new Set(grants.map(g => g.itemId)).size !== grants.length || !grants.every(g => /^[SCEA]\d{3}$/.test(g.itemId) && sha(g.releaseSha256) && Number.isSafeInteger(g.allocationMinor) && g.allocationMinor >= 0)
        || (note !== null && !/^[A-Z_]{1,64}$/.test(note))) throw new LedgerError('INVALID_INPUT');
      const statements = [
        statement(`UPDATE commerce_orders SET status='paid',paid_at=(SELECT paid_at FROM ton_invoices WHERE id=?)
          WHERE id=? AND user_id=? AND status='pending' AND quote_id=(SELECT quote_id FROM ton_invoices WHERE id=?) AND EXISTS (${matchingSettledInvoice})`, invoiceId, orderId, userId, invoiceId),
        statement(`INSERT INTO commerce_receipts(id,order_id,user_id,quote_id,invoice_id,plan,currency,subtotal_minor,tax_minor,total_minor,asset,amount_base_units,terms_revision,tax_revision,paid_at,created_at)
          SELECT ?,o.id,o.user_id,q.id,i.id,q.plan,q.currency,q.subtotal_minor,q.tax_minor,q.total_minor,i.asset,i.amount_base_units,q.terms_revision,q.tax_revision,o.paid_at,?
          FROM commerce_orders o JOIN commerce_quotes q ON q.id=o.quote_id AND q.user_id=o.user_id JOIN ton_invoices i ON i.quote_id=q.id AND i.user_id=q.user_id
          WHERE o.id=? AND o.user_id=? AND i.id=? AND o.status='paid' AND i.status='paid' ON CONFLICT DO NOTHING`, crypto.randomUUID(), now, orderId, userId, invoiceId),
        ...grants.map(grant => statement(`INSERT INTO commerce_grants(id,user_id,order_id,item_id,release_sha256,allocation_minor,paid_at,updates_end,created_at)
          SELECT ?,o.user_id,o.id,?,?,?,o.paid_at,?,? FROM commerce_orders o WHERE o.id=? AND o.user_id=? AND o.status='paid' AND o.paid_at=? ON CONFLICT DO NOTHING`,
          crypto.randomUUID(), grant.itemId, grant.releaseSha256, grant.allocationMinor, updatesEnd, now, orderId, userId, paidAt)),
        statement(`INSERT INTO commerce_fulfillments(invoice_id,order_id,state,attempts,next_attempt_at,last_error,note,updated_at,fulfilled_at)
          SELECT ?,?,'fulfilled',0,0,NULL,?,?,? WHERE EXISTS (SELECT 1 FROM commerce_receipts WHERE order_id=? AND invoice_id=?)
          AND (SELECT count(*) FROM commerce_grants WHERE order_id=? AND user_id=?)=?
          ON CONFLICT(invoice_id) DO UPDATE SET order_id=excluded.order_id,state='fulfilled',next_attempt_at=0,last_error=NULL,note=excluded.note,updated_at=excluded.updated_at,fulfilled_at=excluded.fulfilled_at
          WHERE commerce_fulfillments.state<>'fulfilled'`, invoiceId, orderId, note, now, now, orderId, invoiceId, orderId, userId, grants.length),
        statement(`UPDATE ton_payment_outbox SET state='delivered' WHERE invoice_id=? AND state='pending' AND EXISTS (SELECT 1 FROM commerce_fulfillments WHERE invoice_id=? AND state='fulfilled')`, invoiceId, invoiceId),
        statement(`UPDATE ton_invoices SET delivery_state='delivered' WHERE id=? AND status='paid' AND delivery_state='pending' AND EXISTS (SELECT 1 FROM commerce_fulfillments WHERE invoice_id=? AND state='fulfilled')`, invoiceId, invoiceId),
      ];
      await batch(statements);
      const row = await statement('SELECT state FROM commerce_fulfillments WHERE invoice_id=?', invoiceId).first<Row>();
      return row?.state === 'fulfilled';
    },
    /** Records a failed attempt; permanent problems and exhausted retries stay quarantined for an operator. */
    async markAttempt(invoiceId: string, orderId: string | null, outcome: 'retry' | 'review', code: string, now: number) {
      if (!identifier(invoiceId) || (orderId !== null && !identifier(orderId)) || !/^[A-Z_]{1,64}$/.test(code) || !time(now)) throw new LedgerError('INVALID_INPUT');
      const current = await statement('SELECT attempts,state FROM commerce_fulfillments WHERE invoice_id=?', invoiceId).first<Row>();
      if (current?.state === 'fulfilled') return 'fulfilled' as const;
      if (current?.state === 'review') return 'review' as const;
      const attempts = Math.min(8, Number(current?.attempts ?? 0) + 1);
      const state = outcome === 'review' || attempts >= 8 ? 'review' : 'retry';
      const next = state === 'retry' ? now + Math.min(3600, 60 * 2 ** (attempts - 1)) : 0;
      await batch([statement(`INSERT INTO commerce_fulfillments(invoice_id,order_id,state,attempts,next_attempt_at,last_error,note,updated_at,fulfilled_at)
        VALUES(?,?,?,?,?,?,NULL,?,NULL) ON CONFLICT(invoice_id) DO UPDATE SET order_id=coalesce(excluded.order_id,commerce_fulfillments.order_id),state=excluded.state,attempts=excluded.attempts,next_attempt_at=excluded.next_attempt_at,last_error=excluded.last_error,updated_at=excluded.updated_at
        WHERE commerce_fulfillments.state<>'fulfilled'`, invoiceId, orderId, state, attempts, next, attempts >= 8 && outcome === 'retry' ? 'RETRY_EXHAUSTED' : code, now)]);
      return state;
    },
    async fulfillmentForOrder(orderId: string, userId: string) {
      if (!identifier(orderId) || !identifier(userId)) return null;
      const row = await statement('SELECT f.state FROM commerce_fulfillments f JOIN commerce_orders o ON o.id=f.order_id WHERE f.order_id=? AND o.user_id=?', orderId, userId).first<Row>();
      return row ? String(row.state) as 'retry' | 'review' | 'fulfilled' : null;
    },
    /**
     * Operator primitive for a reviewed withdrawal (security/integrity/legal). No route calls it;
     * it denies delivery of that exact release immediately and is final.
     */
    async revokeRelease(itemId: string, releaseSha256: string, reason: 'security' | 'integrity' | 'legal' | 'withdrawn', at: number) {
      if (!/^[SCEA]\d{3}$/.test(itemId) || !sha(releaseSha256) || !['security', 'integrity', 'legal', 'withdrawn'].includes(reason) || !time(at)) throw new LedgerError('INVALID_INPUT');
      await batch([statement('INSERT INTO commerce_release_revocations(release_sha256,item_id,reason,revoked_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING', releaseSha256, itemId, reason, at)]);
    },
  };
}
export type CommerceLedger = ReturnType<typeof createCommerceLedger>;
