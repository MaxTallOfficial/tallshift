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
import type {TonChainProof} from '../payments/ton/verification.ts';
import {currentReleaseHashes,paidReleaseRegistry,validatePaidReleases,type PaidRelease} from '../delivery/releases.ts';
import {createR2ArtifactStore,type PrivateArtifactStore} from '../delivery/storage.ts';
import {createDownloadTickets,type DownloadTicketSigner} from '../delivery/tickets.ts';
import {createDeliveryHttpHandlers} from '../delivery/downloads.ts';
import {createCommerceStore,CommerceError} from './store.ts';
import {createCommerceService,type CommerceDependencies} from './service.ts';
import {createCommerceHttpHandlers} from './http.ts';
import {createCommerceLedger} from './ledger.ts';
import {deliveryFlagEnabled,salesFlagsEnabled} from './flags.ts';

/** Required server-only launch dependencies; no fallback price, tax, FX, terms or fabricated release. */
export interface CommerceHostDependencies {
 readiness:CommerceDependencies['readiness'];tax:CommerceDependencies['tax'];price:CommerceDependencies['price'];
 /** USDT: the price itself (no market rate); TON (Gram): an approved FX provider only. */
 exchangeRate:(asset:'TON'|'USDT')=>Promise<UsdExchangeRate>;
}
export interface CommerceHostOptions {
 /** Test seam; the real host always uses the reviewed server registry. */
 releases?:readonly PaidRelease[];
 /** Test seam; the real host uses the private R2 binding PAID_ARTIFACTS when present. */
 storage?:PrivateArtifactStore|null;
 /** Test seam; the real host uses the fixed read-only Toncenter adapter. */
 reader?:{isRecipientActive():Promise<boolean>;readProof(hash:string,asset:'TON'|'USDT'):Promise<TonChainProof>};
 now?:()=>number;
}

/** Authenticated commerce host built on primary D1 sessions. Requires configured auth. */
export function createCommerceHost(env:TallshiftCloudflareEnv,host:CommerceHostDependencies,options:CommerceHostOptions={}){
 const auth=authConfiguration(env);if(!auth)throw new CommerceError('COMMERCE_DISABLED');
 const db=primaryAuthDatabase(auth.db),authStore=createAuthStore(db),store=createCommerceStore(db),ledger=createCommerceLedger(db);
 const releases=validatePaidReleases(options.releases??paidReleaseRegistry),current=currentReleaseHashes(releases);
 const enabled=salesFlagsEnabled(env)&&Object.keys(current).length>0;
 const commerce=createCommerceService({enabled,store,periods:ledger.accessPeriods,price:host.price,readiness:host.readiness,tax:host.tax,releases:current,revokedReleases:ledger.revokedReleases,now:options.now});
 const session=async(request:Request)=>readAuthSession(request,db);
 const authenticate=async(request:Request)=>{const value=await session(request);return value?{userId:value.user.id}:null;};
 const verifyCsrf=(request:Request)=>requireCsrf(request,auth.origin,auth.secret);
 const limits:Record<string,number>={quote:10,create:10,order:120,status:120,entitlements:120,'download-issue':30,'download-serve':30};
 const rateLimit=async(request:Request,userId:string,action:string)=>{
  const network=await authStore.limit(`network:commerce:${action}:${request.headers.get('cf-connecting-ip')??'local-unknown'}`,120,600);
  // Downloads use a one-minute window (spec: <=30/min/user); other actions ten minutes.
  const window=action.startsWith('download-')?60:600;
  const user=await authStore.limit(`identity:commerce:${action}:${userId}`,limits[action]??10,window);
  return network&&user;
 };
 const tonConfig=paymentConfig({enabled}),tonStore=createTonPaymentStore(db),reader=options.reader??createToncenterReader(tonConfig,{apiKey:env.TONCENTER_API_KEY});
 const ton=createTonPaymentService({config:tonConfig,store:tonStore,
  resolveQuote:async(id,userId)=>{try{return await commerce.resolveQuote(id,userId);}catch(cause){if(cause instanceof CommerceError)throw new TonPaymentError(cause.code==='TERM_UNAVAILABLE'||cause.code==='PLAN_CHANGE_UNAVAILABLE'?'OFFER_CHANGED':cause.code);throw cause;}},
  exchangeRate:host.exchangeRate,isRecipientActive:reader.isRecipientActive,readProof:reader.readProof,now:options.now,
 });
 const perRequestInvoices=(request:Request)=>createTonHttpHandlers({service:ton,store:tonStore,config:tonConfig,mainOrigin:auth.origin,authenticate,verifyCsrf,rateLimit:(userId,action)=>rateLimit(request,userId,action),webhookSecret:env.TONAPI_WEBHOOK_SECRET});
 const storage=options.storage!==undefined?options.storage:env.PAID_ARTIFACTS?createR2ArtifactStore(env.PAID_ARTIFACTS):null;
 let signer:Promise<DownloadTicketSigner>|null=null;
 const delivery=createDeliveryHttpHandlers({
  enabled:deliveryFlagEnabled(env)&&storage!==null,mainOrigin:auth.origin,releases,ledger,storage,
  tickets:()=>signer??=createDownloadTickets(auth.secret),
  authenticate:async request=>{const value=await session(request);return value?{userId:value.user.id,sessionId:value.session.id}:null;},
  verifyCsrf,rateLimit,now:options.now,
 });
 return {
  commerce:createCommerceHttpHandlers({service:commerce,mainOrigin:auth.origin,authenticate,verifyCsrf,rateLimit}),
  createInvoice:(request:Request)=>perRequestInvoices(request).createInvoice(request),
  invoiceStatus:(request:Request,id:string)=>perRequestInvoices(request).status(request,id),
  webhook:(request:Request)=>perRequestInvoices(request).webhook(request),
  delivery,
  /** Trusted worker entry point only. No public status endpoint triggers chain reads. */
  reconcile:ton.reconcile,
  /** Whether quotes can be priced at all (flags + registry); readiness/tax/FX are checked per quote. */
  salesOpen:enabled,
  deliveryReady:storage!==null&&Object.keys(current).length>0,
 };
}

/**
 * Webhook-only host: a TonAPI hint needs neither user auth nor open sales, so disabling new
 * checkouts keeps existing invoices reconcilable. Without the bearer secret it answers 503.
 */
export function createTonWebhookHost(env:TallshiftCloudflareEnv,options:{now?:()=>number}={}){
 if(!env.DB)throw new CommerceError('COMMERCE_DISABLED');
 const db=primaryAuthDatabase(env.DB),config=paymentConfig({enabled:false}),store=createTonPaymentStore(db);
 const unavailable=async()=>{throw new TonPaymentError('COMMERCE_DISABLED');};
 const service=createTonPaymentService({config,store,resolveQuote:unavailable,exchangeRate:unavailable,isRecipientActive:async()=>false,readProof:unavailable,now:options.now});
 // Reserved .invalid origin: no browser can pass this host's create/status Origin check; only webhook() is used.
 return createTonHttpHandlers({service,store,config,mainOrigin:'https://webhook.invalid',authenticate:async()=>null,verifyCsrf:async()=>false,rateLimit:async()=>false,webhookSecret:env.TONAPI_WEBHOOK_SECRET,now:options.now});
}
