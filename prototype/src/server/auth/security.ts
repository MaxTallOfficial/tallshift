import type {TallshiftCloudflareEnv} from '../cloudflare/env.ts';
import {opaqueToken} from './policy.ts';
import {sessionCookie} from './engine.ts';
import {createAuthStore,type AuthDatabase} from './store.ts';
export const csrfCookie='__Host-tallshift_csrf';
export function readCookie(request:Request,name:string){const parts=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(`${name}=`));return parts.length===1?parts[0].slice(name.length+1):'';}
export const cookie=(name:string,value:string,seconds:number)=>`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
const key=(secret:string)=>crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
export function exactOrigin(request:Request,origin:string){return request.headers.get('origin')===origin&&(!request.headers.get('sec-fetch-site')||request.headers.get('sec-fetch-site')==='same-origin');}
export async function issueCsrf(request:Request,origin:string,secret:string){
  if(!exactOrigin(request,origin))return null;
  const csrfToken=`${opaqueToken()}.${Date.now()}`,binding=readCookie(request,sessionCookie);
  const signature=hex(await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode(`${csrfToken}|${binding}`)));
  return {csrfToken,cookie:cookie(csrfCookie,`${csrfToken}.${signature}`,7200)};
}
export async function requireCsrf(request:Request,origin:string,secret:string){
  if(!exactOrigin(request,origin))return false;
  const token=request.headers.get('x-csrf-token')??'',stored=readCookie(request,csrfCookie);
  if(!/^[a-f0-9]{64}\.\d{13}$/.test(token)||!stored.startsWith(`${token}.`))return false;
  const age=Date.now()-Number(token.split('.')[1]),signature=stored.slice(token.length+1);
  if(age<0||age>7200000||!/^[a-f0-9]{64}$/.test(signature))return false;
  return crypto.subtle.verify('HMAC',await key(secret),Uint8Array.from(signature.match(/../g)!,v=>parseInt(v,16)),new TextEncoder().encode(`${token}|${readCookie(request,sessionCookie)}`));
}
/** Use only Cloudflare's overwritten network header; no X-Forwarded-For fallback. */
export async function rateLimitAuth(db:AuthDatabase,request:Request,action:string,identity=''){
  const store=createAuthStore(db),ip=request.headers.get('cf-connecting-ip')??'local-unknown';
  const network=await store.limit(`network:${action}:${ip}`,action==='csrf'?120:30,600);
  const subject=identity?await store.limit(`identity:${action}:${identity}`,action==='sign-in/email'?10:5,600):true;
  return network&&subject;
}
export function authConfiguration(env:TallshiftCloudflareEnv|null){
  if(!env||env.AUTH_ENABLED!=='true'||!env.DB||!env.AUTH_SECRET||env.AUTH_SECRET.length<32||!env.APP_URL)return null;
  try {const url=new URL(env.APP_URL);if(url.protocol!=='https:'||url.origin!==env.APP_URL)return null;return {db:env.DB,origin:url.origin,secret:env.AUTH_SECRET};}catch{return null;}
}
