import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyTonPayment,TonVerificationError,usdtMainnetMaster,type TonChainProof} from '../src/server/payments/ton/verification.ts';
import type {TonInvoice} from '../src/server/payments/ton/store.ts';

const receiver='0:303d5f70e21ed93f40957b742826825f55a623af1a7d12a7374d297a9c43436a';
const exchange=`0:${'9'.repeat(64)}`;
const jettonWallet=`0:${'4'.repeat(64)}`;
const hash='a'.repeat(64);
const baseInvoice=():TonInvoice=>({
  id:'invoice-1',userId:'user-1',quoteId:'quote-1',itemIds:['S004'],termsRevision:'terms-1',
  asset:'TON',network:'ton-mainnet',recipient:receiver,jettonMaster:null,amountBaseUnits:'16000000000',
  comment:`ts_${'1'.repeat(32)}`,createdAt:1000,expiresAt:1900,fxQuoteId:'fx-1',
  idempotencyKey:'checkout-1',inputDigest:'c'.repeat(64),status:'pending',deliveryState:'not_ready',
  paidAt:null,settlementEventKey:null,
});
const nativeProof=():TonChainProof=>({
  network:'ton-mainnet',asset:'TON',account:receiver,transactionHash:hash,lt:'40000000000001',transactionAt:1100,
  successful:true,aborted:false,finalized:true,masterchainSeqno:100,outgoingMessageCount:0,
  incoming:{bounced:false,source:exchange,destination:receiver,amountBaseUnits:'16000000000',comment:`ts_${'1'.repeat(32)}`},
});
function jettonFixture() {
  const invoice={...baseInvoice(),asset:'USDT' as const,jettonMaster:usdtMainnetMaster,amountBaseUnits:'16000000'};
  const proof:TonChainProof={...nativeProof(),asset:'USDT',incoming:{...nativeProof().incoming,source:jettonWallet,amountBaseUnits:'16000000'},jetton:{master:usdtMainnetMaster,owner:receiver,wallet:jettonWallet,derivedWallet:jettonWallet,notificationSender:jettonWallet,notificationOpcode:'0x7362d09c',credited:true,creditTransactionHash:'b'.repeat(64)}};
  return {invoice,proof};
}
async function rejects(invoice:TonInvoice,proof:TonChainProof,code:string,observedAt=1200) {
  await assert.rejects(verifyTonPayment(invoice,proof,observedAt),(error:unknown)=>error instanceof TonVerificationError&&error.code===code);
}

test('native transfer from an exchange credits the invoice owner without sender ownership assumptions',async()=>{
  const payment=await verifyTonPayment(baseInvoice(),nativeProof(),1200);
  assert.equal(payment.invoiceId,'invoice-1');assert.equal(payment.recipient,receiver);
  assert.equal(payment.amountBaseUnits,'16000000000');assert.equal(payment.transactionAt,1100);
  assert.match(payment.eventKey,/^ton_[a-f0-9]{64}$/);assert.match(payment.proofDigest,/^[a-f0-9]{64}$/);
  assert.equal(payment.txIdentity,`ton-mainnet:${receiver}:40000000000001:${hash}`);
  assert.deepEqual(Object.keys(payment).sort(),['eventKey','txIdentity','invoiceId','asset','network','recipient','comment','amountBaseUnits','transactionAt','observedAt','proofDigest'].sort());
});

test('reconciliation at a later observation and newer finality block preserves receipt identity and digest',async()=>{
  const first=await verifyTonPayment(baseInvoice(),nativeProof(),1200);
  const next=await verifyTonPayment(baseInvoice(),{...nativeProof(),masterchainSeqno:101},1300);
  assert.equal(first.eventKey,next.eventKey);assert.equal(first.txIdentity,next.txIdentity);assert.equal(first.proofDigest,next.proofDigest);
  assert.notEqual(first.observedAt,next.observedAt);
});

test('tx identity is scoped by network and account, never by an untrusted browser order reference',async()=>{
  const first=await verifyTonPayment(baseInvoice(),nativeProof(),1200);
  const otherNetwork=await verifyTonPayment({...baseInvoice(),network:'ton-testnet'},{...nativeProof(),network:'ton-testnet'},1200);
  const otherReceiver=`0:${'8'.repeat(64)}`;
  const another=await verifyTonPayment({...baseInvoice(),recipient:otherReceiver},{...nativeProof(),account:otherReceiver,incoming:{...nativeProof().incoming,destination:otherReceiver}},1200);
  assert.notEqual(first.eventKey,otherNetwork.eventKey);assert.notEqual(first.eventKey,another.eventKey);
});

test('unfinalized, failed, aborted, bounced or outgoing transfers never become verified receipts',async()=>{
  for(const patch of [{successful:false},{aborted:true},{outgoingMessageCount:1},{outgoingMessageCount:-1}])await rejects(baseInvoice(),{...nativeProof(),...patch},'NOT_SUCCESSFUL');
  await rejects(baseInvoice(),{...nativeProof(),incoming:{...nativeProof().incoming,bounced:true}},'NOT_SUCCESSFUL');
  for(const patch of [{finalized:false},{masterchainSeqno:0},{masterchainSeqno:1.5}])await rejects(baseInvoice(),{...nativeProof(),...patch},'NOT_FINALIZED');
});

