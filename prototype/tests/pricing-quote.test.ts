import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quotePricingPlan} from '../src/foundations/pricing-quote.ts';
import {pricingPlanScopes} from '../src/foundations/pricing-plans.ts';
test('new selections have exact minor-unit prices; ownership never manufactures paid checkout',()=>{
 assert.equal(quotePricingPlan('product').amountMinor,1600);
 assert.equal(quotePricingPlan('bundle').amountMinor,3900);
 const owned=quotePricingPlan('bundle',{itemIds:pricingPlanScopes.bundle,productNetPaidMinor:1600});
 assert.equal(owned.kind,'owned');assert.equal(owned.amountMinor,0);assert.deepEqual(owned.missingItemIds,[]);
 assert.equal(quotePricingPlan('starter').kind,'free');
});
test('Product upgrade chooses best eligible condition without stacking credits',()=>{
 const product={itemIds:pricingPlanScopes.product,productNetPaidMinor:1600};
 const q=quotePricingPlan('bundle',product);
 assert.equal(q.kind,'upgrade');assert.equal(q.amountMinor,2300);assert.equal(q.missingItemIds.length,17);
 assert.equal(quotePricingPlan('bundle',{...product,productNetPaidMinor:2900}).amountMinor,2300);
 assert.equal(quotePricingPlan('bundle',{...product,productNetPaidMinor:1000}).amountMinor,2883);
 // Ownership without an eligible paid receipt gets proportional ownership pricing only.
 assert.equal(quotePricingPlan('bundle',{itemIds:pricingPlanScopes.product}).amountMinor,2883);
});
test('adding owned materials cannot increase a quote or create a zero-cost grant for missing paid IDs',()=>{
 const owned:string[]=[...pricingPlanScopes.product];let previous=3900;
 for(const item of pricingPlanScopes.bundle){
  if(!owned.includes(item))owned.push(item);
  const q=quotePricingPlan('bundle',{itemIds:owned,productNetPaidMinor:1600});
  assert.ok(q.amountMinor<=previous);assert.ok(q.missingItemIds.length===0||q.amountMinor>0);
  previous=q.amountMinor;
 }
 assert.equal(previous,0);
 assert.throws(()=>quotePricingPlan('bundle',{itemIds:[],productNetPaidMinor:-1}),RangeError);
 assert.throws(()=>quotePricingPlan('bundle',{itemIds:[],productNetPaidMinor:1.5}),RangeError);
});
