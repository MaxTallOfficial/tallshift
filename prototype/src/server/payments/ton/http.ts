import {TonPaymentError,type createTonPaymentService} from './service.ts';
import {PaymentStoreError,type TonPaymentStore} from './store.ts';
import {canonicalAddress} from './config.ts';
import type {TonPaymentConfig} from './config.ts';
type Session={userId:string};
type Service=ReturnType<typeof createTonPaymentService>;
export interface TonHttpDependencies {
  service:Service;store:TonPaymentStore;config:TonPaymentConfig;mainOrigin:string;
  /** Host verifies its opaque HttpOnly cookie against the authoritative session store. */
  authenticate:(request:Request)=>Promise<Session|null>;
  /** Host checks the CSRF token bound to that session. Origin is also checked here. */
  verifyCsrf:(request:Request,session:Session)=>Promise<boolean>;
  rateLimit:(userId:string,action:'create'|'status')=>Promise<boolean>;
  /** TonAPI webhook bearer secret, not the TonAPI management/API key. */
  webhookSecret?:string;
  now?:()=>number;
}
function json(value:unknown,status=200,extra:Record<string,string>={}) {return Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...extra}});}
function error(code:string,status:number,headers:Record<string,string>={}) {return json({error:{code,requestId:crypto.randomUUID(),retryable:status===429||status>=500}},status,headers);}
function failure(cause:unknown) {
  const code=cause instanceof TonPaymentError||cause instanceof PaymentStoreError?cause.code:'TEMPORARILY_UNAVAILABLE';
  const statuses:Record<string,number>={INVALID_INPUT:400,NOT_FOUND:404,QUOTE_EXPIRED:409,OFFER_CHANGED:409,IDEMPOTENCY_CONFLICT:409,COMMERCE_DISABLED:503};
  return error(Object.hasOwn(statuses,code)?code:'TEMPORARILY_UNAVAILABLE',statuses[code]??503);
}
async function body(request:Request,limit:number):Promise<unknown> {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new TonPaymentError('INVALID_INPUT');
  if(Number(request.headers.get('content-length'))>limit)throw new RangeError('PAYLOAD_TOO_LARGE');
  if(!request.body)throw new TonPaymentError('INVALID_INPUT');
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try {for(;;){const value=await reader.read();if(value.done)break;size+=value.value.byteLength;if(size>limit){await reader.cancel();throw new RangeError('PAYLOAD_TOO_LARGE');}chunks.push(value.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new TonPaymentError('INVALID_INPUT');}
}
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
async function hash(text:string) {return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));}
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function sameSecret(actual:string,expected:string) {const [a,b]=await Promise.all([hash(actual),hash(expected)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;}

/** Mount these factories only after real auth, server quotes, rate limits and D1 have been wired. */
export function createTonHttpHandlers(deps:TonHttpDependencies) {
  const origin=new URL(deps.mainOrigin);
  if(origin.origin!==deps.mainOrigin)throw new Error('EXACT_MAIN_ORIGIN_REQUIRED');
  return {
    async createInvoice(request:Request) {
      if(request.method!=='POST')return error('METHOD_NOT_ALLOWED',405,{Allow:'POST'});
      try {
        if(request.headers.get('origin')!==deps.mainOrigin)return error('INVALID_ORIGIN',403);
        const session=await deps.authenticate(request);
        if(!session)return error('UNAUTHENTICATED',401);
        if(!await deps.verifyCsrf(request,session))return error('INVALID_CSRF',403);
        if(!await deps.rateLimit(session.userId,'create'))return error('RATE_LIMITED',429,{'Retry-After':'60'});
        const value=await body(request,4096);
        if(!record(value)||Object.keys(value).length!==2||!Object.hasOwn(value,'quoteId')||!Object.hasOwn(value,'asset')||typeof value.quoteId!=='string'||!['TON','USDT'].includes(String(value.asset)))return error('INVALID_INPUT',400);
        const invoice=await deps.service.createInvoice(session.userId,{quoteId:value.quoteId,asset:value.asset as 'TON'|'USDT',idempotencyKey:request.headers.get('idempotency-key')??''});
        return json(invoice,201);
      }catch(cause){return cause instanceof RangeError?error('PAYLOAD_TOO_LARGE',413):failure(cause);}
    },
    async status(request:Request,invoiceId:string) {
      if(request.method!=='GET')return error('METHOD_NOT_ALLOWED',405,{Allow:'GET'});
      try {
        const session=await deps.authenticate(request);
        if(!session)return error('UNAUTHENTICATED',401);
        if(!await deps.rateLimit(session.userId,'status'))return error('RATE_LIMITED',429,{'Retry-After':'60'});
        return json(await deps.service.status(session.userId,invoiceId));
      }catch(cause){return failure(cause);}
    },
    async webhook(request:Request) {
      if(request.method!=='POST')return error('METHOD_NOT_ALLOWED',405,{Allow:'POST'});
      // Existing issued invoices must keep reconciling even when new sales are disabled.
      const secret=deps.webhookSecret;
      if(!secret||secret.length<32||secret.length>1024)return error('TEMPORARILY_UNAVAILABLE',503);
      try {
        if(!await sameSecret(request.headers.get('authorization')??'',`Bearer ${secret}`))return error('UNAUTHENTICATED',401);
        const value=await body(request,16384);
        if(!record(value)||Object.keys(value).sort().join(',')!=='account_id,event_type,lt,tx_hash'||value.event_type!=='account_tx'||typeof value.account_id!=='string'||typeof value.lt!=='string'||!/^[1-9]\d{0,19}$/.test(value.lt)||BigInt(value.lt)>=(1n<<64n)||typeof value.tx_hash!=='string'||!/^[a-f0-9]{64}$/.test(value.tx_hash))return error('INVALID_INPUT',400);
        try {if(canonicalAddress(value.account_id,deps.config.network)!==deps.config.recipient)return error('INVALID_INPUT',400);}catch{return error('INVALID_INPUT',400);}
        const reference=`${deps.config.network}:${deps.config.recipient}:${value.lt}:${value.tx_hash}`;
        // Derive the dedupe key ourselves; HTTP Idempotency-Key is only a delivery hint.
        const receiptDigest=hex(await hash(reference));
        await deps.store.receiveWebhook({eventKey:`hint_${receiptDigest}`,bodyDigest:receiptDigest,receivedAt:(deps.now??(()=>Math.floor(Date.now()/1000)))(),reference});
        return json({received:true},202);
      }catch(cause){return cause instanceof RangeError?error('PAYLOAD_TOO_LARGE',413):failure(cause);}
    },
  };
}
