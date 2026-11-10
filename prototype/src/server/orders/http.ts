import {CommerceError,type PaidPlan} from './store.ts';
import type {createCommerceService} from './service.ts';
export interface CommerceHttpDependencies {
 service:ReturnType<typeof createCommerceService>;mainOrigin:string;
 authenticate:(request:Request)=>Promise<{userId:string}|null>;
 verifyCsrf:(request:Request)=>Promise<boolean>;
 rateLimit:(request:Request,userId:string,action:'quote'|'order')=>Promise<boolean>;
}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export function commerceFailure(cause:unknown){
 const code=cause instanceof CommerceError?cause.code:'TEMPORARILY_UNAVAILABLE';
 const status={INVALID_INPUT:400,NOT_FOUND:404,IDEMPOTENCY_CONFLICT:409,OFFER_CHANGED:409,QUOTE_EXPIRED:409,COMMERCE_DISABLED:503,TEMPORARILY_UNAVAILABLE:503}[code];
 return json({error:{code,retryable:status>=500}},status);
}
export function createCommerceHttpHandlers(deps:CommerceHttpDependencies){
 const origin=new URL(deps.mainOrigin);if(origin.protocol!=='https:'||origin.origin!==deps.mainOrigin)throw new Error('EXACT_HTTPS_ORIGIN_REQUIRED');
 return {
  async quote(request:Request){
   if(request.method!=='POST')return json({error:{code:'METHOD_NOT_ALLOWED'}},405);
   try{
    if(request.headers.get('origin')!==deps.mainOrigin)return json({error:{code:'INVALID_ORIGIN'}},403);
    const session=await deps.authenticate(request);if(!session)return json({error:{code:'UNAUTHENTICATED'}},401);
    if(!await deps.verifyCsrf(request))return json({error:{code:'INVALID_CSRF'}},403);
    if(!await deps.rateLimit(request,session.userId,'quote'))return json({error:{code:'RATE_LIMITED'}},429);
    if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new CommerceError('INVALID_INPUT');
    if(Number(request.headers.get('content-length')??0)>1024)return json({error:{code:'PAYLOAD_TOO_LARGE'}},413);
    const reader=request.body?.getReader();if(!reader)throw new CommerceError('INVALID_INPUT');
    let size=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
    try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return json({error:{code:'PAYLOAD_TOO_LARGE'}},413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}catch(cause){if(cause instanceof TypeError)throw new CommerceError('INVALID_INPUT');throw cause;}finally{reader.releaseLock();}
    let value:unknown;try{value=JSON.parse(text);}catch{throw new CommerceError('INVALID_INPUT');}
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).join(',')!=='plan'||!['product','bundle'].includes(String((value as {plan:unknown}).plan)))throw new CommerceError('INVALID_INPUT');
    return json(await deps.service.createQuote(session.userId,{plan:(value as {plan:PaidPlan}).plan,idempotencyKey:request.headers.get('idempotency-key')??''}),201);
   }catch(cause){return commerceFailure(cause);}
  },
  async order(request:Request,id:string){
   if(request.method!=='GET')return json({error:{code:'METHOD_NOT_ALLOWED'}},405);
   try{const session=await deps.authenticate(request);if(!session)return json({error:{code:'UNAUTHENTICATED'}},401);if(!await deps.rateLimit(request,session.userId,'order'))return json({error:{code:'RATE_LIMITED'}},429);return json(await deps.service.orderStatus(session.userId,id));}catch(cause){return commerceFailure(cause);}
  },
 };
}
