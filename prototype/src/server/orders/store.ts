import type {D1DatabaseLike,D1StatementLike} from '../payments/ton/store.ts';
export type PaidPlan='product'|'bundle';
export interface CommerceQuote {
 id:string;userId:string;plan:PaidPlan;currency:'USD';subtotalMinor:number;taxMinor:number;totalMinor:number;
 itemIds:string[];releases:Record<string,string>;ownershipDigest:string;termsRevision:string;taxRevision:string;
 createdAt:number;expiresAt:number;idempotencyKey:string;inputDigest:string;
}
export class CommerceError extends Error {
 readonly code:'INVALID_INPUT'|'NOT_FOUND'|'IDEMPOTENCY_CONFLICT'|'OFFER_CHANGED'|'QUOTE_EXPIRED'|'COMMERCE_DISABLED'|'TEMPORARILY_UNAVAILABLE';
 constructor(code:CommerceError['code']){super(code);this.code=code;}
}
const identifier=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s);
const hash=(s:string)=>/^[a-f0-9]{64}$/.test(s);
function decode(row:Record<string,unknown>):CommerceQuote {
 return {id:String(row.id),userId:String(row.user_id),plan:row.plan as PaidPlan,currency:'USD',subtotalMinor:Number(row.subtotal_minor),taxMinor:Number(row.tax_minor),totalMinor:Number(row.total_minor),itemIds:JSON.parse(String(row.item_ids_json)),releases:JSON.parse(String(row.release_snapshot_json)),ownershipDigest:String(row.ownership_digest),termsRevision:String(row.terms_revision),taxRevision:String(row.tax_revision),createdAt:Number(row.created_at),expiresAt:Number(row.expires_at),idempotencyKey:String(row.idempotency_key),inputDigest:String(row.input_digest)};
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
   if(![q.id,q.userId,q.termsRevision,q.taxRevision,q.idempotencyKey,orderId].every(identifier)||!['product','bundle'].includes(q.plan)||q.currency!=='USD'||!hash(q.inputDigest)||!hash(q.ownershipDigest)||![q.subtotalMinor,q.taxMinor,q.totalMinor,q.createdAt,q.expiresAt].every(Number.isSafeInteger)||q.subtotalMinor<=0||q.taxMinor<0||q.totalMinor!==q.subtotalMinor+q.taxMinor||q.totalMinor>100000000||q.createdAt<0||q.expiresAt<=q.createdAt||q.expiresAt>q.createdAt+900||!q.itemIds.length||q.itemIds.length>32||new Set(q.itemIds).size!==q.itemIds.length||!q.itemIds.every(id=>/^[SCEA]\d{3}$/.test(id)&&hash(q.releases[id]))||Object.keys(q.releases).length!==q.itemIds.length)throw new CommerceError('INVALID_INPUT');
   await batch([
    statement(`INSERT INTO commerce_quotes(id,user_id,plan,currency,subtotal_minor,tax_minor,total_minor,item_ids_json,release_snapshot_json,ownership_digest,terms_revision,tax_revision,created_at,expires_at,idempotency_key,input_digest) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`,q.id,q.userId,q.plan,q.currency,q.subtotalMinor,q.taxMinor,q.totalMinor,JSON.stringify(q.itemIds),JSON.stringify(q.releases),q.ownershipDigest,q.termsRevision,q.taxRevision,q.createdAt,q.expiresAt,q.idempotencyKey,q.inputDigest),
    statement(`INSERT INTO commerce_orders(id,user_id,quote_id,created_at) SELECT ?,user_id,id,created_at FROM commerce_quotes WHERE id=? AND user_id=? ON CONFLICT DO NOTHING`,orderId,q.id,q.userId),
   ]);
   const stored=await statement('SELECT * FROM commerce_quotes WHERE user_id=? AND idempotency_key=?',q.userId,q.idempotencyKey).first<Record<string,unknown>>();
   if(!stored)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
   const result=decode(stored);if(result.inputDigest!==q.inputDigest)throw new CommerceError('IDEMPOTENCY_CONFLICT');return result;
  },
  async ownedOrder(id:string,userId:string){
   // Paid status is derived only from a settled invoice; no client/worker flag can claim fulfillment.
   await batch([statement(`UPDATE commerce_orders SET status='paid',paid_at=(SELECT i.paid_at FROM ton_invoices i WHERE i.quote_id=commerce_orders.quote_id AND i.user_id=commerce_orders.user_id AND i.status='paid') WHERE id=? AND user_id=? AND status='pending' AND EXISTS(SELECT 1 FROM ton_invoices i WHERE i.quote_id=commerce_orders.quote_id AND i.user_id=commerce_orders.user_id AND i.status='paid')`,id,userId)]);
   const row=await statement(`SELECT o.id,o.quote_id,o.status,o.paid_at,o.created_at,q.total_minor,q.currency FROM commerce_orders o JOIN commerce_quotes q ON q.id=o.quote_id AND q.user_id=o.user_id WHERE o.id=? AND o.user_id=?`,id,userId).first<Record<string,unknown>>();
   return row?{id:String(row.id),quoteId:String(row.quote_id),status:row.status as 'pending'|'paid',paidAt:row.paid_at===null?null:Number(row.paid_at),createdAt:Number(row.created_at),amountMinor:Number(row.total_minor),currency:'USD' as const,deliveryStatus:'not_ready' as const}:null;
  },
  async orderForQuote(quoteId:string,userId:string){return statement('SELECT id FROM commerce_orders WHERE quote_id=? AND user_id=?',quoteId,userId).first<{id:string}>();},
 };
}
