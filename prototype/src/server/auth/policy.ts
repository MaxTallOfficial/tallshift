import {passwordLimits} from '../../shared/auth-policy.ts';
export const authPolicy=Object.freeze({passwordMin:passwordLimits.min,passwordMax:passwordLimits.max,sessionAbsoluteSeconds:30*86400,sessionIdleSeconds:7*86400,verifySeconds:86400,resetSeconds:3600});
export async function sha256(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export const opaqueToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export type AuthLocale='ru'|'en'|'vi';
export const authLocale=(value:unknown):AuthLocale=>value==='ru'||value==='vi'?value:'en';