test('wrong chain, wrong token and either wrong receiver field are rejected',async()=>{
  await rejects(baseInvoice(),{...nativeProof(),network:'ton-testnet'},'NETWORK_MISMATCH');
  await rejects(baseInvoice(),{...nativeProof(),asset:'USDT'},'ASSET_MISMATCH');
  await rejects(baseInvoice(),{...nativeProof(),account:exchange},'RECIPIENT_MISMATCH');
  await rejects(baseInvoice(),{...nativeProof(),incoming:{...nativeProof().incoming,destination:exchange}},'RECIPIENT_MISMATCH');
  await rejects(baseInvoice(),{...nativeProof(),jetton:jettonFixture().proof.jetton},'ASSET_MISMATCH');
});

test('missing, malformed or another invoice comment cannot be matched by amount or sender',async()=>{
  for(const comment of [null,'','invoice-1',`ts_${'2'.repeat(32)}`,`ts_${'1'.repeat(32)} `,'💳'])await rejects(baseInvoice(),{...nativeProof(),incoming:{...nativeProof().incoming,comment}},'COMMENT_MISMATCH');
});

test('amounts remain precise integer base units; floats, zero, signs and oversized TL-B values are rejected',async()=>{
  for(const value of ['0','-1','01','1.5','1e9',' 1','+1','9'.repeat(38),(1n<<120n).toString()])await rejects(baseInvoice(),{...nativeProof(),incoming:{...nativeProof().incoming,amountBaseUnits:value}},'MALFORMED_PROOF');
  const large='1329227995784915872903807060280344575';
  const result=await verifyTonPayment({...baseInvoice(),amountBaseUnits:large},{...nativeProof(),incoming:{...nativeProof().incoming,amountBaseUnits:large}},1200);
  assert.equal(result.amountBaseUnits,large);
});

test('invalid or future timestamps and malformed transaction identity are rejected',async()=>{
  for(const patch of [{transactionAt:1201},{transactionAt:1100.1},{transactionHash:'A'.repeat(64)},{transactionHash:'txhash'},{lt:'0'},{lt:'01'},{lt:(1n<<64n).toString()},{account:receiver.toUpperCase()}])await rejects(baseInvoice(),{...nativeProof(),...patch},'MALFORMED_PROOF');
  await rejects(baseInvoice(),nativeProof(),'MALFORMED_PROOF',NaN);
  await rejects(baseInvoice(),null as unknown as TonChainProof,'MALFORMED_PROOF');
});

test('actual underpaid, overpaid, early and late receipts reach the store for review instead of disappearing',async()=>{
  for(const amountBaseUnits of ['1','16000000001']){
    const result=await verifyTonPayment(baseInvoice(),{...nativeProof(),incoming:{...nativeProof().incoming,amountBaseUnits}},1200);
    assert.equal(result.amountBaseUnits,amountBaseUnits);
  }
  for(const transactionAt of [999,1900,2000]){
    const result=await verifyTonPayment(baseInvoice(),{...nativeProof(),transactionAt},2100);
    assert.equal(result.transactionAt,transactionAt);
  }
});

test('genuine USDT uses token base units and checks trusted master, derived recipient wallet and credit',async()=>{
  const {invoice,proof}=jettonFixture();const result=await verifyTonPayment(invoice,proof,1200);
  assert.equal(result.asset,'USDT');assert.equal(result.amountBaseUnits,'16000000');
  assert.equal(result.recipient,receiver);
});

test('USDT lookalikes and untrusted masters are refused even if the invoice names the same fake token',async()=>{
  const {invoice,proof}=jettonFixture();const fake=`0:${'7'.repeat(64)}`;
  await rejects({...invoice,jettonMaster:fake},{...proof,jetton:{...proof.jetton!,master:fake}},'UNTRUSTED_JETTON');
  await rejects(invoice,{...proof,jetton:{...proof.jetton!,master:fake}},'UNTRUSTED_JETTON');
  await rejects(invoice,{...proof,jetton:undefined},'UNTRUSTED_JETTON');
});

test('spoofed notification, wrong owner, failed credit or unmatched derived wallet are refused',async()=>{
  const {invoice,proof}=jettonFixture();
  for(const patch of [{owner:exchange},{derivedWallet:exchange},{notificationSender:exchange},{wallet:exchange},{credited:false},{notificationOpcode:'0x178d4519'},{creditTransactionHash:'not-a-hash'}])await rejects(invoice,{...proof,jetton:{...proof.jetton!,...patch}},'INVALID_JETTON_CREDIT');
  await rejects(invoice,{...proof,incoming:{...proof.incoming,source:exchange}},'INVALID_JETTON_CREDIT');
});

test('testnet USDT requires an explicitly configured trusted master and never inherits mainnet trust',async()=>{
  const {invoice,proof}=jettonFixture();const testInvoice={...invoice,network:'ton-testnet' as const};const testProof={...proof,network:'ton-testnet' as const};
  await rejects(testInvoice,testProof,'UNTRUSTED_JETTON');
  const result=await verifyTonPayment(testInvoice,testProof,1200,{trustedJettonMasters:{'ton-testnet':[usdtMainnetMaster]}});
  assert.equal(result.network,'ton-testnet');
});

test('changing verified amount or token credit proof changes the digest while preserving transaction deduplication key',async()=>{
  const {invoice,proof}=jettonFixture();const first=await verifyTonPayment(invoice,proof,1200);
  const other=await verifyTonPayment(invoice,{...proof,incoming:{...proof.incoming,amountBaseUnits:'1'}},1200);
  const differentCredit=await verifyTonPayment(invoice,{...proof,jetton:{...proof.jetton!,creditTransactionHash:'c'.repeat(64)}},1200);
  assert.equal(first.eventKey,other.eventKey);assert.equal(first.eventKey,differentCredit.eventKey);
  assert.notEqual(first.proofDigest,other.proofDigest);assert.notEqual(first.proofDigest,differentCredit.proofDigest);
});
