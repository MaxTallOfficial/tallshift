import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pricingPlanScopes, pricingPlanTerms, pricingPlansCopy } from '../src/foundations/pricing-plans.ts';
const catalog=JSON.parse(readFileSync(new URL('../../docs/spec-v1.0/catalog.json',import.meta.url),'utf8'));
test('pricing routes preserve canonical offer IDs, unique contents and price hypotheses',()=>{
 for(const key of ['starter','product','bundle'] as const){
  const offer=catalog.products.find((entry:{id:string})=>entry.id===pricingPlanTerms[key].offerId);
  assert.ok(offer); assert.deepEqual([...pricingPlanScopes[key]].sort(),[...offer.item_ids].sort());
  assert.equal(new Set(pricingPlanScopes[key]).size,pricingPlanScopes[key].length);
  assert.equal(pricingPlanTerms[key].priceMinor,offer.price_hypothesis_usd*100);
  if(key!=='starter') assert.equal(offer.sale_state,'disabled');
 }
 assert.equal(pricingPlanScopes.starter.length,9);assert.equal(pricingPlanScopes.product.length,6);assert.equal(pricingPlanScopes.bundle.length,23);
});
test('localized comparisons describe the same three routes with no missing columns',()=>{
 for(const locale of ['en','ru','vi'] as const){
  const copy=pricingPlansCopy[locale]; assert.equal(copy.rows.length,5);
  for(const row of copy.rows){assert.equal(row.length,4);assert.ok(row.every(cell=>cell.trim()));}
  assert.ok(copy.recommendation);assert.ok(copy.hypothesis);assert.ok(copy.starterStatus);
 }
});
test('Product-first milestone proposes only the complete Product scope, without enabling current commerce',()=>{
 const phase=catalog.delivery_phases.find((entry:{id:string})=>entry.id==='P1.5');
 assert.equal(catalog.decisions.commerce_enabled,false);
 assert.equal(phase.status,'proposed-product-first');
 assert.deepEqual(phase.enabled_offer_ids,['PACK-PRODUCT']);
 assert.deepEqual([...phase.adds].sort(),[...pricingPlanScopes.product].sort());
 assert.equal(phase.unique_total,pricingPlanScopes.starter.length+pricingPlanScopes.product.length);
});
