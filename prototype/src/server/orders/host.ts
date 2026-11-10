import type {TallshiftCloudflareEnv} from '../cloudflare/env.ts';
import {primaryAuthDatabase,createAuthStore} from '../auth/store.ts';
import {readAuthSession} from '../auth/session.ts';
import {authConfiguration,requireCsrf} from '../auth/security.ts';
import {paymentConfig} from '../payments/ton/config.ts';
import {createTonPaymentStore} from '../payments/ton/store.ts';
import {createTonPaymentService,TonPaymentError} from '../payments/ton/service.ts';
import {createTonHttpHandlers} from '../payments/ton/http.ts';
import {createToncenterReader} from '../payments/ton/toncenter.ts';
import type {UsdExchangeRate} from '../payments/ton/quote.ts';
import {createCommerceStore,CommerceError} from './store.ts';
import {createCommerceService,publishedPaidReleases,type CommerceDependencies} from './service.ts';
import {createCommerceHttpHandlers} from './http.ts';
/** Required server-only commerce dependencies; no fallback tax, FX, grants or fabricated release. */
export interface CommerceHostDependencies {
 ownership:CommerceDependencies['ownership'];readiness:CommerceDependencies['readiness'];tax:CommerceDependencies['tax'];
 exchangeRate:(asset:'TON'|'USDT')=>Promise<UsdExchangeRate>;
}
/** Preparation factory, deliberately not mounted by any Next route. Uses authoritative primary D1 sessions. */
export function createCommerceHost(env:TallshiftCloudflareEnv,host:CommerceHostDependencies){
 const auth=authConfiguration(env);if(!auth)throw new CommerceError('COMMERCE_DISABLED');
 const db=primaryAuthDatabase(auth.db),authStore=createAuthStore(db),store=createCommerceStore(db);
 const enabled=env.COMMERCE_ENABLED==='true'&&env.TON_PAYMENTS_ENABLED==='true'&&Object.keys(publishedPaidReleases).length>0;
 const commerce=createCommerceService({enabled,store,ownership:host.ownership,readiness:host.readiness,tax:host.tax,releases:publishedPaidReleases});
 const authenticate=async(request:Request)=>{const session=await readAuthSession(request,db);return session?{userId:session.user.id}:null;};
 const verifyCsrf=(request:Request)=>requireCsrf(request,auth.origin,auth.secret);
 const rateLimit=async(request:Request,userId:string,action:string)=>{
  const network=await authStore.limit(`network:commerce:${action}:${request.headers.get('cf-connecting-ip')??'local-unknown'}`,120,600);
  const user=await authStore.limit(`identity:commerce:${action}:${userId}`,action==='status'||action==='order'?120:10,600);
  return network&&user;
 };
 const tonConfig=paymentConfig({enabled}),tonStore=createTonPaymentStore(db),reader=createToncenterReader(tonConfig,{apiKey:env.TONCENTER_API_KEY});
 const ton=createTonPaymentService({config:tonConfig,store:tonStore,
  resolveQuote:async(id,userId)=>{try{return await commerce.resolveQuote(id,userId);}catch(cause){if(cause instanceof CommerceError)throw new TonPaymentError(cause.code);throw cause;}},
  exchangeRate:host.exchangeRate,isRecipientActive:reader.isRecipientActive,readProof:reader.readProof,
 });
 const perRequestInvoices=(request:Request)=>createTonHttpHandlers({service:ton,store:tonStore,config:tonConfig,mainOrigin:auth.origin,authenticate,verifyCsrf,rateLimit:(userId,action)=>rateLimit(request,userId,action),webhookSecret:env.TONAPI_WEBHOOK_SECRET});
 return {
  commerce:createCommerceHttpHandlers({service:commerce,mainOrigin:auth.origin,authenticate,verifyCsrf,rateLimit}),
  createInvoice:(request:Request)=>perRequestInvoices(request).createInvoice(request),
  invoiceStatus:(request:Request,id:string)=>perRequestInvoices(request).status(request,id),
  webhook:(request:Request)=>perRequestInvoices(request).webhook(request),
  /** Trusted worker entry point only. No public status endpoint triggers chain reads. */
  reconcile:ton.reconcile,
 };
}
