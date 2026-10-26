import assert from 'node:assert/strict';
import test from 'node:test';
import { colorDraftState, canExportConfiguration } from '../src/foundations/workbench-state.ts';
import { deriveAccessState, summarizeCoverage, type AccessSnapshot } from '../src/foundations/access-model.ts';
import { pricingPlanScopes } from '../src/foundations/pricing-plans.ts';
import { quotePricingPlan } from '../src/foundations/pricing-quote.ts';

test('export rejects an invalid or unapplied draft and permits an equivalent short HEX', () => {
 assert.equal(colorDraftState('#zzz','#EBD183'),'invalid');
 assert.equal(colorDraftState('#abc','#EBD183'),'pending');
 assert.equal(colorDraftState(' #AbC ','#AABBCC'),'applied');
 assert.equal(canExportConfiguration(['applied','pending']),false);
 assert.equal(canExportConfiguration(['applied','invalid']),false);
 assert.equal(canExportConfiguration(['applied','applied']),true);
});
const snapshot: AccessSnapshot = {verification:'verified',requestedItemIds:pricingPlanScopes.bundle,ownedItemIds:pricingPlanScopes.product,delivery:'available'};
test('unverified ownership cannot permit buying again or downloading', () => {
 for (const verification of ['loading','error'] as const) {
  const state=deriveAccessState({...snapshot,verification});
  assert.equal(state.canPurchase,false);assert.equal(state.canDownload,false);assert.equal(state.ownedCount,null);
  assert.deepEqual(state.ownedItemIds,[]);assert.deepEqual(state.missingItemIds,[]);
 }
});
test('payment received but access pending is distinct from pending payment, with no second purchase', () => {
 assert.equal(deriveAccessState({...snapshot,ownedItemIds:[],order:'pending'}).kind,'pending');
 const state=deriveAccessState({...snapshot,ownedItemIds:[],order:'paid-awaiting-access'});
 assert.equal(state.kind,'provisioning');assert.equal(state.canPurchase,false);assert.equal(state.canDownload,false);
});
test('refund after upgrade preserves exactly the 17 separately bought materials', () => {
 const retained=pricingPlanScopes.bundle.filter(id=>!pricingPlanScopes.product.includes(id));
 const state=deriveAccessState({...snapshot,ownedItemIds:retained});
 assert.equal(state.kind,'partial');assert.equal(state.ownedCount,17);assert.equal(state.totalCount,23);
 assert.deepEqual([...state.missingItemIds].sort(),[...pricingPlanScopes.product].sort());
 assert.equal(state.canDownload,true);
 assert.equal(quotePricingPlan('bundle',{itemIds:retained}).missingItemIds.length,6);
});
test('expired updates and failed delivery do not revoke ownership or create a buy-again action', () => {
 const full={...snapshot,ownedItemIds:pricingPlanScopes.bundle};
 const expired=deriveAccessState({...full,updates:'expired'});
 assert.equal(expired.kind,'updates-expired');assert.equal(expired.canDownload,true);assert.equal(expired.canPurchase,false);
 const failed=deriveAccessState({...full,delivery:'unavailable'});
 assert.equal(failed.kind,'delivery-error');assert.equal(failed.ownedCount,23);assert.equal(failed.canPurchase,false);assert.equal(failed.canDownload,false);
});
test('coverage is per owned material, takes the latest valid grant and never renews on upgrade', () => {
 const before=JSON.stringify(snapshot);
 const coverage=summarizeCoverage(['A','B','C','D'],['A','B','C'],[
  {itemIds:['A','B'],functionalUpdatesUntil:'2026-01-31'},
  {itemIds:['B','D'],functionalUpdatesUntil:'2027-10-31'},
 ],new Date('2026-10-26T00:00:00Z'));
 assert.deepEqual(coverage.groups,[{date:'2026-01-31',itemIds:['A'],expired:true},{date:'2027-10-31',itemIds:['B'],expired:false}]);
 assert.deepEqual(coverage.unknownItemIds,['C']);assert.equal(JSON.stringify(snapshot),before);
 assert.throws(()=>summarizeCoverage(['A'],['A'],[{itemIds:['A'],functionalUpdatesUntil:'2026-02-30'}]),RangeError);
});
