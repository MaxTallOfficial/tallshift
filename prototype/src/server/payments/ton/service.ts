import {Address} from '@ton/core';
import {formatAssetAmount,settlementAmount,type UsdExchangeRate} from './quote.ts';
import type {TonPaymentConfig} from './config.ts';
import {PaymentStoreError,type TonAsset,type TonInvoice,createTonPaymentStore} from './store.ts';
import {verifyTonPayment,type TonChainProof} from './verification.ts';

export class TonPaymentError extends Error {
  readonly code:'COMMERCE_DISABLED'|'INVALID_INPUT'|'NOT_FOUND'|'QUOTE_EXPIRED'|'OFFER_CHANGED'|'IDEMPOTENCY_CONFLICT'|'TEMPORARILY_UNAVAILABLE';
  constructor(code:TonPaymentError['code']){super(code);this.code=code;}
}
/** Resolved exclusively by the host's authenticated server quote/ownership service. */
export interface PayableQuote {id:string;userId:string;currency:'USD';amountMinor:number;itemIds:readonly string[];termsRevision:string;expiresAt:number;payable:boolean}
export type TonStore=ReturnType<typeof createTonPaymentStore>;
export interface TonPaymentDependencies {
  config:TonPaymentConfig;store:TonStore;
  resolveQuote:(quoteId:string,userId:string)=>Promise<PayableQuote|null>;
  exchangeRate:(asset:TonAsset)=>Promise<UsdExchangeRate>;
  /** An active receiving wallet is required by this adapter; undeployed-wallet credit is not auto-settled. */
  isRecipientActive:()=>Promise<boolean>;
  /** Trusted read-only chain adapter; no HTTP user input can supply proof fields. */
  readProof:(transactionHash:string,asset:TonAsset)=>Promise<TonChainProof>;
  now?:()=>number;
}
export interface PublicTonInvoice {
  id:string;asset:TonAsset;network:'ton-mainnet'|'ton-testnet';recipient:string;amount:string;amountBaseUnits:string;
  comment:string;expiresAt:number;paymentStatus:'pending'|'paid'|'review'|'expired';
  deliveryStatus:'not_ready'|'pending'|'delivered';
}
export function publicTonInvoice(value:TonInvoice,now:number):PublicTonInvoice {
  return {id:value.id,asset:value.asset,network:value.network,recipient:Address.parse(value.recipient).toString({bounceable:false,testOnly:value.network==='ton-testnet',urlSafe:true}),amount:formatAssetAmount(value.amountBaseUnits,value.asset),amountBaseUnits:value.amountBaseUnits,comment:value.comment,expiresAt:value.expiresAt,paymentStatus:value.status==='pending'&&now>=value.expiresAt?'expired':value.status,deliveryStatus:value.deliveryState};
}
const identifier=(s:unknown):s is string=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s);
async function digest(text:string) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}
export function createTonPaymentService(deps:TonPaymentDependencies) {
  const now=deps.now??(()=>Math.floor(Date.now()/1000));
  const enabled=()=>{if(!deps.config.enabled)throw new TonPaymentError('COMMERCE_DISABLED');};
  return {
    async createInvoice(userId:string,input:{quoteId:string;asset:TonAsset;idempotencyKey:string}):Promise<PublicTonInvoice> {
      enabled();
      if(!identifier(userId)||!identifier(input.quoteId)||!identifier(input.idempotencyKey)||!['TON','USDT'].includes(input.asset))throw new TonPaymentError('INVALID_INPUT');
      const inputDigest=await digest(JSON.stringify({quoteId:input.quoteId,asset:input.asset}));
      const existing=await deps.store.findOwnedInvoiceByIdempotencyKey(userId,input.idempotencyKey);
      if(existing){if(existing.inputDigest!==inputDigest)throw new TonPaymentError('IDEMPOTENCY_CONFLICT');return publicTonInvoice(existing,now());}
      if(!await deps.isRecipientActive())throw new TonPaymentError('COMMERCE_DISABLED');
      const quote=await deps.resolveQuote(input.quoteId,userId);
      if(!quote||quote.userId!==userId||quote.id!==input.quoteId)throw new TonPaymentError('NOT_FOUND');
      const createdAt=now();
      if(!Number.isSafeInteger(quote.expiresAt)||quote.expiresAt<=createdAt)throw new TonPaymentError('QUOTE_EXPIRED');
      if(!quote.payable||quote.currency!=='USD'||!quote.itemIds.length||quote.itemIds.length>32)throw new TonPaymentError('OFFER_CHANGED');
      const rate=await deps.exchangeRate(input.asset);
      // External rate delay must not create a fresh-looking expired invoice.
      const afterRate=now();
      if(rate.asset!==input.asset)throw new TonPaymentError('TEMPORARILY_UNAVAILABLE');
      let amountBaseUnits:string;
      try {amountBaseUnits=settlementAmount(quote.amountMinor,rate,afterRate);}catch{throw new TonPaymentError('TEMPORARILY_UNAVAILABLE');}
      const expiresAt=Math.min(quote.expiresAt,rate.expiresAt,createdAt+900);
      if(expiresAt<=afterRate)throw new TonPaymentError('QUOTE_EXPIRED');
      try {
        const result=await deps.store.createInvoice({id:crypto.randomUUID(),userId,quoteId:quote.id,itemIds:[...quote.itemIds],termsRevision:quote.termsRevision,asset:input.asset,network:deps.config.network,recipient:deps.config.recipient,jettonMaster:input.asset==='USDT'?deps.config.usdtMaster:null,amountBaseUnits,comment:`ts_${crypto.randomUUID().replaceAll('-','')}`,createdAt,expiresAt,fxQuoteId:rate.id,fxSnapshot:{source:rate.source,usdPerUnit:rate.usdPerUnit,quotedAt:rate.quotedAt,expiresAt:rate.expiresAt,usdMinor:quote.amountMinor},idempotencyKey:input.idempotencyKey,inputDigest});
        return publicTonInvoice(result.invoice,now());
      }catch(error){if(error instanceof PaymentStoreError&&error.code==='IDEMPOTENCY_CONFLICT')throw new TonPaymentError('IDEMPOTENCY_CONFLICT');if(error instanceof PaymentStoreError&&error.code==='INVOICE_CONFLICT')throw new TonPaymentError('OFFER_CHANGED');throw error;}
    },
    async status(userId:string,invoiceId:string):Promise<PublicTonInvoice> {
      if(!identifier(userId)||!identifier(invoiceId))throw new TonPaymentError('NOT_FOUND');
      const invoice=await deps.store.findOwnedInvoice(invoiceId,userId);
      if(!invoice)throw new TonPaymentError('NOT_FOUND');
      return publicTonInvoice(invoice,now());
    },
    /** Worker/queue entry point. Public status polling never scans the blockchain. */
    async reconcile(transactionHash:string,asset:TonAsset) {
      // Disabling new sales must not stop settlement of previously issued invoices.
      if(!/^[a-fA-F0-9]{64}$/.test(transactionHash)||!['TON','USDT'].includes(asset))throw new TonPaymentError('INVALID_INPUT');
      const proof=await deps.readProof(transactionHash.toLowerCase(),asset);
      if(proof.transactionHash!==transactionHash.toLowerCase()||proof.asset!==asset||proof.network!==deps.config.network||proof.account!==deps.config.recipient)throw new TonPaymentError('TEMPORARILY_UNAVAILABLE');
      const comment=proof.incoming.comment;
      if(!comment)return {matched:false as const};
      const invoice=await deps.store.findInvoiceByComment(comment);
      if(!invoice)return {matched:false as const};
      const verified=await verifyTonPayment(invoice,proof,now(),{trustedJettonMasters:{[deps.config.network]:[deps.config.usdtMaster]}});
      const result=await deps.store.recordVerifiedPayment(verified);
      return {matched:true as const,invoiceId:result.invoice.id,paymentStatus:result.invoice.status,replayed:result.replayed};
    },
  };
}
