import type {D1DatabaseLike,D1StatementLike} from '../payments/ton/store.ts';
export type PaidPlan='product'|'bundle';
export interface CommerceQuote {
 id:string;userId:string;plan:PaidPlan;currency:'USD';subtotalMinor:number;taxMinor:number;totalMinor:number;
 itemIds:string[];releases:Record<string,string>;ownershipDigest:string;termsRevision:string;taxRevision:string;
 createdAt:number;expiresAt:number;idempotencyKey:string;inputDigest:string;
 /** Applied price rule and the Product order whose receipt enabled an upgrade (audit, pricing contract section 4). */
 pricingKind:'purchase'|'partial'|'upgrade'|null;upgradeBasisOrderId:string|null;
}
export class CommerceError extends Error {
 readonly code:'INVALID_INPUT'|'NOT_FOUND'|'IDEMPOTENCY_CONFLICT'|'OFFER_CHANGED'|'QUOTE_EXPIRED'|'COMMERCE_DISABLED'|'TEMPORARILY_UNAVAILABLE'|'CHECKOUT_IN_PROGRESS';
 constructor(code:CommerceError['code']){super(code);this.code=code;}
}
const identifier=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s);
const hash=(s:string)=>/^[a-f0-9]{64}$/.test(s);
function decode(row:Record<string,unknown>):CommerceQuote {
 return {id:String(row.id),userId:String(row.user_id),plan:row.plan as PaidPlan,currency:'USD',subtotalMinor:Number(row.subtotal_minor),taxMinor:Number(row.tax_minor),totalMinor:Number(row.total_minor),itemIds:JSON.parse(String(row.item_ids_json)),releases:JSON.parse(String(row.release_snapshot_json)),ownershipDigest:String(row.ownership_digest),termsRevision:String(row.terms_revision),taxRevision:String(row.tax_revision),createdAt:Number(row.created_at),expiresAt:Number(row.expires_at),idempotencyKey:String(row.idempotency_key),inputDigest:String(row.input_digest),pricingKind:(row.pricing_kind??null) as CommerceQuote['pricingKind'],upgradeBasisOrderId:row.upgrade_basis_order_id==null?null:String(row.upgrade_basis_order_id)};
}
export function createCommerceStore(db:D1DatabaseLike){
 const statement=(sql:string,...values:unknown[])=>db.prepare(sql).bind(...values);
 const batch=async(statements:D1StatementLike[])=>{const result=await db.batch(statements);if(result.length!==statements.length||result.some(r=>!r.success))throw new CommerceError('TEMPORARILY_UNAVAILABLE');};
 const ownedQuote=async(id:string,userId:string)=>{const row=await statement('SELECT * FROM commerce_quotes WHERE id=? AND user_id=?',id,userId).first<Record<string,unknown>>();return row?decode(row):null;};
 return {
  ownedQuote,
  async byIdempotency(userId:string,key:string){const row=await statement('SELECT * FROM commerce_quotes WHERE user_id=? AND idempotency_key=?',userId,key).first<Record<string,unknown>>();return row?decode(row):null;},
  async create(quote:CommerceQuote,orderId:string){
   const q=quote;
   if(![q.id,q.userId,q.termsRevision,q.taxRevision,q.idempotencyKey,orderId].every(identifier)||!['product','bundle'].includes(q.plan)||q.currency!=='USD'||!hash(q.inputDigest)||!hash(q.ownershipDigest)||![q.subtotalMinor,q.taxMinor,q.totalMinor,q.createdAt,q.expiresAt].every(Number.isSafeInteger)||q.subtotalMinor<=0||q.taxMinor<0||q.totalMinor!==q.subtotalMinor+q.taxMinor||q.totalMinor>100000000||q.createdAt<0||q.expiresAt<=q.createdAt||q.expiresAt>q.createdAt+900||!q.itemIds.length||q.itemIds.length>32||new Set(q.itemIds).size!==q.itemIds.length||!q.itemIds.every(id=>/^[SCEA]\d{3}$/.test(id)&&hash(q.releases[id]))||Object.keys(q.releases).length!==q.itemIds.length||!['purchase','partial','upgrade'].includes(String(q.pricingKind))||(q.upgradeBasisOrderId!==null&&!identifier(q.upgradeBasisOrderId)))throw new CommerceError('INVALID_INPUT');
   await batch([
    statement(`INSERT INTO commerce_quotes(id,user_id,plan,currency,subtotal_minor,tax_minor,total_minor,item_ids_json,release_snapshot_json,ownership_digest,terms_revision,tax_revision,created_at,expires_at,idempotency_key,input_digest,pricing_kind,upgrade_basis_order_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`,q.id,q.userId,q.plan,q.currency,q.subtotalMinor,q.taxMinor,q.totalMinor,JSON.stringify(q.itemIds),JSON.stringify(q.releases),q.ownershipDigest,q.termsRevision,q.taxRevision,q.createdAt,q.expiresAt,q.idempotencyKey,q.inputDigest,q.pricingKind,q.upgradeBasisOrderId),
    statement(`INSERT INTO commerce_orders(id,user_id,quote_id,created_at) SELECT ?,user_id,id,created_at FROM commerce_quotes WHERE id=? AND user_id=? ON CONFLICT DO NOTHING`,orderId,q.id,q.userId),
   ]);
   const stored=await statement('SELECT * FROM commerce_quotes WHERE user_id=? AND idempotency_key=?',q.userId,q.idempotencyKey).first<Record<string,unknown>>();
   if(!stored)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
   const result=decode(stored);if(result.inputDigest!==q.inputDigest)throw new CommerceError('IDEMPOTENCY_CONFLICT');return result;
  },
  /** Read-only: GET never changes state. Paid is derived from the single invoice of the quote matching it exactly. */
  async ownedOrder(id:string,userId:string){
   const row=await statement(`SELECT o.id,o.quote_id,o.status,o.paid_at,o.created_at,q.total_minor,q.currency,f.state AS fulfillment_state,i.status AS invoice_status,i.paid_at AS invoice_paid_at,
     (i.status='paid' AND i.item_ids_json=q.item_ids_json AND i.terms_revision=q.terms_revision AND json_extract(i.fx_snapshot_json,'$.usdMinor')=q.total_minor) AS settled
     FROM commerce_orders o JOIN commerce_quotes q ON q.id=o.quote_id AND q.user_id=o.user_id
     LEFT JOIN ton_invoices i ON i.quote_id=o.quote_id AND i.user_id=o.user_id
     LEFT JOIN commerce_fulfillments f ON f.invoice_id=i.id
     WHERE o.id=? AND o.user_id=?`,id,userId).first<Record<string,unknown>>();
   if(!row)return null;
   const settled=Number(row.settled)===1,paid=row.status==='paid'||settled;
   const status:'pending'|'paid'=paid?'paid':'pending';
   const paidAt=row.paid_at!==null?Number(row.paid_at):settled?Number(row.invoice_paid_at):null;
   // review: a settled or disputed payment that cannot be fulfilled automatically and needs support.
   const deliveryStatus=row.fulfillment_state==='fulfilled'?'fulfilled' as const:row.fulfillment_state==='review'||row.invoice_status==='review'||(row.invoice_status==='paid'&&!paid)?'review' as const:paid?'pending' as const:'not_ready' as const;
   return {id:String(row.id),quoteId:String(row.quote_id),status,paidAt,createdAt:Number(row.created_at),amountMinor:Number(row.total_minor),currency:'USD' as const,deliveryStatus};
  },
  /** True while another unexpired invoice, or a paid but undelivered one, covers any of these items. */
  async openCheckout(userId:string,quoteId:string,itemIds:readonly string[],now:number){
   const row=await statement(`SELECT 1 AS open FROM ton_invoices i WHERE i.user_id=? AND i.quote_id<>?
     AND ((i.status IN ('pending','expired') AND i.expires_at>?) OR (i.status='paid' AND i.delivery_state<>'delivered'))
     AND EXISTS (SELECT 1 FROM json_each(i.item_ids_json) a WHERE a.value IN (SELECT value FROM json_each(?))) LIMIT 1`,userId,quoteId,now,JSON.stringify(itemIds)).first<Record<string,unknown>>();
   return Boolean(row);
  },
  async orderForQuote(quoteId:string,userId:string){return statement('SELECT id FROM commerce_orders WHERE quote_id=? AND user_id=?',quoteId,userId).first<{id:string}>();},
 };
}
