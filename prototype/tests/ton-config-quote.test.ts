import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Address} from '@ton/core';
import {canonicalAddress,paymentConfig,confirmedRecipient,mainnetUsdtMaster} from '../src/server/payments/ton/config.ts';
import {formatAssetAmount,settlementAmount,type UsdExchangeRate} from '../src/server/payments/ton/quote.ts';

const rate=(patch:Partial<UsdExchangeRate>={}):UsdExchangeRate=>({id:'fx-1',asset:'TON',source:'synthetic-rate',usdPerUnit:'3',quotedAt:1000,expiresAt:1800,...patch});
test('confirmed destination passes SDK CRC and all friendly variants map to one canonical recipient; sales default disabled',()=>{
  const config=paymentConfig();assert.equal(config.enabled,false);assert.equal(config.network,'ton-mainnet');
  assert.equal(config.recipient,'0:303d5f70e21ed93f40957b742826825f55a623af1a7d12a7374d297a9c43436a');
  assert.equal(canonicalAddress(confirmedRecipient,'ton-mainnet'),config.recipient);
  assert.equal(canonicalAddress(Address.parse(confirmedRecipient).toString({bounceable:true}),'ton-mainnet'),config.recipient);
  assert.equal(config.usdtMaster,Address.parse(mainnetUsdtMaster).toRawString());
  assert.equal(paymentConfig({enabled:true}).enabled,true);
});
test('invalid CRC, whitespace, wrong workchain and test-only address on mainnet are refused',()=>{
  const testOnly=Address.parse(confirmedRecipient).toString({testOnly:true});
  for(const value of [confirmedRecipient+' ',confirmedRecipient.slice(0,-1)+'a','not-a-wallet',`-1:${'a'.repeat(64)}`,testOnly])assert.throws(()=>canonicalAddress(value,'ton-mainnet'));
  assert.equal(canonicalAddress(testOnly,'ton-testnet'),Address.parse(confirmedRecipient).toRawString());
  assert.throws(()=>paymentConfig({network:'ton-testnet'}),/TESTNET_TOKEN_REQUIRED/);
  assert.equal(paymentConfig({network:'ton-testnet',testnetUsdtMaster:mainnetUsdtMaster}).network,'ton-testnet');
});
test('USD minor units convert with integer arithmetic, round up and do not assume USDT parity',()=>{
  assert.equal(settlementAmount(1600,rate(),1000),'5333333334');
  assert.equal(settlementAmount(1600,rate({asset:'USDT',usdPerUnit:'0.999'}),1000),'16016017');
  assert.equal(settlementAmount(1,rate({asset:'USDT',usdPerUnit:'2'}),1000),'5000');
  assert.equal(settlementAmount(1600,rate({usdPerUnit:'0.000000000001'}),1000),'16000000000000000000000');
});
test('stale, future, expired, zero and malformed FX or USD amounts cannot create quotes',()=>{
  for(const patch of [{quotedAt:1061},{quotedAt:939},{expiresAt:1000},{expiresAt:1901},{usdPerUnit:'0'},{usdPerUnit:'01'},{usdPerUnit:'NaN'},{usdPerUnit:'1e3'},{usdPerUnit:'0.1234567890123'},{source:''},{source:' '},{id:'bad id'}])assert.throws(()=>settlementAmount(1600,rate(patch),1000));
  for(const amount of [0,-1,1.1,100000001,Number.NaN,Number.MAX_SAFE_INTEGER])assert.throws(()=>settlementAmount(amount,rate(),1000));
});
test('formatting preserves integer zeros and displays exact TON9/USDT6 fractional units',()=>{
  assert.equal(formatAssetAmount('10000000000','TON'),'10');assert.equal(formatAssetAmount('1','TON'),'0.000000001');
  assert.equal(formatAssetAmount('10000000','USDT'),'10');assert.equal(formatAssetAmount('16016017','USDT'),'16.016017');
  for(const amount of ['0','01','-1','1.5','1e6'])assert.throws(()=>formatAssetAmount(amount,'USDT'));
});
