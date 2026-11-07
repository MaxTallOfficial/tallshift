import {assetDecimals} from './config.ts';
import type {TonAsset} from './store.ts';

export interface UsdExchangeRate {id:string;asset:TonAsset;usdPerUnit:string;source:string;quotedAt:number;expiresAt:number}
const time=(n:number)=>Number.isSafeInteger(n)&&n>=0;
/** Integer arithmetic; round payment amount upwards to the smallest asset unit. Never assume USDt=$1. */
export function settlementAmount(usdMinor:number,rate:UsdExchangeRate,now:number) {
  if (!rate||typeof rate!=='object'||!Number.isSafeInteger(usdMinor)||usdMinor<=0||usdMinor>100_000_000||!time(now)||!time(rate.quotedAt)||!time(rate.expiresAt)||rate.quotedAt>now||now-rate.quotedAt>60||rate.expiresAt<=now||rate.expiresAt>rate.quotedAt+900||!Object.hasOwn(assetDecimals,rate.asset)||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(rate.id)||typeof rate.source!=='string'||!rate.source.trim()||rate.source.length>200) throw new Error('INVALID_EXCHANGE_RATE');
  if (typeof rate.usdPerUnit!=='string'||!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,12})?$/.test(rate.usdPerUnit)) throw new Error('INVALID_EXCHANGE_RATE');
  const [whole,fraction='']=rate.usdPerUnit.split('.');
  const price=BigInt(whole+fraction);
  if (price<=0n) throw new Error('INVALID_EXCHANGE_RATE');
  const numerator=BigInt(usdMinor)*10n**BigInt(assetDecimals[rate.asset]+fraction.length);
  const denominator=100n*price;
  return ((numerator+denominator-1n)/denominator).toString();
}
export function formatAssetAmount(units:string,asset:TonAsset):string {
  if (!/^[1-9]\d{0,77}$/.test(units)||!Object.hasOwn(assetDecimals,asset)) throw new Error('INVALID_AMOUNT');
  const decimals=assetDecimals[asset],padded=units.padStart(decimals+1,'0');
  return `${padded.slice(0,-decimals)}.${padded.slice(-decimals)}`.replace(/\.?0+$/,'');
}
