import { pricingPlanScopes, pricingPlanTerms } from './pricing-plans.ts';
export type PricingPlan = keyof typeof pricingPlanTerms;
/** Inputs must come from eligible server-side grants/receipts in production. */
export interface PricingOwnership { itemIds: readonly string[]; productNetPaidMinor?: number }
export function quotePricingPlan(plan:PricingPlan, ownership:PricingOwnership={itemIds:[]}) {
 const price=pricingPlanTerms[plan].priceMinor;
 const paid=ownership.productNetPaidMinor ?? 0;
 if(!Number.isSafeInteger(paid)||paid<0) throw new RangeError('Net payment must be nonnegative minor units');
 const sorted=[...pricingPlanScopes[plan]].sort(), owned=new Set(ownership.itemIds);
 const missing=sorted.filter(id=>!owned.has(id));
 if(plan==='starter') return {kind:'free' as const,amountMinor:0,currency:'USD' as const,missingItemIds:missing};
 if(!missing.length) return {kind:'owned' as const,amountMinor:0,currency:'USD' as const,missingItemIds:missing};
 const base=Math.floor(price/sorted.length),remainder=price%sorted.length;
 const partial=sorted.reduce((sum,id,index)=>sum+(owned.has(id)?0:base+(index<remainder?1:0)),0);
 // Best eligible offer, not stacked credits. The cap remains positive for missing IDs.
 const hasProduct=pricingPlanScopes.product.every(id=>owned.has(id));
 const upgrade=plan==='bundle'&&hasProduct&&paid>0 ? price-Math.min(paid,pricingPlanTerms.product.priceMinor) : price;
 const amount=Math.min(partial,upgrade);
 return {kind:upgrade<partial?'upgrade' as const:partial<price?'partial' as const:'purchase' as const,amountMinor:amount,currency:'USD' as const,missingItemIds:missing};
}
