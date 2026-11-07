import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPaymentFixture,testRecipient,testSource} from './helpers/ton-d1.ts';
import {createTonInboxWorker} from '../src/server/payments/ton/worker.ts';
import {TonChainError} from '../src/server/payments/ton/toncenter.ts';
import {TonVerificationError,type TonChainProof} from '../src/server/payments/ton/verification.ts';

const transactionHash='1'.repeat(64);
const receipt=(suffix='1')=>({eventKey:`hint-${suffix}`,bodyDigest:'a'.repeat(64),receivedAt:1000,reference:`ton-testnet:${testRecipient}:1001:${transactionHash}`});
test('two workers racing for one receipt get exactly one active lease and one processing call',async()=>{
  const f=createPaymentFixture();try{
    await f.store.receiveWebhook(receipt());let calls=0;
    const worker=createTonInboxWorker({...f.deps,network:f.config.network,recipient:f.config.recipient,reconcile:async()=>{calls++;return {matched:true};}});
    const results=await Promise.all([worker.process(),worker.process()]);
    assert.equal(calls,1);assert.equal(results.reduce((n,r)=>n+r.matched,0),1);
    assert.equal(f.sqlite.prepare('SELECT state FROM ton_webhook_inbox').get()?.state,'processed');
  }finally{f.sqlite.close();}
});
test('crashed lease is retried only after expiry and a stale worker cannot finish a newer claim',async()=>{
  const f=createPaymentFixture();try{
    const input=receipt();await f.store.receiveWebhook(input);
    const old=await f.store.claimWebhook(input,1000);assert.ok(old);
    assert.equal(await f.store.claimWebhook(input,1059),null);
    const next=await f.store.claimWebhook(input,1060);assert.ok(next);assert.equal(next.attempt,2);assert.notEqual(next.leaseToken,old.leaseToken);
    assert.equal(await f.store.finishWebhook(old,{outcome:'matched'},1061),false);
    assert.equal(await f.store.finishWebhook(next,{outcome:'matched'},1061),true);
    assert.equal(f.sqlite.prepare('SELECT attempts FROM ton_webhook_inbox').get()?.attempts,2);
  }finally{f.sqlite.close();}
});
test('temporary chain failures back off and enter operator review after at most eight attempts',async()=>{
  const f=createPaymentFixture();try{
    await f.store.receiveWebhook(receipt());const worker=createTonInboxWorker({...f.deps,network:f.config.network,recipient:f.config.recipient,reconcile:async()=>{throw new TonChainError('CHAIN_UNAVAILABLE');}});
    for(let attempt=1;attempt<=8;attempt++){
      const result=await worker.process();assert.equal(attempt<8?result.retried:result.review,1);
      const row=f.sqlite.prepare('SELECT * FROM ton_webhook_inbox').get()!;assert.equal(row.attempts,attempt);
      if(attempt<8){assert.equal(row.state,'received');assert.equal(row.next_attempt_at,f.state.now+Math.min(3600,60*2**(attempt-1)));assert.equal((await worker.process()).retried,0);f.state.now=Number(row.next_attempt_at);}
      else {assert.equal(row.state,'review');assert.equal(row.last_error,'RETRY_EXHAUSTED');}
    }
    assert.deepEqual(await f.store.listDueWebhooks(f.state.now+10000),[]);
  }finally{f.sqlite.close();}
});
test('crashing all eight attempts also exhausts the queue instead of generating unlimited leases',async()=>{
  const f=createPaymentFixture();try{
    const input=receipt();await f.store.receiveWebhook(input);
    for(let attempt=1;attempt<=8;attempt++){const job=await f.store.claimWebhook(input,f.state.now);assert.equal(job?.attempt,attempt);f.state.now+=60;}
    assert.equal(await f.store.claimWebhook(input,f.state.now),null);
    const row=f.sqlite.prepare('SELECT * FROM ton_webhook_inbox').get()!;assert.equal(row.state,'review');assert.equal(row.last_error,'RETRY_EXHAUSTED');
  }finally{f.sqlite.close();}
});
test('missing/unknown invoice comment remains a durable unmatched operator reference without payment or fulfillment',async()=>{
  const f=createPaymentFixture();try{
    await f.store.receiveWebhook(receipt());let calls=0;
    const worker=createTonInboxWorker({...f.deps,network:f.config.network,recipient:f.config.recipient,reconcile:async(_hash,asset)=>{calls++;if(asset==='USDT')throw new TonChainError('UNMATCHED_TRANSFER');return {matched:false};}});
    assert.equal((await worker.process()).unmatched,1);assert.equal(calls,2);
    const row=f.sqlite.prepare('SELECT * FROM ton_webhook_inbox').get()!;assert.equal(row.last_error,'UNMATCHED_TRANSFER');assert.equal(row.reference,receipt().reference);assert.equal(row.state,'processed');
    assert.equal(f.count('ton_payment_events'),0);assert.equal(f.count('ton_payment_outbox'),0);
  }finally{f.sqlite.close();}
});
test('fake token credit and invalid transaction references are quarantined for operator review',async()=>{
  const f=createPaymentFixture();try{
    await f.store.receiveWebhook(receipt('1'));await f.store.receiveWebhook({...receipt('2'),reference:'ton-testnet:wrong-destination:1001:'+transactionHash});
    const worker=createTonInboxWorker({...f.deps,network:f.config.network,recipient:f.config.recipient,reconcile:async()=>{throw new TonVerificationError('UNTRUSTED_JETTON');}});
    assert.equal((await worker.process()).review,2);
    const errors=f.sqlite.prepare('SELECT last_error FROM ton_webhook_inbox ORDER BY event_key').all().map(r=>r.last_error);
    assert.deepEqual(errors,['UNTRUSTED_JETTON','INVALID_REFERENCE']);assert.equal(f.count('ton_payment_outbox'),0);
  }finally{f.sqlite.close();}
});
test('a payment committed before worker crash is not duplicated when its expired job is reclaimed',async()=>{
  const f=createPaymentFixture();try{
    const invoice=await f.service.createInvoice('buyer-1',{quoteId:'quote-1',asset:'TON',idempotencyKey:'key-1'});
    const chain:TonChainProof={asset:'TON',network:'ton-testnet',account:testRecipient,transactionHash,lt:'1001',transactionAt:1000,successful:true,aborted:false,finalized:true,masterchainSeqno:100,outgoingMessageCount:0,incoming:{source:testSource,destination:testRecipient,amountBaseUnits:invoice.amountBaseUnits,comment:invoice.comment,bounced:false}};
    f.state.chainProof=chain;await f.store.receiveWebhook(receipt());const job=await f.store.claimWebhook(receipt(),1000);assert.ok(job);
    await f.service.reconcile(transactionHash,'TON');assert.equal(f.count('ton_payment_outbox'),1);
    // Crash after DB settlement, before finishWebhook. Next scheduled worker recovers the lease.
    f.state.now=1060;f.config.enabled=false;
    const worker=createTonInboxWorker({...f.deps,network:f.config.network,recipient:f.config.recipient,reconcile:f.service.reconcile});
    assert.equal((await worker.process()).matched,1);assert.equal(f.count('ton_payment_outbox'),1);assert.equal(f.count('ton_payment_events'),1);
    assert.equal((await f.service.status('buyer-1',invoice.id)).deliveryStatus,'pending');
    assert.equal(await f.store.finishWebhook(job,{outcome:'review',code:'TEMPORARILY_UNAVAILABLE'},1061),false);
  }finally{f.sqlite.close();}
});
test('worker does not acknowledge a job if durable completion fails; lease keeps the receipt recoverable',async()=>{
  const f=createPaymentFixture();try{
    await f.store.receiveWebhook(receipt());
    f.sqlite.exec("CREATE TRIGGER fail_finish BEFORE UPDATE OF state ON ton_webhook_inbox WHEN NEW.state='processed' OR NEW.state='received' BEGIN SELECT RAISE(ABORT,'database unavailable'); END;");
    const worker=createTonInboxWorker({...f.deps,network:f.config.network,recipient:f.config.recipient,reconcile:async()=>({matched:true})});
    await assert.rejects(worker.process(),/database unavailable/);
    assert.equal(f.sqlite.prepare('SELECT state FROM ton_webhook_inbox').get()?.state,'processing');
    assert.equal((await f.store.listDueWebhooks(1060)).length,1);
  }finally{f.sqlite.close();}
});
