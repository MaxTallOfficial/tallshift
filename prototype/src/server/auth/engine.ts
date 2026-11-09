import {betterAuth} from 'better-auth';
import {drizzleAdapter} from '@better-auth/drizzle-adapter';
import {drizzle} from 'drizzle-orm/d1';
import {authSchema} from '../db/auth-schema.ts';
import {hashedSessionAdapter} from './adapter.ts';
import {createAuthStore,type AuthDatabase} from './store.ts';
import {authPolicy} from './policy.ts';

export const sessionCookie='__Host-tallshift_session';
export function createAuthEngine(db:AuthDatabase,origin:string,secret:string) {
  const store=createAuthStore(db);
  const database=drizzle(db,{schema:authSchema});
  const auth=betterAuth({
    appName:'Tallshift',baseURL:origin,basePath:'/api/auth',secret,trustedOrigins:[origin],
    database:hashedSessionAdapter(drizzleAdapter(database,{provider:'sqlite',schema:authSchema,transaction:false})),
    logger:{disabled:true},
    emailAndPassword:{enabled:true,requireEmailVerification:true,minPasswordLength:authPolicy.passwordMin,maxPasswordLength:authPolicy.passwordMax,autoSignIn:false,revokeSessionsOnPasswordReset:true},
    emailVerification:{autoSignInAfterVerification:false,sendOnSignUp:false,sendOnSignIn:false},
    session:{expiresIn:authPolicy.sessionAbsoluteSeconds,disableSessionRefresh:true,cookieCache:{enabled:false},additionalFields:{authVersion:{type:'number',required:true,input:false,defaultValue:0}}},
    verification:{storeIdentifier:'hashed'},
    advanced:{useSecureCookies:true,disableOriginCheck:false,crossSubDomainCookies:{enabled:false},cookies:{session_token:{name:sessionCookie,attributes:{secure:true,httpOnly:true,sameSite:'lax',path:'/'}}}},
    databaseHooks:{session:{create:{before:async(session,ctx)=>{
      // Recheck current credential and epoch before insert; the D1 trigger closes reset/login races.
      const credential=await store.credential(session.userId),password=ctx?.body?.password;
      if(!credential||typeof password!=='string')return false;
      const context=await auth.$context;
      if(!await context.password.verify({hash:credential.password,password}))return false;
      return {data:{...session,authVersion:credential.version}};
    }}}},
  });
  return auth;
}
