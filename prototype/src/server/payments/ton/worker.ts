import type {TonPaymentStore,TonAsset,TonNetwork} from './store.ts';
import {PaymentStoreError} from './store.ts';
import {TonPaymentError} from './service.ts';
import {TonChainError} from './toncenter.ts';
import {TonVerificationError} from './verification.ts';

type Reconcile=(hash:string,asset:TonAsset)=>Promise<{matched:boolean}>;
export interface TonWorkerDependencies {store:TonPaymentStore;network:TonNetwork;recipient:string;reconcile:Reconcile;now?:()=>number}
/** No scheduler or public endpoint is installed by this factory. Host invokes it from its server worker. */
export function createTonInboxWorker(deps:TonWorkerDependencies) {
  const now=deps.now??(()=>Math.floor(Date.now()/1000));
  return {
    async process(limit=25) {
      const report={matched:0,unmatched:0,retried:0,review:0,skipped:0};
      const candidates=await deps.store.listDueWebhooks(now(),limit);
      for(const candidate of candidates) {
        const job=await deps.store.claimWebhook(candidate,now());
        if(!job){report.skipped++;continue;}
        const prefix=`${deps.network}:${deps.recipient}:`;
        const suffix=job.reference.startsWith(prefix)?job.reference.slice(prefix.length):'';
        const match=/^([1-9]\d{0,19}):([a-f0-9]{64})$/.exec(suffix);
        if(!match||BigInt(match[1])>=(1n<<64n)) {
          await deps.store.finishWebhook(job,{outcome:'review',code:'INVALID_REFERENCE'},now());report.review++;continue;
        }
        try {
          let matched=false;
          const problems:unknown[]=[];
          for(const asset of ['TON','USDT'] as const) {
            try {if((await deps.reconcile(match[2],asset)).matched){matched=true;break;}}
            catch(cause){problems.push(cause);}
          }
          if(matched) {
            if(await deps.store.finishWebhook(job,{outcome:'matched'},now()))report.matched++;else report.skipped++;
          } else {
            // An unsupported asset/opcode is not a failed invoice. Its transaction
            // reference remains in durable inbox for a missing-comment/operator search.
            const relevant=problems.filter(cause=>!(cause instanceof TonChainError&&cause.code==='UNMATCHED_TRANSFER'));
            if(relevant.length)throw relevant[0];
            if(await deps.store.finishWebhook(job,{outcome:'unmatched'},now()))report.unmatched++;else report.skipped++;
          }
        } catch(cause) {
          const permanent=cause instanceof TonVerificationError||cause instanceof PaymentStoreError&&['PAYMENT_CONFLICT','INVALID_INPUT','IDEMPOTENCY_CONFLICT'].includes(cause.code)||cause instanceof TonChainError&&cause.code==='INVALID_TRANSFER';
          const code=cause instanceof TonVerificationError||cause instanceof TonChainError||cause instanceof TonPaymentError||cause instanceof PaymentStoreError?cause.code:'TEMPORARILY_UNAVAILABLE';
          const result=permanent?'review':'retry';
          if(await deps.store.finishWebhook(job,{outcome:result,code},now())){
            if(permanent||job.attempt>=8)report.review++;else report.retried++;
          } else report.skipped++;
        }
      }
      return report;
    },
  };
}
