export interface AccountUser {id:string;email:string;emailVerified:boolean;name?:string}
export type SessionState={state:'loading'|'signed-out'|'signed-in'|'unavailable'|'error';user?:AccountUser};
export class AuthClientError extends Error {
  readonly code:string;
  constructor(code:string){super(code);this.code=code;}
}
function record(v:unknown):v is Record<string,unknown>{return Boolean(v)&&typeof v==='object'&&!Array.isArray(v);}
async function authFetch(url:string,options:RequestInit={}) {
  const controller=new AbortController(),source=options.signal;
  const cancel=()=>controller.abort();
  if(source?.aborted)controller.abort();else source?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(cancel,15000);
  try{return await fetch(url,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);source?.removeEventListener('abort',cancel);}
}
async function parse(response:Response):Promise<Record<string,unknown>|null> {
  if(!response.headers.get('content-type')?.includes('application/json'))throw new AuthClientError('AUTH_UNAVAILABLE');
  const value:unknown=await response.json();
  if(!response.ok){const code=record(value)&&typeof value.code==='string'?value.code:record(value)&&record(value.error)&&typeof value.error.code==='string'?value.error.code:response.status===429?'RATE_LIMITED':response.status>=500?'AUTH_UNAVAILABLE':'INVALID_INPUT';throw new AuthClientError(code);}
  if(value===null)return null;
  if(!record(value))throw new AuthClientError('AUTH_UNAVAILABLE');
  return value;
}
export async function readAuthSession(signal?:AbortSignal):Promise<SessionState> {
  try {
    const data=await parse(await authFetch('/api/auth/get-session',{credentials:'same-origin',cache:'no-store',signal}));
    if(!data)return {state:'signed-out'};
    if(!record(data.user)||typeof data.user.id!=='string'||typeof data.user.email!=='string'||typeof data.user.emailVerified!=='boolean')throw new AuthClientError('AUTH_UNAVAILABLE');
    const user=data.user;
    return {state:'signed-in',user:{id:user.id as string,email:user.email as string,emailVerified:user.emailVerified as boolean,...(typeof user.name==='string'?{name:user.name}:{})}};
  }catch(cause){if(signal?.aborted)throw cause;return {state:cause instanceof AuthClientError&&cause.code==='AUTH_UNAVAILABLE'?'unavailable':'error'};}
}
export async function readAuthReadiness(signal?:AbortSignal):Promise<{enabled:boolean;emailReady:boolean}> {
  const data=await parse(await authFetch('/api/auth/readiness',{credentials:'same-origin',cache:'no-store',signal}));
  if(!data||typeof data.enabled!=='boolean'||typeof data.emailReady!=='boolean')throw new AuthClientError('AUTH_UNAVAILABLE');
  return {enabled:data.enabled,emailReady:data.emailReady};
}
const paths=['sign-up/email','sign-in/email','sign-out','revoke-sessions','request-password-reset','reset-password','send-verification-email','verify-email'] as const;
export async function authMutation(path:typeof paths[number],data:Record<string,unknown>,signal?:AbortSignal) {
  if(!paths.includes(path))throw new AuthClientError('INVALID_INPUT');
  // Tokens live only in this request's memory; never localStorage or query parameters.
  const challenge=await parse(await authFetch('/api/auth/csrf',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:'{}',signal}));
  if(!challenge||typeof challenge.csrfToken!=='string')throw new AuthClientError('AUTH_UNAVAILABLE');
  const result=await parse(await authFetch(`/api/auth/${path}`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','x-csrf-token':challenge.csrfToken},body:JSON.stringify(data),signal}));
  if(path==='sign-in/email'||path==='sign-out'||path==='revoke-sessions'||path==='reset-password')window.dispatchEvent(new Event('tallshift:auth-changed'));
  return result;
}
