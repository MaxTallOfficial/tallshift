/** Synthetic Toncenter responses with real @ton/core BOC encoding; no network calls. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Address,beginCell,Cell} from '@ton/core';
import {paymentConfig} from '../src/server/payments/ton/config.ts';
import {chainHash,createToncenterReader,TonChainError} from '../src/server/payments/ton/toncenter.ts';
import {verifyTonPayment} from '../src/server/payments/ton/verification.ts';
import type {TonInvoice} from '../src/server/payments/ton/store.ts';

const config=paymentConfig();
const source=`0:${'c'.repeat(64)}`,wallet=`0:${'d'.repeat(64)}`;
const txHash='1'.repeat(64),creditHash='2'.repeat(64),messageHash='3'.repeat(64);
const invoiceComment=`ts_${'a'.repeat(32)}`;
const encodedComment=beginCell().storeUint(0,32).storeStringTail(invoiceComment).endCell();
const notification=(query=42n,amount=16000000n,sender=source,ref=true)=>{
  const cell=beginCell().storeUint(0x7362d09c,32).storeUint(query,64).storeCoins(amount).storeAddress(Address.parse(sender));
  if(ref)cell.storeBit(1).storeRef(encodedComment);else cell.storeBit(0).storeSlice(encodedComment.beginParse());
  return cell.endCell().toBoc().toString('base64');
};
const creditBody=(query=42n,amount=16000000n,sender=source)=>beginCell().storeUint(0x178d4519,32).storeUint(query,64).storeCoins(amount).storeAddress(Address.parse(sender)).storeAddress(null).storeCoins(1n).storeBit(1).storeRef(encodedComment).endCell().toBoc().toString('base64');
function tx(asset:'TON'|'USDT'='TON') {
  return {hash:txHash,account:config.recipient,lt:'1001',now:1200,finality:2,mc_block_seqno:100,emulated:false,
    description:{aborted:false,destroyed:false,compute_ph:{success:true},action:{success:true}},out_msgs:[] as unknown[],
    in_msg:{source:asset==='TON'?source:wallet,destination:config.recipient,value:asset==='TON'?'16000000000':'1',bounced:false,hash:messageHash,in_msg_tx_hash:creditHash,message_content:{body:asset==='TON'?encodedComment.toBoc().toString('base64'):notification()}},
  };
}
function fixture(asset:'TON'|'USDT'='TON') {
  const incoming=tx(asset);
  const credit={...tx('USDT'),hash:creditHash,account:wallet,lt:'1000',
    in_msg:{...tx('USDT').in_msg,source,destination:wallet,message_content:{body:creditBody()}},
    out_msgs:[{...structuredClone(incoming.in_msg),destination:config.recipient}],
  };
  const state={incoming,credit,active:true,deriveWallet:wallet,deriveSuccess:true,scan:[] as unknown[],response:undefined as Response|undefined,fail:false};
  const requests:{url:URL;init?:RequestInit}[]=[];
  const fetcher:typeof fetch=async(input,init)=>{
    const url=new URL(String(input));requests.push({url,init});
    assert.equal(url.origin,'https://toncenter.com');assert.equal(init?.redirect,'error');assert.ok(init?.signal);assert.equal(new Headers(init?.headers).get('X-API-Key'),'test-only-key');
    if(state.fail)throw new Error('provider private detail');
    if(state.response)return state.response;
    if(url.pathname==='/api/v2/getAddressInformation')return Response.json({ok:true,result:{state:state.active?'active':'uninitialized'}});
    if(url.pathname==='/api/v2/runGetMethod'){
      assert.equal(init?.method,'POST');const body=JSON.parse(String(init?.body));
      assert.equal(body.address,config.usdtMaster);assert.equal(body.method,'get_wallet_address');assert.equal(body.stack[0][0],'tvm.Slice');
      assert.equal(Cell.fromBase64(body.stack[0][1]).beginParse().loadAddress().toRawString(),config.recipient);
      return Response.json({ok:true,result:{exit_code:state.deriveSuccess?0:1,stack:[['cell',{bytes:beginCell().storeAddress(Address.parse(state.deriveWallet)).endCell().toBoc().toString('base64')}]]}});
    }
    assert.equal(url.pathname,'/api/v3/transactions');
    if(url.searchParams.has('start_lt'))return Response.json({transactions:state.scan});
    const hash=url.searchParams.get('hash');
    const result=hash===txHash?state.incoming:hash===creditHash?state.credit:null;
    assert.ok(result,'Only known transaction hashes are queried');
    return Response.json({transactions:[result]});
  };
  return {state,requests,reader:createToncenterReader(config,{apiKey:'test-only-key',fetcher})};
}
const chainCode=(code:TonChainError['code'])=>(error:unknown)=>error instanceof TonChainError&&error.code===code;
const invoice=(asset:'TON'|'USDT'='TON'):TonInvoice=>({id:'invoice-1',userId:'buyer-1',quoteId:'quote-1',itemIds:['S004'],termsRevision:'terms-1',asset,network:config.network,recipient:config.recipient,jettonMaster:asset==='TON'?null:config.usdtMaster,amountBaseUnits:asset==='TON'?'16000000000':'16000000',comment:invoiceComment,createdAt:1000,expiresAt:1900,fxQuoteId:'fx-1',idempotencyKey:'key-1',inputDigest:'a'.repeat(64),status:'pending',deliveryState:'not_ready',paidAt:null,settlementEventKey:null});

test('provider reads a finalized native transfer, parses its real BOC comment and passes pure verification',async()=>{
  const f=fixture();const proof=await f.reader.readProof(txHash,'TON');
  assert.equal(proof.incoming.comment,invoiceComment);assert.equal(proof.incoming.amountBaseUnits,'16000000000');assert.equal(proof.incoming.source,source);
  assert.equal((await verifyTonPayment(invoice(),proof,1300)).invoiceId,'invoice-1');
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].url.searchParams.get('account'),config.recipient);
});
test('provider accepts real ref or inline jetton payload only after matching source credit and trusted wallet derivation',async()=>{
  for(const ref of [true,false]){
    const f=fixture('USDT');const body=notification(42n,16000000n,source,ref);
    f.state.incoming.in_msg.message_content.body=body;f.state.credit.out_msgs[0].message_content.body=body;
    const proof=await f.reader.readProof(txHash,'USDT');
    assert.equal(proof.incoming.amountBaseUnits,'16000000','token amount is decoded, forwarding value=1 is not payment amount');
    assert.equal(proof.jetton?.creditTransactionHash,creditHash);assert.equal(proof.jetton?.wallet,wallet);
    assert.equal((await verifyTonPayment(invoice('USDT'),proof,1300)).asset,'USDT');assert.equal(f.requests.length,3);
  }
});
test('read-only activation check distinguishes active and undeployed receiving wallets',async()=>{
  const f=fixture();assert.equal(await f.reader.isRecipientActive(),true);f.state.active=false;assert.equal(await f.reader.isRecipientActive(),false);
});
test('pending, merely confirmed, emulated or malformed finality is never treated as settled',async()=>{
  for(const patch of [{finality:0},{finality:1},{emulated:true},{mc_block_seqno:0},{mc_block_seqno:1.5}]){
    const f=fixture();Object.assign(f.state.incoming,patch);await assert.rejects(f.reader.readProof(txHash,'TON'),chainCode('NOT_FINALIZED'));
  }
});
test('aborted, failed compute/action, destroyed and bounced receive transactions are rejected',async()=>{
  for(const mutate of [
    (v:ReturnType<typeof tx>)=>{v.description.aborted=true;},
    (v:ReturnType<typeof tx>)=>{v.description.compute_ph.success=false;},
    (v:ReturnType<typeof tx>)=>{v.description.action.success=false;},
    (v:ReturnType<typeof tx>)=>{v.description.destroyed=true;},
    (v:ReturnType<typeof tx>)=>{v.in_msg.bounced=true;},
  ]){const f=fixture();mutate(f.state.incoming);await assert.rejects(f.reader.readProof(txHash,'TON'),chainCode('INVALID_TRANSFER'));}
});
test('USDT forged source/derived wallet and failing get-method cannot establish genuine token identity',async()=>{
  const spoof=fixture('USDT');spoof.state.incoming.in_msg.source=source;await assert.rejects(spoof.reader.readProof(txHash,'USDT'),chainCode('INVALID_TRANSFER'));
  const derive=fixture('USDT');derive.state.deriveWallet=source;await assert.rejects(derive.reader.readProof(txHash,'USDT'),chainCode('INVALID_TRANSFER'));
  const failed=fixture('USDT');failed.state.deriveSuccess=false;await assert.rejects(failed.reader.readProof(txHash,'USDT'),chainCode('INVALID_CHAIN_RESPONSE'));
});
test('USDT credit must be final, delivered to owner and byte-identical to the received notification',async()=>{
  const unfinal=fixture('USDT');unfinal.state.credit.finality=1;await assert.rejects(unfinal.reader.readProof(txHash,'USDT'),chainCode('NOT_FINALIZED'));
  for(const mutate of [
    (f:ReturnType<typeof fixture>)=>{f.state.credit.out_msgs[0].hash='4'.repeat(64);},
    (f:ReturnType<typeof fixture>)=>{f.state.credit.out_msgs[0].destination=source;},
    (f:ReturnType<typeof fixture>)=>{f.state.credit.out_msgs[0].message_content.body=notification(43n);},
    (f:ReturnType<typeof fixture>)=>{f.state.credit.in_msg.destination=source;},
    (f:ReturnType<typeof fixture>)=>{f.state.credit.in_msg.bounced=true;},
  ]){const f=fixture('USDT');mutate(f);await assert.rejects(f.reader.readProof(txHash,'USDT'),chainCode('INVALID_TRANSFER'));}
});
test('internal-transfer amount, query ID and sender must agree with the owner notification',async()=>{
  for(const body of [creditBody(43n),creditBody(42n,16000001n),creditBody(42n,16000000n,config.recipient)]){
    const f=fixture('USDT');f.state.credit.in_msg.message_content.body=body;await assert.rejects(f.reader.readProof(txHash,'USDT'),chainCode('INVALID_TRANSFER'));
  }
});
test('malformed BOC, oversized transfer bodies and mismatching fetched hash/account fail closed',async()=>{
  for(const patch of [{hash:'9'.repeat(64)},{account:source}]){
    const f=fixture();Object.assign(f.state.incoming,patch);await assert.rejects(f.reader.readProof(txHash,'TON'),chainCode('INVALID_CHAIN_RESPONSE'));
  }
  for(const body of ['not a BOC','A'.repeat(8193),beginCell().storeUint(1,8).endCell().toBoc().toString('base64')]){
    const f=fixture();f.state.incoming.in_msg.message_content.body=body;
    if(body.length<100&&body!=='not a BOC')assert.equal((await f.reader.readProof(txHash,'TON')).incoming.comment,null);
    else await assert.rejects(f.reader.readProof(txHash,'TON'),chainCode('INVALID_CHAIN_RESPONSE'));
  }
});
test('provider has fixed origins, no redirects, bounded body size, timeout and safe unavailable errors',async()=>{
  const f=fixture();f.state.fail=true;await assert.rejects(f.reader.readProof(txHash,'TON'),chainCode('CHAIN_UNAVAILABLE'));
  for(const response of [new Response('unavailable',{status:503}),new Response(null,{status:200})]){
    const f=fixture();f.state.response=response;await assert.rejects(f.reader.readProof(txHash,'TON'),chainCode('CHAIN_UNAVAILABLE'));
  }
  for(const response of [new Response('{}',{headers:{'Content-Length':'1048577'}}),new Response('x'.repeat(1048577)),new Response('not json')]){
    const f=fixture();f.state.response=response;await assert.rejects(f.reader.readProof(txHash,'TON'),chainCode('INVALID_CHAIN_RESPONSE'));
  }
});
test('scan returns only bounded increasing account-scoped transaction identities above the persisted cursor',async()=>{
  const f=fixture();f.state.scan=[{...tx(),lt:'1001'},{...tx(),hash:'4'.repeat(64),lt:'1002',finality:1}];
  assert.deepEqual(await f.reader.scan('1000'),[{hash:txHash,lt:'1001',finalized:true},{hash:'4'.repeat(64),lt:'1002',finalized:false}]);
  assert.equal(f.requests[0].url.searchParams.get('start_lt'),'1001');assert.equal(f.requests[0].url.searchParams.get('sort'),'asc');
  for(const entries of [[{...tx(),lt:'1000'}],[{...tx(),lt:'1002'},{...tx(),lt:'1001'}],[{...tx(),lt:'01001'}],[{...tx(),lt:(1n<<64n).toString()}],[{...tx(),account:source}]]){
    f.state.scan=entries;await assert.rejects(f.reader.scan('1000'),chainCode('INVALID_CHAIN_RESPONSE'));
  }
  f.state.scan=[tx(),tx()];await assert.rejects(f.reader.scan('1000',1),chainCode('INVALID_CHAIN_RESPONSE'));
  for(const cursor of ['-1','01',(1n<<64n).toString()])await assert.rejects(f.reader.scan(cursor),chainCode('INVALID_TRANSFER'));
});
test('hash input accepts canonical provider hex/base64 while refusing arbitrary references',()=>{
  assert.equal(chainHash(Buffer.from(txHash,'hex').toString('base64')),txHash);assert.equal(chainHash(txHash.toUpperCase()),txHash);
  for(const value of ['https://example.com/tx','bad-hash','a'.repeat(65),'',null])assert.throws(()=>chainHash(value));
});
