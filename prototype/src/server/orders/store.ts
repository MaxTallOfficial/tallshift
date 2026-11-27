import type {D1DatabaseLike,D1StatementLike} from '../payments/ton/store.ts';
import {isPaidMonths,isSubscriptionPlan,type SubscriptionPlan,type UpgradeLine} from './subscription.ts';
/**
 * One purchase, priced in USDT minor units (1600 = 16 USDT): a paid term of a level ('term'), or
 * the switch from Product to «Всё» before the Product time ends ('upgrade', months = null).
 */
export interface CommerceQuote {
 id:string;userId:string;plan:SubscriptionPlan;kind:'term'|'upgrade';months:number|null;currency:'USDT';subtotalMinor:number;taxMinor:number;totalMinor:number;
 /** Items of the level when quoted (also the invoice's overlap key) and their published releases at that moment. */
 itemIds:string[];releases:Record<string,string>;
 /** Term: exclusive end of the same level's paid access when quoted (null: new subscription). Upgrade: end of the Product access that becomes «Всё». */
 currentAccessEnd:number|null;
 /** Upgrade only: the recalculation per remaining Product period; its top-ups sum to the subtotal. */
 upgrade:UpgradeLine[]|null;
 termsRevision:string;taxRevision:string;createdAt:number;expiresAt:number;idempotencyKey:string;inputDigest:string;
}
export class CommerceError extends Error {
 readonly code:'INVALID_INPUT'|'NOT_FOUND'|'IDEMPOTENCY_CONFLICT'|'OFFER_CHANGED'|'QUOTE_EXPIRED'|'COMMERCE_DISABLED'|'TEMPORARILY_UNAVAILABLE'|'CHECKOUT_IN_PROGRESS'|'TERM_UNAVAILABLE'|'PLAN_CHANGE_UNAVAILABLE';
 constructor(code:CommerceError['code']){super(code);this.code=code;}
}
const identifier=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s);
const hash=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const count=(n:unknown)=>Number.isSafeInteger(n);
function decode(row:Record<string,unknown>):CommerceQuote {
 return {id:String(row.id),userId:String(row.user_id),plan:row.plan as SubscriptionPlan,kind:row.kind as CommerceQuote['kind'],months:row.months==null?null:Number(row.months),currency:'USDT',subtotalMinor:Number(row.subtotal_minor),taxMinor:Number(row.tax_minor),totalMinor:Number(row.total_minor),itemIds:JSON.parse(String(row.item_ids_json)),releases:JSON.parse(String(row.release_snapshot_json)),currentAccessEnd:row.current_access_end==null?null:Number(row.current_access_end),upgrade:row.upgrade_snapshot_json==null?null:JSON.parse(String(row.upgrade_snapshot_json)),termsRevision:String(row.terms_revision),taxRevision:String(row.tax_revision),createdAt:Number(row.created_at),expiresAt:Number(row.expires_at),idempotencyKey:String(row.idempotency_key),inputDigest:String(row.input_digest)};
}
/** Shape of a term or an upgrade; amounts and dates are recomputed by the service, not trusted from here. */
function validShape(q:CommerceQuote){
 if(q.kind==='term')return isPaidMonths(q.months)&&q.upgrade===null;
 return q.kind==='upgrade'&&q.plan==='all'&&q.months===null&&q.currentAccessEnd!==null&&Array.isArray(q.upgrade)&&q.upgrade.length>=1&&q.upgrade.length<=24
  &&q.upgrade.every(line=>identifier(line.orderId)&&[line.startsAt,line.endsAt,line.remainingSeconds,line.paidMinor,line.allPriceMinor,line.topUpMinor].every(count)&&line.remainingSeconds>0&&line.endsAt<=q.currentAccessEnd!)
  &&q.upgrade.reduce((sum,line)=>sum+line.topUpMinor,0)===q.subtotalMinor;
}
export function createCommerceStore(db:D1DatabaseLike){
 const statement=(sql:string,...values:unknown[])=>db.prepare(sql).bind(...values);
 const batch=async(statements:D1StatementLike[])=>{const result=await db.batch(statements);if(result.length!==statements.length||result.some(r=>!r.success))throw new CommerceError('TEMPORARILY_UNAVAILABLE');};
 const ownedQuote=async(id:string,userId:string)=>{const row=await statement('SELECT * FROM commerce_quotes WHERE id=? AND user_id=?',id,userId).first<Record<string,unknown>>();return row?decode(row):null;};
 return {
  ownedQuote,
  async byIdempotency(userId:string,key:string){const row=await statement('SELECT * FROM commerce_quotes WHERE user_id=? AND idempotency_key=?',userId,key).first<Record<string,unknown>>();return row?decode(row):null;},
  async create(quote:CommerceQuote,orderId:string){
   const q=quote,released=Object.keys(q.releases);
   if(![q.id,q.userId,q.termsRevision,q.taxRevision,q.idempotencyKey,orderId].every(identifier)||!isSubscriptionPlan(q.plan)||!validShape(q)||q.currency!=='USDT'||!hash(q.inputDigest)||![q.subtotalMinor,q.taxMinor,q.totalMinor,q.createdAt,q.expiresAt].every(Number.isSafeInteger)||q.subtotalMinor<=0||q.taxMinor<0||q.totalMinor!==q.subtotalMinor+q.taxMinor||q.totalMinor>100000000||q.createdAt<0||q.expiresAt<=q.createdAt||q.expiresAt>q.createdAt+900||!q.itemIds.length||q.itemIds.length>32||new Set(q.itemIds).size!==q.itemIds.length||!q.itemIds.every(id=>/^[SCEA]\d{3}$/.test(id))||!released.length||!released.every(id=>q.itemIds.includes(id)&&hash(q.releases[id]))||(q.currentAccessEnd!==null&&(!Number.isSafeInteger(q.currentAccessEnd)||q.currentAccessEnd<=0)))throw new CommerceError('INVALID_INPUT');
   await batch([
    statement(`INSERT INTO commerce_quotes(id,user_id,plan,kind,months,currency,subtotal_minor,tax_minor,total_minor,item_ids_json,release_snapshot_json,current_access_end,upgrade_snapshot_json,terms_revision,tax_revision,created_at,expires_at,idempotency_key,input_digest) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`,q.id,q.userId,q.plan,q.kind,q.months,q.currency,q.subtotalMinor,q.taxMinor,q.totalMinor,JSON.stringify(q.itemIds),JSON.stringify(q.releases),q.currentAccessEnd,q.upgrade===null?null:JSON.stringify(q.upgrade),q.termsRevision,q.taxRevision,q.createdAt,q.expiresAt,q.idempotencyKey,q.inputDigest),
    statement(`INSERT INTO commerce_orders(id,user_id,quote_id,created_at) SELECT ?,user_id,id,created_at FROM commerce_quotes WHERE id=? AND user_id=? ON CONFLICT DO NOTHING`,orderId,q.id,q.userId),
   ]);
   const stored=await statement('SELECT * FROM commerce_quotes WHERE user_id=? AND idempotency_key=?',q.userId,q.idempotencyKey).first<Record<string,unknown>>();
   if(!stored)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
   const result=decode(stored);if(result.inputDigest!==q.inputDigest)throw new CommerceError('IDEMPOTENCY_CONFLICT');return result;
  },
  /** Read-only: GET never changes state. Paid is derived from the single invoice of the quote matching it exactly. */
  async ownedOrder(id:string,userId:string){
   const row=await statement(`SELECT o.id,o.quote_id,o.status,o.paid_at,o.created_at,q.plan,q.kind,q.months,q.total_minor,f.state AS fulfillment_state,rr.invoice_id AS review_refund,i.status AS invoice_status,i.paid_at AS invoice_paid_at,
     (i.status='paid' AND i.item_ids_json=q.item_ids_json AND i.terms_revision=q.terms_revision AND json_extract(i.fx_snapshot_json,'$.usdMinor')=q.total_minor) AS settled
     FROM commerce_orders o JOIN commerce_quotes q ON q.id=o.quote_id AND q.user_id=o.user_id
     LEFT JOIN ton_invoices i ON i.quote_id=o.quote_id AND i.user_id=o.user_id
     LEFT JOIN commerce_fulfillments f ON f.invoice_id=i.id
     LEFT JOIN commerce_review_refunds rr ON rr.invoice_id=i.id
     WHERE o.id=? AND o.user_id=?`,id,userId).first<Record<string,unknown>>();
   if(!row)return null;
   const settled=Number(row.settled)===1,paid=row.status==='paid'||settled;
   const status:'pending'|'paid'=paid?'paid':'pending';
   const paidAt=row.paid_at!==null?Number(row.paid_at):settled?Number(row.invoice_paid_at):null;
   // review: a settled or disputed payment that cannot be fulfilled automatically and needs support.
   // refunded: support sent back a payment that could not be fulfilled.
   const deliveryStatus=row.review_refund!=null?'refunded' as const:row.fulfillment_state==='fulfilled'?'fulfilled' as const:row.fulfillment_state==='review'||row.invoice_status==='review'||(row.invoice_status==='paid'&&!paid)?'review' as const:paid?'pending' as const:'not_ready' as const;
   return {id:String(row.id),quoteId:String(row.quote_id),plan:row.plan as SubscriptionPlan,kind:row.kind as CommerceQuote['kind'],months:row.months==null?null:Number(row.months),status,paidAt,createdAt:Number(row.created_at),amountMinor:Number(row.total_minor),currency:'USDT' as const,deliveryStatus};
  },
  /** True while another unexpired invoice, or a paid but undelivered one, covers any of these items (Product and «Всё» overlap). */
  async openCheckout(userId:string,quoteId:string,itemIds:readonly string[],now:number){
   const row=await statement(`SELECT 1 AS open FROM ton_invoices i WHERE i.user_id=? AND i.quote_id<>?
     AND ((i.status IN ('pending','expired') AND i.expires_at>?) OR (i.status='paid' AND i.delivery_state<>'delivered' AND NOT EXISTS (SELECT 1 FROM commerce_review_refunds r WHERE r.invoice_id=i.id)))
     AND EXISTS (SELECT 1 FROM json_each(i.item_ids_json) a WHERE a.value IN (SELECT value FROM json_each(?))) LIMIT 1`,userId,quoteId,now,JSON.stringify(itemIds)).first<Record<string,unknown>>();
   return Boolean(row);
  },
  async orderForQuote(quoteId:string,userId:string){return statement('SELECT id FROM commerce_orders WHERE quote_id=? AND user_id=?',quoteId,userId).first<{id:string}>();},
 };
}
