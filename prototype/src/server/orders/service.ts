import {quotePricingPlan,type PricingOwnership} from '../../foundations/pricing-quote.ts';
import {pricingPlanScopes} from '../../foundations/pricing-plans.ts';
import type {PayableQuote} from '../payments/ton/service.ts';
import {CommerceError,type CommerceQuote,type PaidPlan,type createCommerceStore} from './store.ts';
/** No paid release is published yet. This server registry must change only with reviewed immutable assets. */
export const publishedPaidReleases:Readonly<Record<string,string>>=Object.freeze({});
export interface CommerceDependencies {
 enabled:boolean;store:ReturnType<typeof createCommerceStore>;
 /** Authoritative grants/receipts, never URL examples or browser storage. */
 ownership:(userId:string)=>Promise<PricingOwnership>;
 /** Hashes of reviewed, available private releases; empty by default in the real host. */
 releases:Readonly<Record<string,string>>;
 readiness:()=>Promise<{deliveryReady:boolean;sellerTermsReady:boolean;termsRevision:string}>;
 tax:(userId:string,subtotalMinor:number)=>Promise<{amountMinor:number;revision:string}>;
 now?:()=>number;
}
const identifier=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s);
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
export function createCommerceService(deps:CommerceDependencies){
 const now=deps.now??(()=>Math.floor(Date.now()/1000));
 async function offer(userId:string,plan:PaidPlan){
  if(!deps.enabled)throw new CommerceError('COMMERCE_DISABLED');
  const ready=await deps.readiness();
  if(!ready.deliveryReady||!ready.sellerTermsReady||!identifier(ready.termsRevision))throw new CommerceError('COMMERCE_DISABLED');
  const ownership=await deps.ownership(userId);
  if(!Array.isArray(ownership.itemIds)||ownership.itemIds.length>32||ownership.itemIds.some(id=>typeof id!=='string'||!/^[SCEA]\d{3}$/.test(id))||new Set(ownership.itemIds).size!==ownership.itemIds.length)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
  const price=quotePricingPlan(plan,ownership);
  if(!price.amountMinor||!price.missingItemIds.length)throw new CommerceError('OFFER_CHANGED');
  // Planned items cannot become payable merely by switching environment flags.
  const releases:Record<string,string>={};
  for(const id of price.missingItemIds){const release=deps.releases[id];if(!release||!/^[a-f0-9]{64}$/.test(release))throw new CommerceError('OFFER_CHANGED');releases[id]=release;}
  const tax=await deps.tax(userId,price.amountMinor);
  if(!Number.isSafeInteger(tax.amountMinor)||tax.amountMinor<0||!identifier(tax.revision)||price.amountMinor+tax.amountMinor>100000000)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
  const ownershipDigest=await digest({itemIds:[...ownership.itemIds].sort(),productNetPaidMinor:ownership.productNetPaidMinor??0});
  return {price,releases,tax,termsRevision:ready.termsRevision,ownershipDigest};
 }
 return {
  async createQuote(userId:string,input:{plan:PaidPlan;idempotencyKey:string}){
   if(!identifier(userId)||!identifier(input.idempotencyKey)||!['product','bundle'].includes(input.plan))throw new CommerceError('INVALID_INPUT');
   if(!deps.enabled)throw new CommerceError('COMMERCE_DISABLED');
   const inputDigest=await digest({plan:input.plan});
   const old=await deps.store.byIdempotency(userId,input.idempotencyKey);
   if(old){if(old.inputDigest!==inputDigest)throw new CommerceError('IDEMPOTENCY_CONFLICT');return publicQuote(old,await deps.store.orderForQuote(old.id,userId));}
   const offered=await offer(userId,input.plan),at=now();
   const q=await deps.store.create({id:crypto.randomUUID(),userId,plan:input.plan,currency:'USD',subtotalMinor:offered.price.amountMinor,taxMinor:offered.tax.amountMinor,totalMinor:offered.price.amountMinor+offered.tax.amountMinor,itemIds:offered.price.missingItemIds,releases:offered.releases,ownershipDigest:offered.ownershipDigest,termsRevision:offered.termsRevision,taxRevision:offered.tax.revision,createdAt:at,expiresAt:at+900,idempotencyKey:input.idempotencyKey,inputDigest},crypto.randomUUID());
   return publicQuote(q,await deps.store.orderForQuote(q.id,userId));
  },
  async resolveQuote(id:string,userId:string):Promise<PayableQuote|null>{
   if(!identifier(id)||!identifier(userId))return null;
   const q=await deps.store.ownedQuote(id,userId);if(!q)return null;
   if(q.expiresAt<=now())throw new CommerceError('QUOTE_EXPIRED');
   const offered=await offer(userId,q.plan);
   if(offered.ownershipDigest!==q.ownershipDigest||offered.termsRevision!==q.termsRevision||offered.tax.revision!==q.taxRevision||offered.tax.amountMinor!==q.taxMinor||offered.price.amountMinor!==q.subtotalMinor||JSON.stringify(offered.price.missingItemIds)!==JSON.stringify(q.itemIds)||JSON.stringify(offered.releases)!==JSON.stringify(q.releases))throw new CommerceError('OFFER_CHANGED');
   return {id:q.id,userId:q.userId,currency:'USD',amountMinor:q.totalMinor,itemIds:q.itemIds,termsRevision:q.termsRevision,expiresAt:q.expiresAt,payable:true};
  },
  async orderStatus(userId:string,id:string){if(!identifier(userId)||!identifier(id))throw new CommerceError('NOT_FOUND');const order=await deps.store.ownedOrder(id,userId);if(!order)throw new CommerceError('NOT_FOUND');return order;},
 };
}
function publicQuote(q:CommerceQuote,order:{id:string}|null){
 if(!order)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
 return {id:q.id,orderId:order.id,plan:q.plan,currency:q.currency,subtotalMinor:q.subtotalMinor,taxMinor:q.taxMinor,amountMinor:q.totalMinor,itemIds:q.itemIds,termsRevision:q.termsRevision,expiresAt:q.expiresAt};
}
// Exporting the scope prevents a separate server/client offer-ID mapping from drifting.
export const paidPlanScopes={product:pricingPlanScopes.product,bundle:pricingPlanScopes.bundle} as const;
