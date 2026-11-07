import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PaymentStoreError,type InvoiceInput,type VerifiedPaymentInput} from '../src/server/payments/ton/store.ts';
import {createD1Fixture as fixture} from './helpers/ton-d1.ts';

const address='0:'+'a'.repeat(64),master='0:'+'b'.repeat(64);
const seed: InvoiceInput = {id:'invoice-1',userId:'buyer-1',quoteId:'quote-1',itemIds:['S004','C003'],termsRevision:'terms-1',asset:'TON',network:'ton-testnet',recipient:address,jettonMaster:null,amountBaseUnits:'16000000000',comment:'ts_'+'1'.repeat(32),createdAt:1000,expiresAt:1900,fxQuoteId:'fx-1',fxSnapshot:{source:'fixture',numerator:'100',denominator:'1',asOf:1000},idempotencyKey:'key-1',inputDigest:'c'.repeat(64)};
const invoice=(suffix='1',patch:Partial<InvoiceInput>={}):InvoiceInput=>({...seed,id:`invoice-${suffix}`,quoteId:`quote-${suffix}`,comment:'ts_'+suffix.padStart(32,'0'),idempotencyKey:`key-${suffix}`,...patch});
function proof(target:InvoiceInput,patch:Partial<VerifiedPaymentInput>={}):VerifiedPaymentInput {
  return {eventKey:'event-'+target.id,txIdentity:`${target.network}:${address}:123:${target.id}`,invoiceId:target.id,asset:target.asset,network:target.network,recipient:target.recipient,comment:target.comment,amountBaseUnits:target.amountBaseUnits,transactionAt:1200,observedAt:1201,proofDigest:'d'.repeat(64),...patch};
}
const code=(expected:PaymentStoreError['code'])=>(error:unknown)=>error instanceof PaymentStoreError&&error.code===expected;

