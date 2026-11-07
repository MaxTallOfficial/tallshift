import {Address} from '@ton/core';
import type {TonAsset,TonNetwork} from './store.ts';

/** Public destination confirmed by the owner on 2026-11-07. Never a bridge/exchange deposit address. */
export const confirmedRecipient = 'UQAwPV9w4h7ZP0CVe3QoJoJfVaYjrxp9Eqc3TSl6nENDaq2i';
/** TON's documented mainnet USDt master. Token names and images are not identity. */
export const mainnetUsdtMaster = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
export const assetDecimals: Readonly<Record<TonAsset,number>> = {TON:9,USDT:6};
export interface TonPaymentConfig {network:TonNetwork;recipient:string;usdtMaster:string;enabled:boolean}
export function canonicalAddress(value:string,network:TonNetwork):string {
  if (typeof value!=='string'||value.length>128||value.trim()!==value) throw new Error('INVALID_TON_ADDRESS');
  if (!/^(?:0|-1):[a-fA-F0-9]{64}$/.test(value)) {
    const friendly=Address.parseFriendly(value);
    if (network==='ton-mainnet'&&friendly.isTestOnly) throw new Error('TESTNET_ADDRESS_ON_MAINNET');
  }
  const address=Address.parse(value);
  if (address.workChain!==0) throw new Error('UNSUPPORTED_PAYMENT_WORKCHAIN');
  return address.toRawString();
}
export function paymentConfig(options:{network?:TonNetwork;recipient?:string;testnetUsdtMaster?:string;enabled?:boolean}={}):TonPaymentConfig {
  const network=options.network??'ton-mainnet';
  if (!['ton-mainnet','ton-testnet'].includes(network)) throw new Error('INVALID_NETWORK');
  if (network==='ton-testnet'&&!options.testnetUsdtMaster) throw new Error('TESTNET_TOKEN_REQUIRED');
  return {network,recipient:canonicalAddress(options.recipient??confirmedRecipient,network),usdtMaster:canonicalAddress(network==='ton-mainnet'?mainnetUsdtMaster:options.testnetUsdtMaster!,network),enabled:options.enabled===true};
}
