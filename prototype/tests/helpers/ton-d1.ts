import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createTonPaymentStore,type D1DatabaseLike,type D1ResultLike,type D1StatementLike} from '../../src/server/payments/ton/store.ts';
import {createTonPaymentService,type PayableQuote} from '../../src/server/payments/ton/service.ts';
import type {UsdExchangeRate} from '../../src/server/payments/ton/quote.ts';
import type {TonChainProof} from '../../src/server/payments/ton/verification.ts';
import type {TonPaymentConfig} from '../../src/server/payments/ton/config.ts';

class Statement implements D1StatementLike {
  readonly db: DatabaseSync; readonly sql: string; readonly values: unknown[];
  constructor(db: DatabaseSync,sql: string,values: unknown[] = []) {this.db=db;this.sql=sql;this.values=values;}
  bind(...values: unknown[]) {return new Statement(this.db,this.sql,values);}
  async first<T>() {return this.db.prepare(this.sql).get(...this.values as never[]) as T | null ?? null;}
  async all<T>() {return {results: this.db.prepare(this.sql).all(...this.values as never[]) as T[]};}
}
export function createD1Fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../migrations/0001_ton_payments.sql',import.meta.url),'utf8'));
  const db: D1DatabaseLike = {
    prepare: sql=>new Statement(sqlite,sql),
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(value=>{
          const statement=value as Statement;
          const result=sqlite.prepare(statement.sql).run(...statement.values as never[]);
          return {success:true,meta:{changes:Number(result.changes)}} satisfies D1ResultLike;
        });
        sqlite.exec('COMMIT');return results;
      } catch(error) {sqlite.exec('ROLLBACK');throw error;}
    },
  };
  const count=(table:string)=>Number(sqlite.prepare(`SELECT count(*) AS count FROM ${table}`).get()?.count);
  return {sqlite,db,store:createTonPaymentStore(db),count};
}
export const testRecipient='0:'+'a'.repeat(64),testMaster='0:'+'b'.repeat(64),testSource='0:'+'c'.repeat(64);
export function createPaymentFixture() {
  const f=createD1Fixture();
  const config:TonPaymentConfig={network:'ton-testnet',recipient:testRecipient,usdtMaster:testMaster,enabled:true};
  const state:{now:number;quote:PayableQuote|null;rates:Record<'TON'|'USDT',UsdExchangeRate>;failRate:boolean;recipientActive:boolean;chainProof:TonChainProof|null}={
    now:1000,quote:{id:'quote-1',userId:'buyer-1',currency:'USD',amountMinor:1600,itemIds:['S004','C003'],termsRevision:'terms-1',expiresAt:1700,payable:true},
    rates:{TON:{id:'rate-ton',asset:'TON',usdPerUnit:'3',source:'fixture',quotedAt:1000,expiresAt:1800},USDT:{id:'rate-usdt',asset:'USDT',usdPerUnit:'0.999',source:'fixture',quotedAt:1000,expiresAt:1800}},
    failRate:false,recipientActive:true,chainProof:null,
  };
  const calls={quote:0,rate:0,proof:0,recipient:0};
  const deps={config,store:f.store,now:()=>state.now,
    resolveQuote:async()=>{calls.quote++;return state.quote;},
    exchangeRate:async(asset:'TON'|'USDT')=>{calls.rate++;if(state.failRate)throw new Error('provider-secret');return state.rates[asset];},
    isRecipientActive:async()=>{calls.recipient++;return state.recipientActive;},
    readProof:async()=>{calls.proof++;if(!state.chainProof)throw new Error('missing proof');return state.chainProof;},
  };
  const service=createTonPaymentService(deps);
  return {...f,config,state,calls,deps,service};
}