test('invoice snapshots are immutable, owned and preserve integer amount and FX source',async()=>{
  const f=fixture();try {
    const input=invoice('1',{amountBaseUnits:'100000000000000000001'});
    const created=await f.store.createInvoice(input);
    assert.equal(created.replayed,false);assert.equal(created.invoice.status,'pending');assert.equal(created.invoice.deliveryState,'not_ready');
    assert.equal(created.invoice.amountBaseUnits,input.amountBaseUnits);assert.deepEqual(created.invoice.fxSnapshot,input.fxSnapshot);
    assert.equal(await f.store.findOwnedInvoice(input.id,'different-buyer'),null);
    assert.equal((await f.store.findOwnedInvoice(input.id,input.userId))?.id,input.id);
    assert.equal((await f.store.findInvoiceByComment(input.comment))?.id,input.id);
    assert.equal(await f.store.findInvoiceByComment('unknown'),null);
    assert.throws(()=>f.sqlite.prepare("UPDATE ton_invoices SET amount_base_units='1' WHERE id=?").run(input.id),/immutable invoice snapshot/);
    assert.equal(f.count('ton_payment_events'),0);assert.equal(f.count('ton_payment_outbox'),0);
  }finally{f.sqlite.close();}
});
test('racing invoice retries share one immutable invoice; changed payload or reused quote conflicts',async()=>{
  const f=fixture();try {
    const first=invoice(),second=invoice('2',{quoteId:first.quoteId,idempotencyKey:first.idempotencyKey});
    const results=await Promise.all([f.store.createInvoice(first),f.store.createInvoice(second)]);
    assert.equal(results.filter(result=>result.replayed).length,1);assert.equal(results[0].invoice.id,results[1].invoice.id);assert.equal(f.count('ton_invoices'),1);
    await assert.rejects(f.store.createInvoice({...second,inputDigest:'e'.repeat(64)}),code('IDEMPOTENCY_CONFLICT'));
    await assert.rejects(f.store.createInvoice({...second,idempotencyKey:'other-key'}),code('INVOICE_CONFLICT'));
    assert.equal(f.count('ton_invoices'),1);
  }finally{f.sqlite.close();}
});
test('idempotency lookup is owner-scoped and recovers original expired invoice without a fresh quote',async()=>{
  const f=fixture();try {
    const first=invoice(),other=invoice('2',{userId:'buyer-2',idempotencyKey:first.idempotencyKey});
    await f.store.createInvoice(first);await f.store.createInvoice(other);
    f.sqlite.prepare("UPDATE ton_invoices SET status='expired' WHERE id=?").run(first.id);
    const restored=await f.store.findOwnedInvoiceByIdempotencyKey(first.userId,first.idempotencyKey);
    assert.equal(restored?.id,first.id);assert.equal(restored?.status,'expired');
    assert.equal(restored?.inputDigest,first.inputDigest);assert.equal(restored?.fxQuoteId,first.fxQuoteId);
    assert.equal((await f.store.findOwnedInvoiceByIdempotencyKey(other.userId,other.idempotencyKey))?.id,other.id);
    assert.equal(await f.store.findOwnedInvoiceByIdempotencyKey('unknown-buyer',first.idempotencyKey),null);
    assert.equal(await f.store.findOwnedInvoiceByIdempotencyKey(first.userId,'unknown-key'),null);
    assert.equal(await f.store.findOwnedInvoiceByIdempotencyKey('',first.idempotencyKey),null);
  }finally{f.sqlite.close();}
});
test('exact native or USDT settlement creates a single fulfillment intent, never delivered files or grants',async()=>{
  for(const asset of ['TON','USDT'] as const) {
    const f=fixture();try {
      const target=invoice('1',{asset,jettonMaster:asset==='USDT'?master:null});await f.store.createInvoice(target);
      const result=await f.store.recordVerifiedPayment(proof(target));
      assert.equal(result.invoice.status,'paid');assert.equal(result.invoice.deliveryState,'pending');assert.equal(result.invoice.paidAt,1200);
      assert.equal(result.event.outcome,'paid');assert.equal(result.event.reason,'exact');assert.equal(result.replayed,false);
      assert.equal(f.count('ton_payment_events'),1);assert.equal(f.count('ton_payment_outbox'),1);
      const tables=f.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name);
      assert.ok(!tables.includes('grants'));
    }finally{f.sqlite.close();}
  }
});
test('same chain transaction delivered concurrently is settled once despite different webhook IDs',async()=>{
  const f=fixture();try {
    const target=invoice();await f.store.createInvoice(target);const input=proof(target);
    const results=await Promise.all([f.store.recordVerifiedPayment(input),f.store.recordVerifiedPayment({...input,eventKey:'event-second',observedAt:1500})]);
    assert.equal(results.filter(result=>result.replayed).length,1);assert.equal(results[0].event.eventKey,results[1].event.eventKey);
    assert.equal(f.count('ton_payment_events'),1);assert.equal(f.count('ton_payment_outbox'),1);
  }finally{f.sqlite.close();}
});
test('global transaction identity and event identity cannot pay two different invoices',async()=>{
  const f=fixture();try {
    const a=invoice('1'),b=invoice('2');await f.store.createInvoice(a);await f.store.createInvoice(b);
    const input=proof(a);await f.store.recordVerifiedPayment(input);
    await assert.rejects(f.store.recordVerifiedPayment(proof(b,{txIdentity:input.txIdentity})),code('PAYMENT_CONFLICT'));
    await assert.rejects(f.store.recordVerifiedPayment(proof(b,{eventKey:input.eventKey})),code('PAYMENT_CONFLICT'));
    assert.equal((await f.store.findOwnedInvoice(b.id,b.userId))?.status,'pending');
    assert.equal(f.count('ton_payment_events'),1);assert.equal(f.count('ton_payment_outbox'),1);
  }finally{f.sqlite.close();}
});
test('wrong asset, network, recipient or comment never changes invoice state',async()=>{
  const f=fixture();try {
    const target=invoice();await f.store.createInvoice(target);
    for(const patch of [{asset:'USDT' as const},{network:'ton-mainnet' as const,txIdentity:'ton-mainnet:any'},{recipient:master},{comment:'ts_'+'f'.repeat(32)}]) {
      await assert.rejects(f.store.recordVerifiedPayment(proof(target,patch)),code('PAYMENT_CONFLICT'));
    }
    assert.equal((await f.store.findOwnedInvoice(target.id,target.userId))?.status,'pending');assert.equal(f.count('ton_payment_events'),0);
  }finally{f.sqlite.close();}
});
test('underpayment, overpayment, early and late transfers become review and never auto-combine',async()=>{
  for(const [patch,reason] of [[{amountBaseUnits:'1'},'underpaid'],[{amountBaseUnits:'16000000001'},'overpaid'],[{transactionAt:999},'early'],[{transactionAt:1900,observedAt:1901},'late']] as const) {
    const f=fixture();try {
      const target=invoice();await f.store.createInvoice(target);
      const result=await f.store.recordVerifiedPayment(proof(target,patch));
      assert.equal(result.invoice.status,'review');assert.equal(result.event.reason,reason);assert.equal(result.invoice.deliveryState,'not_ready');
      const again=await f.store.recordVerifiedPayment(proof(target,{eventKey:'another-event',txIdentity:'ton-testnet:another-tx'}));
      assert.equal(again.event.reason,'already_review');assert.equal(again.invoice.status,'review');assert.equal(f.count('ton_payment_outbox'),0);
    }finally{f.sqlite.close();}
  }
});
test('late indexer observation preserves on-time settlement; exact expiry boundary stays review',async()=>{
  const f=fixture();try {
    const target=invoice();await f.store.createInvoice(target);
    f.sqlite.prepare("UPDATE ton_invoices SET status='expired' WHERE id=?").run(target.id);
    const result=await f.store.recordVerifiedPayment(proof(target,{transactionAt:1899,observedAt:10000}));
    assert.equal(result.invoice.status,'paid');assert.equal(result.invoice.paidAt,1899);
  }finally{f.sqlite.close();}
});
test('extra payment on a paid invoice records a review event without removing existing payment or duplicating outbox',async()=>{
  const f=fixture();try {
    const target=invoice();await f.store.createInvoice(target);const paid=await f.store.recordVerifiedPayment(proof(target));
    const extra=await f.store.recordVerifiedPayment(proof(target,{eventKey:'extra-payment',txIdentity:'ton-testnet:extra',proofDigest:'e'.repeat(64)}));
    assert.equal(extra.event.outcome,'review');assert.equal(extra.event.reason,'already_paid');assert.equal(extra.invoice.status,'paid');
    assert.equal(extra.invoice.settlementEventKey,paid.invoice.settlementEventKey);assert.equal(f.count('ton_payment_outbox'),1);
  }finally{f.sqlite.close();}
});
test('changing a proof on retry cannot modify the immutable event or settled amount',async()=>{
  const f=fixture();try {
    const target=invoice();await f.store.createInvoice(target);const input=proof(target);await f.store.recordVerifiedPayment(input);
    await assert.rejects(f.store.recordVerifiedPayment({...input,amountBaseUnits:'1',proofDigest:'a'.repeat(64)}),code('PAYMENT_CONFLICT'));
    assert.equal(f.count('ton_payment_events'),1);
    assert.throws(()=>f.sqlite.prepare("UPDATE ton_payment_events SET amount_base_units='1'").run(),/immutable payment event/);
  }finally{f.sqlite.close();}
});
test('durable webhook receipt is bounded and deduplicated without raw payload storage',async()=>{
  const f=fixture();try {
    const input={eventKey:'delivery-1',bodyDigest:'a'.repeat(64),receivedAt:1000,reference:'ton-testnet:tx:123'};
    assert.equal((await f.store.receiveWebhook(input)).replayed,false);assert.equal((await f.store.receiveWebhook(input)).replayed,true);
    await assert.rejects(f.store.receiveWebhook({...input,bodyDigest:'b'.repeat(64)}),code('IDEMPOTENCY_CONFLICT'));
    await assert.rejects(f.store.receiveWebhook({...input,eventKey:'a'.repeat(129)}),code('INVALID_INPUT'));
    await f.store.markWebhookProcessed(input.eventKey,input.bodyDigest);
    assert.equal(f.sqlite.prepare('SELECT state FROM ton_webhook_inbox').get()?.state,'processed');
    await assert.rejects(f.store.markWebhookProcessed('unknown',input.bodyDigest),code('NOT_FOUND'));
    assert.equal(f.count('ton_webhook_inbox'),1);
  }finally{f.sqlite.close();}
});
test('scheduled inbox worker can list bounded ordered receipts and retry failed processing until marked',async()=>{
  const f=fixture();try {
    const a={eventKey:'delivery-a',bodyDigest:'a'.repeat(64),receivedAt:1000,reference:'ton-testnet:tx:a'};
    const b={eventKey:'delivery-b',bodyDigest:'b'.repeat(64),receivedAt:1000,reference:'ton-testnet:tx:b'};
    const later={eventKey:'delivery-later',bodyDigest:'c'.repeat(64),receivedAt:1001,reference:'ton-testnet:tx:c'};
    await f.store.receiveWebhook(later);await f.store.receiveWebhook(b);await f.store.receiveWebhook(a);
    assert.deepEqual(await f.store.listPendingWebhooks(),[a,b,later]);
    assert.deepEqual(await f.store.listPendingWebhooks(1),[a]);
    // Merely reading the queue does not consume a receipt, including after a worker error.
    const read=await f.store.listPendingWebhooks(1);assert.equal(read[0].eventKey,a.eventKey);
    assert.deepEqual(await f.store.listPendingWebhooks(1),[a]);
    await f.store.markWebhookProcessed(a.eventKey,a.bodyDigest);
    assert.deepEqual(await f.store.listPendingWebhooks(),[b,later]);
    await f.store.markWebhookProcessed(b.eventKey,b.bodyDigest);await f.store.markWebhookProcessed(later.eventKey,later.bodyDigest);
    assert.deepEqual(await f.store.listPendingWebhooks(),[]);
    for(const limit of [0,-1,101,1.1,Number.NaN,Number.POSITIVE_INFINITY]) await assert.rejects(f.store.listPendingWebhooks(limit),code('INVALID_INPUT'));
  }finally{f.sqlite.close();}
});
test('database batch rollback leaves neither paid state, event nor outbox on failure',async()=>{
  const f=fixture();try {
    const target=invoice();await f.store.createInvoice(target);
    f.sqlite.exec("CREATE TRIGGER fail_outbox BEFORE INSERT ON ton_payment_outbox BEGIN SELECT RAISE(ABORT,'unavailable'); END;");
    await assert.rejects(f.store.recordVerifiedPayment(proof(target)),/unavailable/);
    assert.equal((await f.store.findOwnedInvoice(target.id,target.userId))?.status,'pending');assert.equal(f.count('ton_payment_events'),0);assert.equal(f.count('ton_payment_outbox'),0);
  }finally{f.sqlite.close();}
});
test('malformed money, token identity and snapshots are rejected before any storage write',async()=>{
  const f=fixture();try {
    for(const patch of [
      {amountBaseUnits:'01'},{amountBaseUnits:'0'},{amountBaseUnits:'1.1'},
      {amountBaseUnits:'1e9'},{amountBaseUnits:'-1'},{amountBaseUnits:'1'.repeat(79)},
      {itemIds:['S004','S004']},{itemIds:[]},{comment:'some arbitrary memo'},
      {expiresAt:1000},{recipient:'UQ-wallet-text'},
      {asset:'USDT' as const,jettonMaster:null},{asset:'TON' as const,jettonMaster:master},
      {fxSnapshot:{bad:Number.NaN}},
    ]) await assert.rejects(f.store.createInvoice(invoice('1',patch)),code('INVALID_INPUT'));
    assert.equal(f.count('ton_invoices'),0);
    const target=invoice();await f.store.createInvoice(target);
    for(const patch of [{transactionAt:1202,observedAt:1201},{amountBaseUnits:'0001'},{proofDigest:'not-a-digest'}]) {
      await assert.rejects(f.store.recordVerifiedPayment(proof(target,patch)),code('INVALID_INPUT'));
    }
    assert.equal(f.count('ton_payment_events'),0);
  }finally{f.sqlite.close();}
});
