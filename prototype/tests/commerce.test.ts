import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {D1Database} from '@cloudflare/workers-types';
import {createD1Fixture} from './helpers/ton-d1.ts';
import {createCommerceStore,CommerceError} from '../src/server/orders/store.ts';
import {createCommerceService,publishedPaidReleases} from '../src/server/orders/service.ts';
import {createCommerceHttpHandlers} from '../src/server/orders/http.ts';
import {createCommerceHost} from '../src/server/orders/host.ts';
import {createTonPaymentService} from '../src/server/payments/ton/service.ts';
import {pricingPlanScopes} from '../src/foundations/pricing-plans.ts';
import {issueCsrf} from '../src/server/auth/security.ts';
import {sessionCookie} from '../src/server/auth/engine.ts';
import {sha256} from '../src/server/auth/policy.ts';
function fixture(){
 const f=createD1Fixture();
 f.sqlite.exec(readFileSync(new URL('../migrations/0002_auth.sql',import.meta.url),'utf8'));
 f.sqlite.exec(readFileSync(new URL('../migrations/0003_commerce.sql',import.meta.url),'utf8'));
 for(const id of ['buyer','other'])f.sqlite.prepare('INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES(?,?,?,1,0,0)').run(id,id,`${id}@example.com`);
 const state={now:1000,enabled:true,ready:true,owned:[] as string[],paid:0,tax:0,terms:'terms-v1',taxRevision:'tax-v1',releases:Object.fromEntries(pricingPlanScopes.bundle.map(id=>[id,'a'.repeat(64)]))};
 const store=createCommerceStore(f.db);
 const deps={enabled:true,store,ownership:async()=>({itemIds:state.owned,productNetPaidMinor:state.paid}),readiness:async()=>({deliveryReady:state.ready,sellerTermsReady:state.ready,termsRevision:state.terms}),tax:async()=>({amountMinor:state.tax,revision:state.taxRevision}),releases:state.releases,now:()=>state.now};
 return {...f,state,store,deps,service:createCommerceService(deps)};
}
const isCode=(code:CommerceError['code'])=>(error:unknown)=>error instanceof CommerceError&&error.code===code;
test('server quote prices product, bundle upgrade and tax from authoritative ownership only',async()=>{
 const f=fixture();try{
  const product=await f.service.createQuote('buyer',{plan:'product',idempotencyKey:'p1'});assert.equal(product.amountMinor,1600);assert.equal(product.itemIds.length,6);assert.equal('releases' in product,false);
  f.state.owned=[...pricingPlanScopes.product];f.state.paid=1600;f.state.tax=120;
  const bundle=await f.service.createQuote('buyer',{plan:'bundle',idempotencyKey:'b1'});assert.equal(bundle.subtotalMinor,2300);assert.equal(bundle.amountMinor,2420);assert.equal(bundle.itemIds.length,17);
  const resolved=await f.service.resolveQuote(bundle.id,'buyer');assert.equal(resolved?.amountMinor,2420);assert.equal(await f.service.resolveQuote(bundle.id,'other'),null);
 }finally{f.sqlite.close();}
});
test('idempotent quote retry recovers exact original order; another plan conflicts; expiry never refreshes',async()=>{
 const f=fixture();try{
  const results=await Promise.all([f.service.createQuote('buyer',{plan:'product',idempotencyKey:'same'}),f.service.createQuote('buyer',{plan:'product',idempotencyKey:'same'})]);assert.deepEqual(results[0],results[1]);assert.equal(f.count('commerce_orders'),1);assert.equal(f.count('commerce_quotes'),1);
  await assert.rejects(()=>f.service.createQuote('buyer',{plan:'bundle',idempotencyKey:'same'}),isCode('IDEMPOTENCY_CONFLICT'));
  f.state.now=1900;assert.deepEqual(await f.service.createQuote('buyer',{plan:'product',idempotencyKey:'same'}),results[0]);await assert.rejects(()=>f.service.resolveQuote(results[0].id,'buyer'),isCode('QUOTE_EXPIRED'));
  assert.throws(()=>f.sqlite.prepare('UPDATE commerce_quotes SET total_minor=1').run(),/immutable commerce quote/);
 }finally{f.sqlite.close();}
});
test('disabled readiness, planned releases and changed ownership/terms/tax/releases all prevent invoices',async()=>{
 const f=fixture();try{
  assert.equal(Object.keys(publishedPaidReleases).length,0);
  const closed=createCommerceService({...f.deps,releases:publishedPaidReleases});await assert.rejects(()=>closed.createQuote('buyer',{plan:'product',idempotencyKey:'planned'}),isCode('OFFER_CHANGED'));assert.equal(f.count('commerce_orders'),0);
  f.state.ready=false;await assert.rejects(()=>f.service.createQuote('buyer',{plan:'product',idempotencyKey:'not-ready'}),isCode('COMMERCE_DISABLED'));f.state.ready=true;
  for(const change of [()=>{f.state.owned=['S004'];},()=>{f.state.terms='terms-v2';},()=>{f.state.tax=1;},()=>{f.state.taxRevision='tax-v2';},()=>{f.state.releases.S004='b'.repeat(64);}]){
   f.state.owned=[];f.state.terms='terms-v1';f.state.tax=0;f.state.taxRevision='tax-v1';f.state.releases.S004='a'.repeat(64);
   const q=await f.service.createQuote('buyer',{plan:'product',idempotencyKey:crypto.randomUUID()});change();await assert.rejects(()=>f.service.resolveQuote(q.id,'buyer'),isCode('OFFER_CHANGED'));
  }
 }finally{f.sqlite.close();}
});
test('TON invoice uses persisted quote and exact bigint amount; idempotency never changes asset or owner',async()=>{
 const f=fixture();try{
  const q=await f.service.createQuote('buyer',{plan:'product',idempotencyKey:'q'});
  const svc=createTonPaymentService({config:{enabled:true,network:'ton-testnet',recipient:'0:'+'a'.repeat(64),usdtMaster:'0:'+'b'.repeat(64)},store:createD1TonStore(f),resolveQuote:f.service.resolveQuote,exchangeRate:async asset=>({id:'fx',asset,usdPerUnit:asset==='TON'?'3':'0.999',source:'fixture',quotedAt:1000,expiresAt:1800}),isRecipientActive:async()=>true,readProof:async()=>{throw new Error('not used');},now:()=>f.state.now});
  const invoice=await svc.createInvoice('buyer',{quoteId:q.id,asset:'TON',idempotencyKey:'invoice'});assert.equal(invoice.amountBaseUnits,'5333333334');assert.equal(invoice.deliveryStatus,'not_ready');
  assert.deepEqual(await svc.createInvoice('buyer',{quoteId:q.id,asset:'TON',idempotencyKey:'invoice'}),invoice);
  await assert.rejects(()=>svc.createInvoice('buyer',{quoteId:q.id,asset:'USDT',idempotencyKey:'invoice'}),/IDEMPOTENCY_CONFLICT/);await assert.rejects(()=>svc.createInvoice('other',{quoteId:q.id,asset:'TON',idempotencyKey:'invoice'}),/NOT_FOUND/);
 }finally{f.sqlite.close();}
});
import {createTonPaymentStore} from '../src/server/payments/ton/store.ts';
const createD1TonStore=(f:ReturnType<typeof fixture>)=>createTonPaymentStore(f.db);
test('paid order requires exact settled owner invoice and never claims delivery or creates grants',async()=>{
 const f=fixture();try{
  const q=await f.service.createQuote('buyer',{plan:'product',idempotencyKey:'q'});
  assert.throws(()=>f.sqlite.prepare("UPDATE commerce_orders SET status='paid',paid_at=1100 WHERE id=?").run(q.orderId),/verified invoice required/);
  assert.equal(await f.store.ownedOrder(q.orderId,'other'),null);
  const input={id:'invoice',userId:'buyer',quoteId:q.id,itemIds:q.itemIds,termsRevision:q.termsRevision,asset:'USDT' as const,network:'ton-testnet' as const,recipient:'0:'+'a'.repeat(64),jettonMaster:'0:'+'b'.repeat(64),amountBaseUnits:'16000000',comment:'ts_'+'1'.repeat(32),createdAt:1000,expiresAt:1800,fxQuoteId:'fx',fxSnapshot:{usdMinor:q.amountMinor},idempotencyKey:'invoice',inputDigest:'c'.repeat(64)};
  const ton=createD1TonStore(f);await ton.createInvoice(input);
  const proof={eventKey:'event',txIdentity:'ton-testnet:tx',invoiceId:input.id,asset:input.asset,network:input.network,recipient:input.recipient,comment:input.comment,amountBaseUnits:input.amountBaseUnits,transactionAt:1100,observedAt:1101,proofDigest:'d'.repeat(64)};
  await ton.recordVerifiedPayment(proof);const order=await f.service.orderStatus('buyer',q.orderId);assert.equal(order.status,'paid');assert.equal(order.deliveryStatus,'not_ready');assert.deepEqual(await f.service.orderStatus('buyer',q.orderId),order);assert.equal(f.count('ton_payment_outbox'),1);
 }finally{f.sqlite.close();}
});
test('HTTP rejects client price/tax/ownership and owner-only reads never disclose other orders',async()=>{
 const f=fixture();try{
  const origin='https://tallshift.test';let userId:string|null='buyer',csrf=true,limit=true;
  const h=createCommerceHttpHandlers({service:f.service,mainOrigin:origin,authenticate:async()=>userId?{userId}:null,verifyCsrf:async()=>csrf,rateLimit:async()=>limit});
  const request=(body:unknown,customOrigin=origin)=>new Request(origin+'/api/commerce/quotes',{method:'POST',headers:{origin:customOrigin,'content-type':'application/json','idempotency-key':'quote'},body:JSON.stringify(body)});
  assert.equal((await h.quote(new Request(origin+'/api/commerce/quotes',{method:'POST',headers:{origin,'content-type':'application/json'},body:new Uint8Array([0xff])}))).status,400);
  assert.equal((await h.quote(request({plan:'product',amountMinor:1}))).status,400);assert.equal((await h.quote(request({plan:'product',ownership:[]}))).status,400);assert.equal((await h.quote(request({plan:'product'},'https://evil.test'))).status,403);
  csrf=false;assert.equal((await h.quote(request({plan:'product'}))).status,403);csrf=true;limit=false;assert.equal((await h.quote(request({plan:'product'}))).status,429);limit=true;userId=null;assert.equal((await h.quote(request({plan:'product'}))).status,401);userId='buyer';
  const response=await h.quote(request({plan:'product'}));assert.equal(response.status,201);const q=await response.json();assert.equal(q.amountMinor,1600);userId='other';assert.equal((await h.order(new Request(origin),q.orderId)).status,404);
 }finally{f.sqlite.close();}
});
test('real host uses primary D1 auth/CSRF and disabled paid registry even when both env flags are enabled',async()=>{
 const f=fixture();try{
  // Extend the SQL fixture's statements only with the D1 run() needed by authoritative session touch.
  const basePrepare=f.db.prepare.bind(f.db);let primaryCalls=0;
  const db={...f.db,prepare(sql:string){const decorate=(statement:ReturnType<typeof basePrepare>,args:unknown[]=[])=>Object.assign(statement,{bind:(...values:unknown[])=>decorate(basePrepare(sql).bind(...values),values),run:async()=>{const result=f.sqlite.prepare(sql).run(...args as never[]);return {success:true,meta:{changes:Number(result.changes)}};}});return decorate(basePrepare(sql));},withSession(mode:string){assert.equal(mode,'first-primary');primaryCalls++;return db;}} as unknown as D1Database;
  const origin='https://tallshift.test',secret='test-only-secret-at-least-32-characters',raw='test-session-token-with-enough-entropy',at=Date.now();f.sqlite.prepare('INSERT INTO auth_session VALUES(?,?,?,?,?,?,?,?,?)').run('session',await sha256(raw),'buyer',at+86400000,at,at,null,null,0);
  const host=createCommerceHost({DB:db,APP_URL:origin,AUTH_ENABLED:'true',AUTH_SECRET:secret,COMMERCE_ENABLED:'true',TON_PAYMENTS_ENABLED:'true'},{ownership:f.deps.ownership,readiness:f.deps.readiness,tax:f.deps.tax,exchangeRate:async()=>{throw new Error('must not fetch FX');}});
  const req=new Request(origin+'/api/commerce/quotes',{method:'POST',headers:{origin,'content-type':'application/json',cookie:`${sessionCookie}=${raw}`},body:'{"plan":"product"}'});
  assert.equal((await host.commerce.quote(req)).status,403);
  const issued=(await issueCsrf(req,origin,secret))!;const request=new Request(req,{headers:{origin,'content-type':'application/json','idempotency-key':'q',cookie:`${sessionCookie}=${raw}; ${issued.cookie.split(';')[0]}`,'x-csrf-token':issued.csrfToken}});
  const response=await host.commerce.quote(request);assert.equal(response.status,503);assert.equal((await response.json()).error.code,'COMMERCE_DISABLED');assert.ok(primaryCalls>0);assert.equal(f.count('commerce_orders'),0);
  f.sqlite.prepare('UPDATE auth_user SET auth_version=auth_version+1 WHERE id=?').run('buyer');assert.equal((await host.commerce.order(new Request(origin,{headers:{cookie:`${sessionCookie}=${raw}`}}),'unknown')).status,401);
 }finally{f.sqlite.close();}
});

