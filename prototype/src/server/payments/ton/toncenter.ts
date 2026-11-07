import {Address,beginCell,Cell,type Slice} from '@ton/core';
import type {TonPaymentConfig} from './config.ts';
import {canonicalAddress} from './config.ts';
import type {TonAsset} from './store.ts';
import type {TonChainProof} from './verification.ts';

type ObjectValue=Record<string,unknown>;
const object=(v:unknown):ObjectValue=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_CHAIN_RESPONSE');return v as ObjectValue;};
const array=(v:unknown):unknown[]=>{if(!Array.isArray(v))throw new Error('INVALID_CHAIN_RESPONSE');return v;};
const string=(v:unknown):string=>{if(typeof v!=='string')throw new Error('INVALID_CHAIN_RESPONSE');return v;};
export class TonChainError extends Error {
  readonly code:'CHAIN_UNAVAILABLE'|'INVALID_CHAIN_RESPONSE'|'NOT_FINALIZED'|'INVALID_TRANSFER'|'UNMATCHED_TRANSFER';
  constructor(code:TonChainError['code']){super(code);this.code=code;}
}
export function chainHash(value:unknown):string {
  const s=string(value);
  if(/^[a-fA-F0-9]{64}$/.test(s))return s.toLowerCase();
  if(!/^[a-zA-Z0-9+/_-]{43}=?$/.test(s))throw new Error('INVALID_CHAIN_HASH');
  const bytes=Buffer.from(s,'base64url');
  if(bytes.length!==32)throw new Error('INVALID_CHAIN_HASH');
  return bytes.toString('hex');
}
function slice(body:unknown):Slice {
  const boc=string(body);
  if(boc.length>8192||!/^[A-Za-z0-9+/]+={0,2}$/.test(boc))throw new Error('INVALID_TRANSFER_BODY');
  return Cell.fromBase64(boc).beginParse();
}
function comment(body:Slice):string|null {
  if(body.remainingBits<32||body.loadUint(32)!==0)return null;
  const text=body.loadStringTail();
  return /^ts_[a-f0-9]{32}$/.test(text)?text:null;
}
function notification(body:Slice) {
  if(body.remainingBits<32||body.loadUint(32)!==0x7362d09c)throw new TonChainError('UNMATCHED_TRANSFER');
  const queryId=body.loadUintBig(64),amount=body.loadCoins(),sender=body.loadAddress().toRawString();
  const forward=body.loadBit()?body.loadRef().beginParse():body;
  return {queryId,amount:amount.toString(),sender,comment:comment(forward)};
}
function checkFinalized(tx:ObjectValue) {
  if(tx.emulated===true||tx.finality!==2||!Number.isSafeInteger(tx.mc_block_seqno)||Number(tx.mc_block_seqno)<=0)throw new TonChainError('NOT_FINALIZED');
  const d=object(tx.description),compute=object(d.compute_ph);
  if(d.aborted!==false||d.destroyed===true||compute.success!==true||(d.action!==undefined&&d.action!==null&&object(d.action).success!==true))throw new TonChainError('INVALID_TRANSFER');
}
/** Fixed provider origins. Neither invoice JSON nor webhook can change the fetch destination. */
export function createToncenterReader(config:TonPaymentConfig,options:{apiKey?:string;fetcher?:typeof fetch}={}) {
  const origin=config.network==='ton-mainnet'?'https://toncenter.com':'https://testnet.toncenter.com';
  const fetcher=options.fetcher??fetch;
  const json=async(path:string,query?:Record<string,string>,post?:ObjectValue)=>{
    const url=new URL(path,origin);
    for(const [key,value] of Object.entries(query??{}))url.searchParams.set(key,value);
    const headers:Record<string,string>={Accept:'application/json'};
    if(options.apiKey)headers['X-API-Key']=options.apiKey;
    if(post)headers['Content-Type']='application/json';
    let response:Response;
    try {response=await fetcher(url,{method:post?'POST':'GET',headers,body:post?JSON.stringify(post):undefined,redirect:'error',signal:AbortSignal.timeout(8000)});}catch{throw new TonChainError('CHAIN_UNAVAILABLE');}
    if(!response.ok||!response.body)throw new TonChainError('CHAIN_UNAVAILABLE');
    if(Number(response.headers.get('content-length'))>1048576)throw new TonChainError('INVALID_CHAIN_RESPONSE');
    const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
    try {for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>1048576){await reader.cancel();throw new TonChainError('INVALID_CHAIN_RESPONSE');}chunks.push(next.value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    try {return object(JSON.parse(new TextDecoder().decode(bytes)));}catch{throw new TonChainError('INVALID_CHAIN_RESPONSE');}
  };
  const transaction=async(hash:string,account:string)=>{
    const data=await json('/api/v3/transactions',{account,hash,limit:'2'});
    const entries=array(data.transactions);
    if(entries.length!==1)throw new TonChainError('INVALID_CHAIN_RESPONSE');
    const tx=object(entries[0]);
    if(chainHash(tx.hash)!==hash||canonicalAddress(string(tx.account),config.network)!==account)throw new TonChainError('INVALID_CHAIN_RESPONSE');
    checkFinalized(tx);return tx;
  };
  const deriveWallet=async()=>{
    const owner=beginCell().storeAddress(Address.parse(config.recipient)).endCell().toBoc().toString('base64');
    const result=await json('/api/v2/runGetMethod',undefined,{address:config.usdtMaster,method:'get_wallet_address',stack:[['tvm.Slice',owner]]});
    if(result.ok!==true)throw new TonChainError('INVALID_CHAIN_RESPONSE');
    const data=object(result.result),stack=array(data.stack);
    if(data.exit_code!==0||stack.length!==1)throw new TonChainError('INVALID_CHAIN_RESPONSE');
    const pair=array(stack[0]);
    if(pair[0]!=='cell')throw new TonChainError('INVALID_CHAIN_RESPONSE');
    const bytes=object(pair[1]).bytes;
    return canonicalAddress(slice(bytes).loadAddress().toRawString(),config.network);
  };
  return {
    async isRecipientActive() {
      const response=await json('/api/v2/getAddressInformation',{address:config.recipient});
      if(response.ok!==true)throw new TonChainError('CHAIN_UNAVAILABLE');
      return object(response.result).state==='active';
    },
    async readProof(hash:string,asset:TonAsset):Promise<TonChainProof> {
      if(!/^[a-f0-9]{64}$/.test(hash)||!['TON','USDT'].includes(asset))throw new TonChainError('INVALID_TRANSFER');
      try {
        const tx=await transaction(hash,config.recipient),incoming=object(tx.in_msg);
        if(incoming.source===null||incoming.source==='')throw new TonChainError('UNMATCHED_TRANSFER');
        if(incoming.bounced!==false)throw new TonChainError('INVALID_TRANSFER');
        const base:TonChainProof={network:config.network,account:canonicalAddress(string(tx.account),config.network),transactionHash:hash,lt:string(tx.lt),transactionAt:Number(tx.now),successful:true,aborted:false,finalized:true,masterchainSeqno:Number(tx.mc_block_seqno),outgoingMessageCount:array(tx.out_msgs).length,asset,incoming:{bounced:false,source:canonicalAddress(string(incoming.source),config.network),destination:canonicalAddress(string(incoming.destination),config.network),amountBaseUnits:string(incoming.value),comment:null}};
        const body=slice(object(incoming.message_content).body);
        if(asset==='TON'){base.incoming.comment=comment(body);return base;}
        const notice=notification(body),wallet=await deriveWallet();
        if(base.incoming.source!==wallet||base.outgoingMessageCount!==0)throw new TonChainError('INVALID_TRANSFER');
        const creditHash=chainHash(incoming.in_msg_tx_hash),credit=await transaction(creditHash,wallet);
        const delivered=array(credit.out_msgs).map(object).filter(message=>chainHash(message.hash)===chainHash(incoming.hash));
        if(delivered.length!==1||canonicalAddress(string(delivered[0].destination),config.network)!==config.recipient||string(object(delivered[0].message_content).body)!==string(object(incoming.message_content).body))throw new TonChainError('INVALID_TRANSFER');
        const deposit=object(credit.in_msg);
        if(deposit.bounced!==false||canonicalAddress(string(deposit.destination),config.network)!==wallet)throw new TonChainError('INVALID_TRANSFER');
        const credited=slice(object(deposit.message_content).body);
        if(credited.loadUint(32)!==0x178d4519||credited.loadUintBig(64)!==notice.queryId||credited.loadCoins().toString()!==notice.amount||credited.loadAddress().toRawString()!==notice.sender)throw new TonChainError('INVALID_TRANSFER');
        base.incoming.amountBaseUnits=notice.amount;base.incoming.comment=notice.comment;
        base.jetton={master:config.usdtMaster,owner:config.recipient,wallet,derivedWallet:wallet,notificationSender:base.incoming.source,notificationOpcode:'0x7362d09c',credited:true,creditTransactionHash:creditHash};
        return base;
      }catch(error){if(error instanceof TonChainError)throw error;throw new TonChainError('INVALID_CHAIN_RESPONSE');}
    },
    /** Host persists last processed lt only after all earlier records are durably handled. */
    async scan(afterLt:string,limit=100) {
      if(!/^(?:0|[1-9]\d{0,19})$/.test(afterLt)||BigInt(afterLt)>=(1n<<64n)||!Number.isInteger(limit)||limit<1||limit>100)throw new TonChainError('INVALID_TRANSFER');
      const data=await json('/api/v3/transactions',{account:config.recipient,start_lt:(BigInt(afterLt)+1n).toString(),limit:String(limit),sort:'asc'});
      const entries=array(data.transactions);
      if(entries.length>limit)throw new TonChainError('INVALID_CHAIN_RESPONSE');
      let previous=BigInt(afterLt);
      return entries.map(value=>{
        const tx=object(value),lt=string(tx.lt);
        if(!/^[1-9]\d{0,19}$/.test(lt)||BigInt(lt)>=(1n<<64n)||BigInt(lt)<=previous||canonicalAddress(string(tx.account),config.network)!==config.recipient)throw new TonChainError('INVALID_CHAIN_RESPONSE');
        previous=BigInt(lt);return {hash:chainHash(tx.hash),lt,finalized:tx.finality===2};
      });
    },
  };
}
