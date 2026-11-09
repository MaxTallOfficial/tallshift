import type {TallshiftCloudflareEnv} from '../cloudflare/env.ts';
import {getCloudflareEnv} from '../cloudflare/env.ts';
import {createAuthEngine,sessionCookie} from './engine.ts';
import {createAuthStore,primaryAuthDatabase} from './store.ts';
import {authPolicy,authLocale,opaqueToken} from './policy.ts';
import {authConfiguration,cookie,csrfCookie,issueCsrf,readCookie,requireCsrf,rateLimitAuth} from './security.ts';
import {emailReady,sendAuthEmail} from './mail.ts';
import {readAuthSession} from './session.ts';
const json=(body:unknown,status=200,headers:HeadersInit={})=>Response.json(body,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer',...headers}});
const error=(code:string,status:number)=>json({code},status);
async function readBody(request:Request){
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return null;
  if(Number(request.headers.get('content-length')??0)>4096)return null;
  const reader=request.body?.getReader();if(!reader)return null;
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return null;}chunks.push(value);}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  try{const body=JSON.parse(new TextDecoder().decode(bytes));return body&&typeof body==='object'&&!Array.isArray(body)?body as Record<string,unknown>:null;}catch{return null;}
}
function emailValue(value:unknown){if(typeof value!=='string'||value.length>254)return null;const email=value.trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;}
const passwordValid=(value:unknown):value is string=>typeof value==='string'&&value.length>=authPolicy.passwordMin&&value.length<=authPolicy.passwordMax;
const tokenValid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const actions=new Set(['csrf','sign-up/email','sign-in/email','sign-out','revoke-sessions','request-password-reset','reset-password','send-verification-email','verify-email']);
export async function handleAuthRequest(request:Request,env:TallshiftCloudflareEnv|null){
  const path=new URL(request.url).pathname.replace(/^\/api\/auth\/?/,'');
  const config=authConfiguration(env);
  if(request.method==='GET'&&path==='readiness')return json({enabled:!!config,emailReady:!!config&&emailReady(env)});
  if(!config)return error('AUTH_UNAVAILABLE',503);
  const db=primaryAuthDatabase(config.db),store=createAuthStore(db);
  try{
    if(request.method==='GET'&&path==='get-session')return json(await readAuthSession(request,db));
    if(request.method!=='POST'||!actions.has(path))return error('NOT_FOUND',404);
    if(path!=='csrf'&&!await requireCsrf(request,config.origin,config.secret))return error('INVALID_CSRF',403);
    const body=await readBody(request);if(!body)return error('INVALID_INPUT',400);
    if(path==='csrf'){
      const result=await issueCsrf(request,config.origin,config.secret);if(!result)return error('INVALID_CSRF',403);
      if(!await rateLimitAuth(db,request,path))return error('RATE_LIMITED',429);
      return json({csrfToken:result.csrfToken},200,{'set-cookie':result.cookie});
    }
    const email=emailValue(body.email),locale=authLocale(body.locale);
    if(!await rateLimitAuth(db,request,path,email??''))return error('RATE_LIMITED',429);
    if(path==='sign-out'||path==='revoke-sessions'){
      if(path==='revoke-sessions'){const session=await readAuthSession(request,db);if(!session)return error('UNAUTHORIZED',401);await store.logoutAll(session.user.id);}
      else {const raw=readCookie(request,sessionCookie);if(raw)await store.logout(raw);}
      const response=json({ok:true});response.headers.append('set-cookie',cookie(sessionCookie,'',0));response.headers.append('set-cookie',cookie(csrfCookie,'',0));return response;
    }
    if(path==='verify-email'){
      if(!tokenValid(body.token))return error('INVALID_TOKEN',400);
      return await store.consumeAction(body.token,'verify')?json({ok:true}):error('INVALID_TOKEN',400);
    }
    const engine=createAuthEngine(db,config.origin,config.secret),context=await engine.$context;
    if(path==='reset-password'){
      if(!tokenValid(body.token)||!passwordValid(body.newPassword))return error('INVALID_INPUT',400);
      const hash=await context.password.hash(body.newPassword);
      return await store.consumeAction(body.token,'reset',hash)?json({ok:true}):error('INVALID_TOKEN',400);
    }
    if(!email)return error('INVALID_INPUT',400);
    if(path==='sign-in/email'){
      if(!passwordValid(body.password))return error('INVALID_CREDENTIALS',401);
      try{
        const result=await engine.api.signInEmail({body:{email,password:body.password},headers:request.headers});
        return json({ok:true},200,{'set-cookie':cookie(sessionCookie,result.token,authPolicy.sessionAbsoluteSeconds)});
      }catch(cause){
        // Better Auth checks the password before this verification error; expose only this safe code.
        if(cause&&typeof cause==='object'&&'body' in cause){const body=cause.body;if(body&&typeof body==='object'&&'code' in body&&body.code==='EMAIL_NOT_VERIFIED')return error('EMAIL_NOT_VERIFIED',403);}
        return error('INVALID_CREDENTIALS',401);
      }
    }
    if(!emailReady(env))return error('EMAIL_UNAVAILABLE',503);
    const token=opaqueToken();
    if(path==='sign-up/email'){
      if(!passwordValid(body.password))return error('INVALID_INPUT',400);
      // Hash on duplicate registrations too. Registration never signs in or reveals existence.
      const hash=await context.password.hash(body.password);
      if(await store.register(email,hash,'',token))await sendAuthEmail(env!,config.origin,email,token,'verify',locale);
      return json({ok:true});
    }
    const user=await store.userByEmail(email),purpose=path==='request-password-reset'?'reset':'verify';
    if(user&&(purpose==='reset'||!user.emailVerified)){
      await store.issueAction(token,user.id,purpose,purpose==='reset'?authPolicy.resetSeconds:authPolicy.verifySeconds);
      await sendAuthEmail(env!,config.origin,email,token,purpose,locale);
    }
    return json({ok:true});
  }catch{return error('AUTH_UNAVAILABLE',503);}
}
export async function authRoute(request:Request){return handleAuthRequest(request,await getCloudflareEnv());}