test('quote and order insert roll back together if durable order creation fails',async()=>{
 const f=fixture();try{
  f.sqlite.exec("CREATE TRIGGER fail_order BEFORE INSERT ON commerce_orders BEGIN SELECT RAISE(ABORT,'fixture order failure'); END");
  await assert.rejects(()=>f.service.createQuote('buyer',{plan:'product',idempotencyKey:'atomic'}));assert.equal(f.count('commerce_quotes'),0);assert.equal(f.count('commerce_orders'),0);
  f.sqlite.exec('DROP TRIGGER fail_order');const q=await f.service.createQuote('buyer',{plan:'product',idempotencyKey:'atomic'});assert.ok(q.orderId);assert.equal(f.count('commerce_quotes'),1);assert.equal(f.count('commerce_orders'),1);
 }finally{f.sqlite.close();}
});
test('settled invoice with mismatched quote value cannot promote the order to paid',async()=>{
 const f=fixture();try{
  const q=await f.service.createQuote('buyer',{plan:'product',idempotencyKey:'q'}),ton=createD1TonStore(f);
  const input={id:'wrong-value',userId:'buyer',quoteId:q.id,itemIds:q.itemIds,termsRevision:q.termsRevision,asset:'TON' as const,network:'ton-testnet' as const,recipient:'0:'+'a'.repeat(64),jettonMaster:null,amountBaseUnits:'1',comment:'ts_'+'1'.repeat(32),createdAt:1000,expiresAt:1800,fxQuoteId:'fx',fxSnapshot:{usdMinor:1},idempotencyKey:'invoice',inputDigest:'c'.repeat(64)};
  await ton.createInvoice(input);await ton.recordVerifiedPayment({eventKey:'event',txIdentity:'ton-testnet:tx',invoiceId:input.id,asset:input.asset,network:input.network,recipient:input.recipient,comment:input.comment,amountBaseUnits:'1',transactionAt:1100,observedAt:1101,proofDigest:'d'.repeat(64)});
  await assert.rejects(()=>f.service.orderStatus('buyer',q.orderId),/verified invoice required/);assert.equal(f.sqlite.prepare('SELECT status FROM commerce_orders WHERE id=?').get(q.orderId)?.status,'pending');
 }finally{f.sqlite.close();}
});
test('one transaction identity cannot settle a second order under a different asset and owner',async()=>{
 const f=fixture();try{
  const ton=createD1TonStore(f);let index=0;
  for(const asset of ['TON','USDT'] as const){
   const userId=index?'other':'buyer',q=await f.service.createQuote(userId,{plan:'product',idempotencyKey:'q'});
   const input={id:'invoice-'+index,userId,quoteId:q.id,itemIds:q.itemIds,termsRevision:q.termsRevision,asset,network:'ton-testnet' as const,recipient:'0:'+'a'.repeat(64),jettonMaster:asset==='USDT'?'0:'+'b'.repeat(64):null,amountBaseUnits:'16000000',comment:'ts_'+String(index+1).repeat(32),createdAt:1000,expiresAt:1800,fxQuoteId:'fx',fxSnapshot:{usdMinor:q.amountMinor},idempotencyKey:'invoice',inputDigest:'c'.repeat(64)};
   await ton.createInvoice(input);const settle=()=>ton.recordVerifiedPayment({eventKey:'event-'+index,txIdentity:'ton-testnet:same-account:123:same-hash',invoiceId:input.id,asset,network:input.network,recipient:input.recipient,comment:input.comment,amountBaseUnits:input.amountBaseUnits,transactionAt:1100,observedAt:1101,proofDigest:'d'.repeat(64)});
   if(!index){await settle();assert.equal((await f.service.orderStatus(userId,q.orderId)).status,'paid');}else{await assert.rejects(settle,/PAYMENT_CONFLICT/);assert.equal((await f.service.orderStatus(userId,q.orderId)).status,'pending');}
   index++;
  }
  assert.equal(f.count('ton_payment_events'),1);assert.equal(f.count('ton_payment_outbox'),1);
 }finally{f.sqlite.close();}
});
