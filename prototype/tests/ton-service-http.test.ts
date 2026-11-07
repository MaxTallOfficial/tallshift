import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPaymentFixture,testRecipient,testMaster,testSource} from './helpers/ton-d1.ts';
import {createTonPaymentService,TonPaymentError,type PublicTonInvoice} from '../src/server/payments/ton/service.ts';
import {createTonHttpHandlers} from '../src/server/payments/ton/http.ts';
import type {TonChainProof} from '../src/server/payments/ton/verification.ts';

const transactionHash='1'.repeat(64),origin='https://tallshift.example',secret='synthetic-webhook-secret-32-characters';
function proof(invoice:PublicTonInvoice,patch:Partial<TonChainProof>={}):TonChainProof {
  const jettonWallet=`0:${'d'.repeat(64)}`;
  return {asset:invoice.asset,network:invoice.network,account:testRecipient,transactionHash,lt:'1001',transactionAt:1001,successful:true,aborted:false,finalized:true,masterchainSeqno:100,outgoingMessageCount:0,
    incoming:{source:invoice.asset==='TON'?testSource:jettonWallet,destination:testRecipient,amountBaseUnits:invoice.amountBaseUnits,comment:invoice.comment,bounced:false},
    ...(invoice.asset==='USDT'?{jetton:{master:testMaster,owner:testRecipient,wallet:jettonWallet,derivedWallet:jettonWallet,notificationSender:jettonWallet,notificationOpcode:'0x7362d09c',credited:true,creditTransactionHash:'2'.repeat(64)}}:{}),...patch};
}
const create=(f:ReturnType<typeof createPaymentFixture>,asset:'TON'|'USDT'='TON')=>f.service.createInvoice('buyer-1',{quoteId:'quote-1',asset,idempotencyKey:'checkout-1'});
const code=(value:TonPaymentError['code'])=>(error:unknown)=>error instanceof TonPaymentError&&error.code===value;
function httpFixture() {
  const f=createPaymentFixture();
  const auth={userId:'buyer-1' as string|null,csrf:true,rate:true};
  const handlers=createTonHttpHandlers({...f.deps,service:f.service,mainOrigin:origin,webhookSecret:secret,
    authenticate:async()=>auth.userId?{userId:auth.userId}:null,verifyCsrf:async()=>auth.csrf,rateLimit:async()=>auth.rate});
  const request=(value:unknown={quoteId:'quote-1',asset:'TON'},headers:Record<string,string>={})=>new Request(`${origin}/api/v1/ton/invoices`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':'checkout-1',...headers},body:JSON.stringify(value)});
  const webhook=(patch:Record<string,unknown>={},headers:Record<string,string>={})=>new Request(`${origin}/api/v1/ton/webhook`,{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json',...headers},body:JSON.stringify({event_type:'account_tx',account_id:testRecipient,lt:'1001',tx_hash:transactionHash,...patch})});
  return {...f,auth,handlers,request,webhook};
}

test('service creates native or USDT invoice solely from server quote and stores immutable FX/terms/recipient snapshot',async()=>{
  for(const asset of ['TON','USDT'] as const){const f=createPaymentFixture();try{
    const invoice=await create(f,asset);assert.equal(invoice.asset,asset);assert.equal(invoice.paymentStatus,'pending');assert.equal(invoice.deliveryStatus,'not_ready');
    assert.equal(invoice.amountBaseUnits,asset==='TON'?'5333333334':'16016017');assert.equal(invoice.expiresAt,1700);assert.match(invoice.comment,/^ts_[a-f0-9]{32}$/);
    const stored=await f.store.findOwnedInvoice(invoice.id,'buyer-1');assert.equal(stored?.recipient,testRecipient);assert.equal(stored?.jettonMaster,asset==='USDT'?testMaster:null);
    assert.equal(stored?.termsRevision,'terms-1');assert.deepEqual(stored?.itemIds,['S004','C003']);assert.equal(stored?.fxSnapshot?.usdMinor,1600);
    assert.ok(!('userId' in invoice));assert.ok(!('fxSnapshot' in invoice));assert.ok(!('itemIds' in invoice));
  }finally{f.sqlite.close();}}
});
test('disabled sales and inactive recipient block new invoices before FX/provider or database writes',async()=>{
  const f=createPaymentFixture();try{
    f.config.enabled=false;await assert.rejects(create(f),code('COMMERCE_DISABLED'));assert.equal(f.calls.recipient,0);
    f.config.enabled=true;f.state.recipientActive=false;await assert.rejects(create(f),code('COMMERCE_DISABLED'));
    assert.equal(f.calls.rate,0);assert.equal(f.count('ton_invoices'),0);
  }finally{f.sqlite.close();}
});
test('idempotent retry returns original invoice after quote/rate expiry without requoting; changed payload conflicts',async()=>{
  const f=createPaymentFixture();try{
    const first=await create(f);f.state.now=2000;f.state.failRate=true;f.state.quote=null;
    const retry=await create(f);assert.equal(retry.id,first.id);assert.equal(retry.paymentStatus,'expired');assert.equal(f.calls.quote,1);assert.equal(f.calls.rate,1);
    await assert.rejects(create(f,'USDT'),code('IDEMPOTENCY_CONFLICT'));assert.equal(f.count('ton_invoices'),1);
  }finally{f.sqlite.close();}
});
test('expired, wrong-owner, nonpayable quote and FX changes never create a payment request',async()=>{
  for(const mode of ['expired','owner','nonpayable','rateAsset','rateStale'] as const){const f=createPaymentFixture();try{
    if(mode==='expired')f.state.quote!.expiresAt=1000;
    if(mode==='owner')f.state.quote!.userId='another-buyer';
    if(mode==='nonpayable')f.state.quote!.payable=false;
    if(mode==='rateAsset')f.state.rates.TON.asset='USDT';
    if(mode==='rateStale')f.state.rates.TON.quotedAt=939;
    await assert.rejects(create(f));assert.equal(f.count('ton_invoices'),0);
  }finally{f.sqlite.close();}}
});
test('native and USDT reconciliation commits paid+pending delivery once, even after new sales are disabled',async()=>{
  for(const asset of ['TON','USDT'] as const){const f=createPaymentFixture();try{
    const invoice=await create(f,asset);f.state.chainProof=proof(invoice);f.state.now=1002;f.config.enabled=false;
    const result=await f.service.reconcile(transactionHash,asset);assert.equal(result.matched,true);
    const status=await f.service.status('buyer-1',invoice.id);assert.equal(status.paymentStatus,'paid');assert.equal(status.deliveryStatus,'pending');
    assert.equal(f.count('ton_payment_events'),1);assert.equal(f.count('ton_payment_outbox'),1);
    f.state.now=1100;assert.equal((await f.service.reconcile(transactionHash,asset)).matched,true);assert.equal(f.count('ton_payment_outbox'),1);
    await assert.rejects(f.service.status('other-user',invoice.id),code('NOT_FOUND'));
  }finally{f.sqlite.close();}}
});
test('reconciliation rejects an adapter proof bound to another hash, asset, account or network',async()=>{
  for(const patch of [{transactionHash:'3'.repeat(64)},{asset:'USDT' as const},{account:testSource},{network:'ton-mainnet' as const}]){const f=createPaymentFixture();try{
    const invoice=await create(f);f.state.chainProof=proof(invoice,patch);f.state.now=1002;
    await assert.rejects(f.service.reconcile(transactionHash,'TON'),code('TEMPORARILY_UNAVAILABLE'));assert.equal(f.count('ton_payment_events'),0);
  }finally{f.sqlite.close();}}
});
test('missing/unknown comment is unmatched; partial/late verified receipts become review without fulfillment',async()=>{
  const f=createPaymentFixture();try{
    const invoice=await create(f);f.state.now=1002;
    f.state.chainProof=proof(invoice);f.state.chainProof.incoming.comment=null;
    assert.deepEqual(await f.service.reconcile(transactionHash,'TON'),{matched:false});
    f.state.chainProof.incoming.comment='ts_'+'9'.repeat(32);assert.deepEqual(await f.service.reconcile(transactionHash,'TON'),{matched:false});
    f.state.chainProof=proof(invoice);f.state.chainProof.incoming.amountBaseUnits='1';
    await f.service.reconcile(transactionHash,'TON');assert.equal((await f.service.status('buyer-1',invoice.id)).paymentStatus,'review');assert.equal(f.count('ton_payment_outbox'),0);
  }finally{f.sqlite.close();}
});
test('HTTP create and status use authoritative host auth, exact Origin, CSRF and rate limit gates',async()=>{
  const f=httpFixture();try{
    assert.equal((await f.handlers.createInvoice(f.request({}, {Origin:'https://attacker.example'}))).status,403);
    f.auth.userId=null;assert.equal((await f.handlers.createInvoice(f.request())).status,401);
    f.auth.userId='buyer-1';f.auth.csrf=false;assert.equal((await f.handlers.createInvoice(f.request())).status,403);
    f.auth.csrf=true;f.auth.rate=false;const throttled=await f.handlers.createInvoice(f.request());assert.equal(throttled.status,429);assert.equal(throttled.headers.get('Retry-After'),'60');
    f.auth.rate=true;const response=await f.handlers.createInvoice(f.request());assert.equal(response.status,201);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
    const invoice=await response.json() as PublicTonInvoice;
    f.auth.userId='other-user';assert.equal((await f.handlers.status(new Request(origin),invoice.id)).status,404);
    f.auth.userId='buyer-1';assert.equal((await f.handlers.status(new Request(origin),invoice.id)).status,200);assert.equal(f.calls.proof,0,'browser status polling never queries chain');
  }finally{f.sqlite.close();}
});
test('HTTP rejects client price, recipient, user, tx hash, wrong method and oversized/unparseable JSON',async()=>{
  const f=httpFixture();try{
    for(const extra of [{amount:'1'},{recipient:testSource},{userId:'other'},{txHash:transactionHash}])assert.equal((await f.handlers.createInvoice(f.request({quoteId:'quote-1',asset:'TON',...extra}))).status,400);
    assert.equal((await f.handlers.createInvoice(new Request(origin))).status,405);
    assert.equal((await f.handlers.createInvoice(f.request({quoteId:'x'.repeat(5000),asset:'TON'}))).status,413);
    assert.equal((await f.handlers.createInvoice(new Request(origin,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'not json'}))).status,400);
    assert.equal(f.count('ton_invoices'),0);
  }finally{f.sqlite.close();}
});
test('authenticated webhook only durably queues metadata; duplicate HTTP IDs cannot settle or duplicate a transfer',async()=>{
  const f=httpFixture();try{
    const invoice=await create(f);assert.equal((await f.handlers.webhook(f.webhook({}, {Authorization:'Bearer bad'}))).status,401);
    assert.equal((await f.handlers.webhook(f.webhook({}, {'Idempotency-Key':'delivery-one'}))).status,202);
    assert.equal((await f.handlers.webhook(f.webhook({}, {'Idempotency-Key':'delivery-two'}))).status,202);
    assert.equal(f.count('ton_webhook_inbox'),1);assert.equal(f.calls.proof,0);assert.equal(f.count('ton_payment_events'),0);
    assert.equal((await f.service.status('buyer-1',invoice.id)).paymentStatus,'pending');
    const row=f.sqlite.prepare('SELECT * FROM ton_webhook_inbox').get()!;assert.equal(row.state,'received');assert.ok(!JSON.stringify(row).includes(secret));
  }finally{f.sqlite.close();}
});
test('webhook rejects foreign destination, unsupported events, extra values, oversized JSON and uint64 overflow',async()=>{
  const f=httpFixture();try{
    for(const patch of [{account_id:testSource},{event_type:'mempool'},{amount:'1'},{lt:(1n<<64n).toString()},{tx_hash:'bad'}])assert.equal((await f.handlers.webhook(f.webhook(patch))).status,400);
    assert.equal((await f.handlers.webhook(f.webhook({extra:'x'.repeat(17000)}))).status,413);assert.equal(f.count('ton_webhook_inbox'),0);
  }finally{f.sqlite.close();}
});
test('database/provider failure returns safe 503 without false acknowledgment or leaking internals',async()=>{
  const f=httpFixture();try{
    f.sqlite.exec("CREATE TRIGGER fail_inbox BEFORE INSERT ON ton_webhook_inbox BEGIN SELECT RAISE(ABORT,'private-db-secret'); END;");
    const response=await f.handlers.webhook(f.webhook());assert.equal(response.status,503);assert.equal(f.count('ton_webhook_inbox'),0);assert.ok(!(await response.text()).includes('private-db-secret'));
    f.state.failRate=true;const error=await f.handlers.createInvoice(f.request());assert.equal(error.status,503);assert.ok(!(await error.text()).includes('provider-secret'));
  }finally{f.sqlite.close();}
});
test('missing short webhook secret fails closed even if new sales are enabled',async()=>{
  const f=httpFixture();try{
    const handlers=createTonHttpHandlers({...f.deps,service:createTonPaymentService(f.deps),mainOrigin:origin,webhookSecret:'short',authenticate:async()=>null,verifyCsrf:async()=>false,rateLimit:async()=>false});
    assert.equal((await handlers.webhook(f.webhook())).status,503);assert.equal(f.count('ton_webhook_inbox'),0);
  }finally{f.sqlite.close();}
});
