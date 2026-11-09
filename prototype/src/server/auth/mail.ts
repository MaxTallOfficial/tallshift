import type {TallshiftCloudflareEnv} from '../cloudflare/env.ts';
import {authEmailCopy} from '../../product/auth-email-copy.ts';
import {authPolicy,type AuthLocale} from './policy.ts';
export function emailReady(env:TallshiftCloudflareEnv|null){
  if(!env?.AUTH_EMAIL_API_URL||!env.AUTH_EMAIL_API_KEY||!env.AUTH_EMAIL_FROM)return false;
  try{return new URL(env.AUTH_EMAIL_API_URL).protocol==='https:';}catch{return false;}
}
/** Delivery endpoint accepts {from,to,subject,text}; tokens and bodies are never logged. */
export async function sendAuthEmail(env:TallshiftCloudflareEnv,origin:string,email:string,token:string,purpose:'verify'|'reset',locale:AuthLocale){
  if(!emailReady(env))throw new Error('EMAIL_UNAVAILABLE');
  const copy=authEmailCopy[locale][purpose==='verify'?'verification':'passwordReset'];
  const url=new URL(`/${locale}/auth/${purpose==='verify'?'verify-email':'reset-password'}`,origin);url.searchParams.set('token',token);
  const seconds=purpose==='verify'?authPolicy.verifySeconds:authPolicy.resetSeconds;
  const text=[copy.title,copy.intro,`${copy.action}: ${url.href}`,`${copy.expires} ${new Date(Date.now()+seconds*1000).toISOString()}`,copy.ignore].join('\n\n');
  const response=await fetch(env.AUTH_EMAIL_API_URL!,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${env.AUTH_EMAIL_API_KEY}`},body:JSON.stringify({from:env.AUTH_EMAIL_FROM,to:email,subject:copy.subject,text}),signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok)throw new Error('EMAIL_UNAVAILABLE');
  await response.body?.cancel();
}
