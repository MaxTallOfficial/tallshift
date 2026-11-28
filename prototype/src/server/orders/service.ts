import type {PayableQuote} from '../payments/ton/service.ts';
import {CommerceError,type CommerceQuote,type createCommerceStore} from './store.ts';
import {currentReleaseHashes,paidReleaseRegistry} from '../delivery/releases.ts';
import {isPaidMonths,isSubscriptionPlan,levelEnd,otherLevelPaid,subscriptionPlanItems,upgradeTopUp,type AccessPeriod,type SubscriptionPlan,type UpgradeLine} from './subscription.ts';
/** Newest reviewed release per item, derived from the server registry (empty: all paid items planned). */
export const publishedPaidReleases:Readonly<Record<string,string>>=currentReleaseHashes(paidReleaseRegistry);
export interface CommerceDependencies {
 enabled:boolean;store:ReturnType<typeof createCommerceStore>;
 /** Authoritative access periods from the server ledger, never URL examples or browser storage. */
 periods:(userId:string)=>Promise<AccessPeriod[]>;
 /** Approved price in USDT minor units for a level and paid term; null when that term is not sold. */
 price:(plan:SubscriptionPlan,months:number)=>number|null;
 /** Hashes of reviewed, available private releases; empty by default in the real host. */
 releases:Readonly<Record<string,string>>;
 readiness:()=>Promise<{deliveryReady:boolean;sellerTermsReady:boolean;termsRevision:string}>;
 tax:(userId:string,subtotalMinor:number)=>Promise<{amountMinor:number;revision:string}>;
 /** Withdrawal journal: a revoked release is left out of new quotes until a safe replacement. */
 revokedReleases?:(hashes:readonly string[])=>Promise<ReadonlySet<string>>;
 now?:()=>number;
}
/** A paid term of a level ({plan, months}) or the switch from Product to «Всё» ({plan: 'all', upgrade: true}). */
export interface QuoteInput {plan:SubscriptionPlan;months?:number;upgrade?:boolean;idempotencyKey:string}
/** Lifetime of a quote; its invoice never outlives it. */
const quoteSeconds=900;
const identifier=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s);
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
export function createCommerceService(deps:CommerceDependencies){
 const now=deps.now??(()=>Math.floor(Date.now()/1000));
 /** Sales open for this level: approved readiness and at least one reviewed, unrevoked release. */
 async function opening(plan:SubscriptionPlan){
  if(!deps.enabled)throw new CommerceError('COMMERCE_DISABLED');
  const ready=await deps.readiness();
  if(!ready.deliveryReady||!ready.sellerTermsReady||!identifier(ready.termsRevision))throw new CommerceError('COMMERCE_DISABLED');
  // Nothing is sold before something can be delivered.
  const itemIds=[...subscriptionPlanItems[plan]],releases:Record<string,string>={};
  for(const id of itemIds){const release=deps.releases[id];if(release&&/^[a-f0-9]{64}$/.test(release))releases[id]=release;}
  if(deps.revokedReleases){const revoked=await deps.revokedReleases(Object.values(releases));for(const id of Object.keys(releases))if(revoked.has(releases[id]))delete releases[id];}
  if(!Object.keys(releases).length)throw new CommerceError('COMMERCE_DISABLED');
  return {itemIds,releases,termsRevision:ready.termsRevision};
 }
 async function taxed(userId:string,priceMinor:number){
  if(!Number.isSafeInteger(priceMinor)||priceMinor<=0||priceMinor>100000000)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
  const tax=await deps.tax(userId,priceMinor);
  if(!Number.isSafeInteger(tax.amountMinor)||tax.amountMinor<0||!identifier(tax.revision)||priceMinor+tax.amountMinor>100000000)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
  return tax;
 }
 async function offerTerm(userId:string,plan:SubscriptionPlan,months:number){
  const base=await opening(plan);
  const priceMinor=deps.price(plan,months);
  if(priceMinor===null)throw new CommerceError('TERM_UNAVAILABLE');
  const periods=await deps.periods(userId),at=now();
  // A new term of another level waits for the paid level to end; Product → «Всё» has its own upgrade.
  if(otherLevelPaid(periods,plan,at))throw new CommerceError('PLAN_CHANGE_UNAVAILABLE');
  const end=levelEnd(periods,plan),currentAccessEnd=end!==null&&end>at?end:null;
  return {...base,kind:'term' as const,months:months as number|null,priceMinor,currentAccessEnd,upgrade:null as UpgradeLine[]|null,tax:await taxed(userId,priceMinor)};
 }
 /** Product → «Всё» recalculated at `at`: the top-up is charged now, «Всё» lasts until the Product end. */
 async function offerUpgrade(userId:string,at:number){
  const base=await opening('all');
  const periods=await deps.periods(userId);
  // Already «Всё» (or a «Всё» term is queued): nothing to switch.
  if(otherLevelPaid(periods,'product',at))throw new CommerceError('PLAN_CHANGE_UNAVAILABLE');
  const upgrade=upgradeTopUp(periods,months=>{const price=deps.price('all',months);if(price===null)throw new CommerceError('TERM_UNAVAILABLE');return price;},at);
  // The Product access must outlast the quote and its invoice, so an on-time payment always lands before it ends.
  if(!upgrade||upgrade.topUpMinor<=0||upgrade.endsAt<=at+quoteSeconds)throw new CommerceError('PLAN_CHANGE_UNAVAILABLE');
  return {...base,kind:'upgrade' as const,months:null as number|null,priceMinor:upgrade.topUpMinor,currentAccessEnd:upgrade.endsAt as number|null,upgrade:upgrade.lines as UpgradeLine[]|null,tax:await taxed(userId,upgrade.topUpMinor)};
 }
 return {
  async createQuote(userId:string,input:QuoteInput){
   const upgrade=input.upgrade===true;
   if(!identifier(userId)||!identifier(input.idempotencyKey)||!isSubscriptionPlan(input.plan)||(upgrade?input.plan!=='all'||input.months!==undefined:input.upgrade!==undefined||!isPaidMonths(input.months)))throw new CommerceError('INVALID_INPUT');
   if(!deps.enabled)throw new CommerceError('COMMERCE_DISABLED');
   const inputDigest=await digest(upgrade?{plan:'all',upgrade:true}:{plan:input.plan,months:input.months});
   const old=await deps.store.byIdempotency(userId,input.idempotencyKey);
   if(old){if(old.inputDigest!==inputDigest)throw new CommerceError('IDEMPOTENCY_CONFLICT');return publicQuote(old,await deps.store.orderForQuote(old.id,userId));}
   // The quote time is the moment of an upgrade recalculation, so it can be re-checked exactly later.
   const at=now();
   const offered=upgrade?await offerUpgrade(userId,at):await offerTerm(userId,input.plan,input.months as number);
   const q=await deps.store.create({id:crypto.randomUUID(),userId,plan:input.plan,kind:offered.kind,months:offered.months,currency:'USDT',subtotalMinor:offered.priceMinor,taxMinor:offered.tax.amountMinor,totalMinor:offered.priceMinor+offered.tax.amountMinor,itemIds:offered.itemIds,releases:offered.releases,currentAccessEnd:offered.currentAccessEnd,upgrade:offered.upgrade,termsRevision:offered.termsRevision,taxRevision:offered.tax.revision,createdAt:at,expiresAt:at+quoteSeconds,idempotencyKey:input.idempotencyKey,inputDigest},crypto.randomUUID());
   return publicQuote(q,await deps.store.orderForQuote(q.id,userId));
  },
  async resolveQuote(id:string,userId:string):Promise<PayableQuote|null>{
   if(!identifier(id)||!identifier(userId))return null;
   const q=await deps.store.ownedQuote(id,userId);if(!q)return null;
   if(q.expiresAt<=now())throw new CommerceError('QUOTE_EXPIRED');
   let offered:Awaited<ReturnType<typeof offerTerm>>|Awaited<ReturnType<typeof offerUpgrade>>;
   try{offered=q.kind==='upgrade'?await offerUpgrade(userId,q.createdAt):await offerTerm(userId,q.plan,q.months as number);}catch(cause){
    // A withdrawn price or a level change in the meantime voids this quote.
    if(cause instanceof CommerceError&&(cause.code==='TERM_UNAVAILABLE'||cause.code==='PLAN_CHANGE_UNAVAILABLE'))throw new CommerceError('OFFER_CHANGED');
    throw cause;
   }
   if(offered.currentAccessEnd!==q.currentAccessEnd||offered.termsRevision!==q.termsRevision||offered.tax.revision!==q.taxRevision||offered.tax.amountMinor!==q.taxMinor||offered.priceMinor!==q.subtotalMinor||JSON.stringify(offered.itemIds)!==JSON.stringify(q.itemIds)||JSON.stringify(offered.releases)!==JSON.stringify(q.releases)||JSON.stringify(offered.upgrade)!==JSON.stringify(q.upgrade))throw new CommerceError('OFFER_CHANGED');
   // One open checkout per user and overlapping level: never let a second invoice charge in parallel.
   if(await deps.store.openCheckout(userId,q.id,q.itemIds,now()))throw new CommerceError('CHECKOUT_IN_PROGRESS');
   return {id:q.id,userId:q.userId,currency:'USDT',amountMinor:q.totalMinor,itemIds:q.itemIds,termsRevision:q.termsRevision,expiresAt:q.expiresAt,payable:true};
  },
  async orderStatus(userId:string,id:string){if(!identifier(userId)||!identifier(id))throw new CommerceError('NOT_FOUND');const order=await deps.store.ownedOrder(id,userId);if(!order)throw new CommerceError('NOT_FOUND');return order;},
 };
}
function publicQuote(q:CommerceQuote,order:{id:string}|null){
 if(!order)throw new CommerceError('TEMPORARILY_UNAVAILABLE');
 return {id:q.id,orderId:order.id,plan:q.plan,kind:q.kind,months:q.months,currency:q.currency,subtotalMinor:q.subtotalMinor,taxMinor:q.taxMinor,amountMinor:q.totalMinor,itemIds:q.itemIds,currentAccessEnd:q.currentAccessEnd,upgrade:q.upgrade,termsRevision:q.termsRevision,expiresAt:q.expiresAt};
}
