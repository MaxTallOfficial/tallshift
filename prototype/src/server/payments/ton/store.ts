/** Server-only persistence boundary; D1's batch is transactional. No browser imports. */
export type TonAsset = 'TON' | 'USDT';
export type TonNetwork = 'ton-mainnet' | 'ton-testnet';
export type InvoiceStatus = 'pending' | 'paid' | 'review' | 'expired';
export interface InvoiceInput {
  id: string; userId: string; quoteId: string; itemIds: readonly string[];
  termsRevision: string; asset: TonAsset; network: TonNetwork; recipient: string;
  jettonMaster: string | null; amountBaseUnits: string; comment: string;
  createdAt: number; expiresAt: number; fxQuoteId: string;
  fxSnapshot?: Readonly<Record<string, string | number>>;
  idempotencyKey: string; inputDigest: string;
}
export interface TonInvoice extends InvoiceInput {
  status: InvoiceStatus; deliveryState: 'not_ready' | 'pending' | 'delivered';
  paidAt: number | null; settlementEventKey: string | null;
}
export interface VerifiedPaymentInput {
  eventKey: string; txIdentity: string; invoiceId: string;
  asset: TonAsset; network: TonNetwork; recipient: string; comment: string;
  amountBaseUnits: string; transactionAt: number; observedAt: number; proofDigest: string;
}
export interface PaymentEvent extends VerifiedPaymentInput {
  outcome: 'paid' | 'review';
  reason: 'exact' | 'underpaid' | 'overpaid' | 'late' | 'early' | 'already_review' | 'already_paid';
}
export interface WebhookReceipt {
  eventKey: string; bodyDigest: string; receivedAt: number; reference: string;
}
export interface ClaimedWebhook extends WebhookReceipt {attempt:number;leaseToken:string}
export interface D1ResultLike { success: boolean; results?: unknown[]; meta?: {changes?: number} }
export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{results: T[]}>;
}
export interface D1DatabaseLike {
  prepare(sql: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<D1ResultLike[]>;
}
export class PaymentStoreError extends Error {
  readonly code: 'INVALID_INPUT' | 'IDEMPOTENCY_CONFLICT' | 'INVOICE_CONFLICT' | 'PAYMENT_CONFLICT' | 'NOT_FOUND' | 'DATABASE_ERROR';
  constructor(code: PaymentStoreError['code']) {super(code); this.code = code;}
}
type Row = Record<string, string | number | null>;
const id = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const digest = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const address = (value: unknown) => typeof value === 'string' && /^(?:0|-1):[a-f0-9]{64}$/.test(value);
const amount = (value: unknown) => typeof value === 'string' && /^[1-9]\d{0,77}$/.test(value);
const time = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
const asset = (value: unknown) => value === 'TON' || value === 'USDT';
const network = (value: unknown) => value === 'ton-mainnet' || value === 'ton-testnet';
const comment = (value: unknown) => typeof value === 'string' && /^ts_[a-f0-9]{32}$/.test(value);
function validateInvoice(value: InvoiceInput) {
  if (![value.id, value.userId, value.quoteId, value.termsRevision, value.fxQuoteId, value.idempotencyKey].every(id) || !digest(value.inputDigest) || !asset(value.asset) || !network(value.network) || !address(value.recipient) || !amount(value.amountBaseUnits) || !comment(value.comment) || !time(value.createdAt) || !time(value.expiresAt) || value.expiresAt <= value.createdAt || !Array.isArray(value.itemIds) || !value.itemIds.length || value.itemIds.length > 32 || new Set(value.itemIds).size !== value.itemIds.length || !value.itemIds.every(item => /^[SCEA]\d{3}$/.test(item)) || (value.asset === 'TON' ? value.jettonMaster !== null : !address(value.jettonMaster))) throw new PaymentStoreError('INVALID_INPUT');
  const fx = value.fxSnapshot ?? {};
  if (!fx || typeof fx !== 'object' || Array.isArray(fx) || Object.keys(fx).length > 20 || Object.entries(fx).some(([key,v]) => !id(key) || !(typeof v === 'string' && v.length <= 512 || typeof v === 'number' && Number.isFinite(v))) || JSON.stringify(fx).length > 8192) throw new PaymentStoreError('INVALID_INPUT');
}
function invoice(row: Row): TonInvoice {
  return {id: String(row.id), userId: String(row.user_id), quoteId: String(row.quote_id), itemIds: JSON.parse(String(row.item_ids_json)), termsRevision: String(row.terms_revision), asset: row.asset as TonAsset, network: row.network as TonNetwork, recipient: String(row.recipient), jettonMaster: row.jetton_master as string | null, amountBaseUnits: String(row.amount_base_units), comment: String(row.comment), createdAt: Number(row.created_at), expiresAt: Number(row.expires_at), fxQuoteId: String(row.fx_quote_id), fxSnapshot: JSON.parse(String(row.fx_snapshot_json)), idempotencyKey: String(row.idempotency_key), inputDigest: String(row.input_digest), status: row.status as InvoiceStatus, deliveryState: row.delivery_state as TonInvoice['deliveryState'], paidAt: row.paid_at === null ? null : Number(row.paid_at), settlementEventKey: row.settlement_event_key as string | null};
}
function payment(row: Row): PaymentEvent {
  return {eventKey: String(row.event_key), txIdentity: String(row.tx_identity), invoiceId: String(row.invoice_id), asset: row.asset as TonAsset, network: row.network as TonNetwork, recipient: String(row.recipient), comment: String(row.comment), amountBaseUnits: String(row.amount_base_units), transactionAt: Number(row.transaction_at), observedAt: Number(row.observed_at), proofDigest: String(row.proof_digest), outcome: row.outcome as PaymentEvent['outcome'], reason: row.reason as PaymentEvent['reason']};
}
export function createTonPaymentStore(db: D1DatabaseLike) {
  const statement = (sql: string, ...values: unknown[]) => db.prepare(sql).bind(...values);
  const batch = async (statements: D1StatementLike[]) => {
    const result = await db.batch(statements);
    if (result.length !== statements.length || result.some(item => !item.success)) throw new PaymentStoreError('DATABASE_ERROR');
    return result;
  };
  const find = async (invoiceId: string) => {
    const row = await statement('SELECT * FROM ton_invoices WHERE id = ?', invoiceId).first<Row>();
    return row ? invoice(row) : null;
  };
  return {
    async createInvoice(input: InvoiceInput): Promise<{invoice: TonInvoice; replayed: boolean}> {
      validateInvoice(input);
      const result = await batch([statement(`INSERT INTO ton_invoices
        (id,user_id,quote_id,item_ids_json,terms_revision,asset,network,recipient,jetton_master,amount_base_units,comment,created_at,expires_at,fx_quote_id,fx_snapshot_json,idempotency_key,input_digest)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`,
      input.id,input.userId,input.quoteId,JSON.stringify(input.itemIds),input.termsRevision,input.asset,input.network,input.recipient,input.jettonMaster,input.amountBaseUnits,input.comment,input.createdAt,input.expiresAt,input.fxQuoteId,JSON.stringify(input.fxSnapshot ?? {}),input.idempotencyKey,input.inputDigest)]);
      const row = await statement('SELECT * FROM ton_invoices WHERE user_id = ? AND idempotency_key = ?', input.userId,input.idempotencyKey).first<Row>();
      if (!row) throw new PaymentStoreError('INVOICE_CONFLICT');
      const stored = invoice(row);
      if (stored.inputDigest !== input.inputDigest) throw new PaymentStoreError('IDEMPOTENCY_CONFLICT');
      return {invoice: stored, replayed: result[0].meta?.changes !== 1};
    },
    async findOwnedInvoice(invoiceId: string,userId: string): Promise<TonInvoice | null> {
      if (!id(invoiceId) || !id(userId)) return null;
      const row = await statement('SELECT * FROM ton_invoices WHERE id = ? AND user_id = ?',invoiceId,userId).first<Row>();
      return row ? invoice(row) : null;
    },
    async findOwnedInvoiceByIdempotencyKey(userId: string,key: string): Promise<TonInvoice | null> {
      if (!id(userId) || !id(key)) return null;
      const row = await statement('SELECT * FROM ton_invoices WHERE user_id = ? AND idempotency_key = ?',userId,key).first<Row>();
      return row ? invoice(row) : null;
    },
    /** Internal verifier lookup only. Never expose this method directly through an anonymous API. */
    async findInvoiceByComment(value: string): Promise<TonInvoice | null> {
      if (!comment(value)) return null;
      const row = await statement('SELECT * FROM ton_invoices WHERE comment = ?',value).first<Row>();
      return row ? invoice(row) : null;
    },
    async recordVerifiedPayment(input: VerifiedPaymentInput): Promise<{invoice: TonInvoice; event: PaymentEvent; replayed: boolean}> {
      if (!id(input.eventKey) || typeof input.txIdentity !== 'string' || input.txIdentity.length > 512 || !/^[A-Za-z0-9:_-]+$/.test(input.txIdentity) || !input.txIdentity.startsWith(`${input.network}:`) || !id(input.invoiceId) || !asset(input.asset) || !network(input.network) || !address(input.recipient) || !comment(input.comment) || !amount(input.amountBaseUnits) || !time(input.transactionAt) || !time(input.observedAt) || input.transactionAt > input.observedAt || !digest(input.proofDigest)) throw new PaymentStoreError('INVALID_INPUT');
      const target = await find(input.invoiceId);
      if (!target) throw new PaymentStoreError('NOT_FOUND');
      if (target.asset !== input.asset || target.network !== input.network || target.recipient !== input.recipient || target.comment !== input.comment) throw new PaymentStoreError('PAYMENT_CONFLICT');
      const result = await batch([
        statement(`INSERT INTO ton_payment_events (event_key,tx_identity,invoice_id,asset,network,recipient,comment,amount_base_units,transaction_at,observed_at,proof_digest,outcome,reason)
          SELECT ?,?,id,asset,network,recipient,comment,?,?,?,?,
            CASE WHEN status IN ('pending','expired') AND amount_base_units = ? AND ? >= created_at AND ? < expires_at THEN 'paid' ELSE 'review' END,
            CASE WHEN status = 'paid' THEN 'already_paid' WHEN status = 'review' THEN 'already_review'
              WHEN ? < created_at THEN 'early' WHEN ? >= expires_at THEN 'late'
              WHEN amount_base_units = ? THEN 'exact'
              WHEN length(?) < length(amount_base_units) OR (length(?) = length(amount_base_units) AND ? < amount_base_units) THEN 'underpaid' ELSE 'overpaid' END
          FROM ton_invoices WHERE id = ? AND asset = ? AND network = ? AND recipient = ? AND comment = ? ON CONFLICT DO NOTHING`,
          input.eventKey,input.txIdentity,input.amountBaseUnits,input.transactionAt,input.observedAt,input.proofDigest,
          input.amountBaseUnits,input.transactionAt,input.transactionAt,input.transactionAt,input.transactionAt,input.amountBaseUnits,input.amountBaseUnits,input.amountBaseUnits,input.amountBaseUnits,
          input.invoiceId,input.asset,input.network,input.recipient,input.comment),
        statement(`UPDATE ton_invoices SET
          status = (SELECT outcome FROM ton_payment_events WHERE event_key = ?),
          paid_at = CASE WHEN (SELECT outcome FROM ton_payment_events WHERE event_key = ?) = 'paid' THEN ? ELSE NULL END,
          settlement_event_key = CASE WHEN (SELECT outcome FROM ton_payment_events WHERE event_key = ?) = 'paid' THEN ? ELSE NULL END,
          delivery_state = CASE WHEN (SELECT outcome FROM ton_payment_events WHERE event_key = ?) = 'paid' THEN 'pending' ELSE 'not_ready' END
          WHERE id = ? AND status IN ('pending','expired') AND EXISTS (SELECT 1 FROM ton_payment_events WHERE event_key = ? AND invoice_id = ? AND tx_identity = ? AND proof_digest = ?)`,
          input.eventKey,input.eventKey,input.transactionAt,input.eventKey,input.eventKey,input.eventKey,input.invoiceId,input.eventKey,input.invoiceId,input.txIdentity,input.proofDigest),
        statement(`INSERT INTO ton_payment_outbox (invoice_id,event_key,created_at)
          SELECT id,settlement_event_key,? FROM ton_invoices WHERE id = ? AND status = 'paid' AND settlement_event_key = ? AND EXISTS (SELECT 1 FROM ton_payment_events WHERE event_key = ? AND tx_identity = ? AND proof_digest = ?) ON CONFLICT DO NOTHING`,
          input.observedAt,input.invoiceId,input.eventKey,input.eventKey,input.txIdentity,input.proofDigest),
      ]);
      const rows = await statement('SELECT * FROM ton_payment_events WHERE event_key = ? OR tx_identity = ?',input.eventKey,input.txIdentity).all<Row>();
      if (rows.results.length !== 1) throw new PaymentStoreError('PAYMENT_CONFLICT');
      const event = payment(rows.results[0]);
      if (event.invoiceId !== input.invoiceId || event.txIdentity !== input.txIdentity || event.proofDigest !== input.proofDigest || event.asset !== input.asset || event.network !== input.network || event.recipient !== input.recipient || event.comment !== input.comment || event.amountBaseUnits !== input.amountBaseUnits || event.transactionAt !== input.transactionAt) throw new PaymentStoreError('PAYMENT_CONFLICT');
      const stored = await find(input.invoiceId);
      if (!stored) throw new PaymentStoreError('DATABASE_ERROR');
      return {invoice: stored,event,replayed: result[0].meta?.changes !== 1};
    },
    async receiveWebhook(input: WebhookReceipt): Promise<{replayed: boolean}> {
      if (!id(input.eventKey) || !digest(input.bodyDigest) || !time(input.receivedAt) || typeof input.reference !== 'string' || input.reference.length > 512 || !/^[A-Za-z0-9:_-]+$/.test(input.reference)) throw new PaymentStoreError('INVALID_INPUT');
      const result = await batch([statement('INSERT INTO ton_webhook_inbox (event_key,body_digest,received_at,reference) VALUES (?,?,?,?) ON CONFLICT DO NOTHING',input.eventKey,input.bodyDigest,input.receivedAt,input.reference)]);
      const row = await statement('SELECT * FROM ton_webhook_inbox WHERE event_key = ?',input.eventKey).first<Row>();
      if (!row || row.body_digest !== input.bodyDigest || row.reference !== input.reference) throw new PaymentStoreError('IDEMPOTENCY_CONFLICT');
      return {replayed: result[0].meta?.changes !== 1};
    },
    async listPendingWebhooks(limit = 100): Promise<WebhookReceipt[]> {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new PaymentStoreError('INVALID_INPUT');
      const rows = await statement("SELECT event_key,body_digest,received_at,reference FROM ton_webhook_inbox WHERE state = 'received' ORDER BY received_at,event_key LIMIT ?",limit).all<Row>();
      return rows.results.map(row=>({eventKey:String(row.event_key),bodyDigest:String(row.body_digest),receivedAt:Number(row.received_at),reference:String(row.reference)}));
    },
    /** Candidate selection is read-only. A worker must claim each candidate before processing it. */
    async listDueWebhooks(now:number,limit=25):Promise<WebhookReceipt[]> {
      if(!time(now)||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new PaymentStoreError('INVALID_INPUT');
      const rows=await statement("SELECT event_key,body_digest,received_at,reference FROM ton_webhook_inbox WHERE (state = 'received' AND next_attempt_at <= ?) OR (state = 'processing' AND lease_until <= ?) ORDER BY received_at,event_key LIMIT ?",now,now,limit).all<Row>();
      return rows.results.map(row=>({eventKey:String(row.event_key),bodyDigest:String(row.body_digest),receivedAt:Number(row.received_at),reference:String(row.reference)}));
    },
    async claimWebhook(receipt:WebhookReceipt,now:number):Promise<ClaimedWebhook|null> {
      if(!id(receipt.eventKey)||!digest(receipt.bodyDigest)||!time(now))throw new PaymentStoreError('INVALID_INPUT');
      // A crashed eighth attempt cannot acquire an unbounded sequence of leases.
      await batch([statement("UPDATE ton_webhook_inbox SET state='review',lease_until=NULL,lease_token=NULL,last_error='RETRY_EXHAUSTED' WHERE event_key=? AND body_digest=? AND attempts >= 8 AND ((state='received' AND next_attempt_at <= ?) OR (state='processing' AND lease_until <= ?))",receipt.eventKey,receipt.bodyDigest,now,now)]);
      const leaseToken=crypto.randomUUID();
      const result=await batch([statement("UPDATE ton_webhook_inbox SET state='processing',attempts=attempts+1,lease_until=?,lease_token=? WHERE event_key=? AND body_digest=? AND attempts < 8 AND ((state='received' AND next_attempt_at <= ?) OR (state='processing' AND lease_until <= ?))",now+60,leaseToken,receipt.eventKey,receipt.bodyDigest,now,now)]);
      if(result[0].meta?.changes!==1)return null;
      const row=await statement("SELECT * FROM ton_webhook_inbox WHERE event_key=? AND body_digest=? AND state='processing' AND lease_token=?",receipt.eventKey,receipt.bodyDigest,leaseToken).first<Row>();
      if(!row)return null;
      return {eventKey:String(row.event_key),bodyDigest:String(row.body_digest),receivedAt:Number(row.received_at),reference:String(row.reference),attempt:Number(row.attempts),leaseToken};
    },
    /** CAS prevents a slow, expired worker from overwriting a newer lease/result. */
    async finishWebhook(receipt:ClaimedWebhook,result:{outcome:'matched'|'unmatched'|'retry'|'review';code?:string},now:number):Promise<boolean> {
      if(!id(receipt.eventKey)||!digest(receipt.bodyDigest)||!id(receipt.leaseToken)||!Number.isSafeInteger(receipt.attempt)||receipt.attempt<1||receipt.attempt>8||!time(now)||!['matched','unmatched','retry','review'].includes(result.outcome)||result.code!==undefined&&!/^[A-Z_]{1,64}$/.test(result.code))throw new PaymentStoreError('INVALID_INPUT');
      const exhausted=receipt.attempt>=8;
      const state=result.outcome==='matched'||result.outcome==='unmatched'?'processed':result.outcome==='review'||exhausted?'review':'received';
      const next=state==='received'?now+Math.min(3600,60*2**(receipt.attempt-1)):0;
      const reason=result.outcome==='unmatched'?'UNMATCHED_TRANSFER':state==='review'&&exhausted?'RETRY_EXHAUSTED':result.code??null;
      const changed=await batch([statement("UPDATE ton_webhook_inbox SET state=?,next_attempt_at=?,lease_until=NULL,lease_token=NULL,last_error=? WHERE event_key=? AND body_digest=? AND state='processing' AND attempts=? AND lease_token=?",state,next,reason,receipt.eventKey,receipt.bodyDigest,receipt.attempt,receipt.leaseToken)]);
      return changed[0].meta?.changes===1;
    },
    async markWebhookProcessed(eventKey: string,bodyDigest: string): Promise<void> {
      if (!id(eventKey) || !digest(bodyDigest)) throw new PaymentStoreError('INVALID_INPUT');
      const result = await batch([statement("UPDATE ton_webhook_inbox SET state = 'processed',lease_until=NULL,lease_token=NULL WHERE event_key = ? AND body_digest = ?",eventKey,bodyDigest)]);
      if (result[0].meta?.changes !== 1) throw new PaymentStoreError('NOT_FOUND');
    },
  };
}
export type TonPaymentStore = ReturnType<typeof createTonPaymentStore>;
