import test from 'node:test';
import assert from 'node:assert/strict';
import {createUsdExchangeRate,FxError,type FxPolicy,type FxProvider} from '../src/server/payments/fx.ts';
import {settlementAmount} from '../src/server/payments/ton/quote.ts';
import {productionCommerceDependencies,commerceLaunchDecisions} from '../src/server/orders/launch.ts';
import {CommerceError} from '../src/server/orders/store.ts';

const policy: FxPolicy = {maxAgeSeconds: 30, ttlSeconds: 300, clockSkewSeconds: 5, minSources: 1, maxDeviationBps: 50};
const provider = (source: string, value: () => {usdPerUnit: string; quotedAt: number} | Promise<never>): FxProvider => ({source, quote: async () => value()});
const code = (expected: FxError['code']) => (error: unknown) => error instanceof FxError && error.code === expected;

test('no approved provider means no rate for either asset; production prices a USDT invoice by the USDT price itself', async () => {
  const rate = createUsdExchangeRate({providers: [], policy, now: () => 1000});
  await assert.rejects(() => rate('USDT'), code('FX_NOT_CONFIGURED'));
  await assert.rejects(() => rate('TON'), code('FX_NOT_CONFIGURED'));
  const deps = productionCommerceDependencies({deliveryReady: true, now: () => 1000});
  // Prices are in USDT: a USDT invoice needs no market rate (1 price unit = 1 USDT); Gram needs an approved provider.
  const usdt = await deps.exchangeRate('USDT');
  assert.deepEqual([usdt.asset, usdt.usdPerUnit, usdt.source, usdt.quotedAt, usdt.expiresAt], ['USDT', '1', 'tallshift:usdt-price', 1000, 1900]);
  assert.equal(settlementAmount(1600, usdt, 1000), '16000000');
  await assert.rejects(() => deps.exchangeRate('TON'), code('FX_NOT_CONFIGURED'));
  await assert.rejects(() => deps.tax('buyer', 1600), (e: unknown) => e instanceof CommerceError && e.code === 'COMMERCE_DISABLED');
  assert.deepEqual(await deps.readiness(), {deliveryReady: true, sellerTermsReady: false, termsRevision: ''});
  assert.deepEqual({...commerceLaunchDecisions}, {termsRevision: null, tax: null, prices: {product: {1: 1600, 12: 16000}, all: {1: 3900, 12: 39000}}, gramFx: null});
});

test('fresh primary quote carries source, provider time and expiry and prices the invoice in integer units', async () => {
  const rate = createUsdExchangeRate({providers: [provider('primary-usdt', () => ({usdPerUnit: '0.9987', quotedAt: 990}))], policy, now: () => 1000});
  const usdt = await rate('USDT');
  assert.equal(usdt.source, 'primary-usdt'); assert.equal(usdt.quotedAt, 990); assert.equal(usdt.expiresAt, 1290); assert.equal(usdt.asset, 'USDT');
  assert.match(usdt.id, /^fx_[a-f0-9]{32}$/);
  // $16.00 at 0.9987 USD per USDT, rounded up to the smallest unit: not 16 USDT.
  assert.equal(settlementAmount(1600, usdt, 1000), '16020828');
});

test('stale, future, malformed, zero or failing quotes fail closed', async () => {
  for (const value of [{usdPerUnit: '3', quotedAt: 969}, {usdPerUnit: '3', quotedAt: 1006}, {usdPerUnit: '1e3', quotedAt: 1000}, {usdPerUnit: '-1', quotedAt: 1000}, {usdPerUnit: '0', quotedAt: 1000}, {usdPerUnit: '0.0000000000000', quotedAt: 1000}, {usdPerUnit: 3 as unknown as string, quotedAt: 1000}, {usdPerUnit: '3', quotedAt: 999.5}]) {
    const rate = createUsdExchangeRate({providers: [provider('p', () => value)], policy, now: () => 1000});
    await assert.rejects(() => rate('TON'), code('FX_UNAVAILABLE'), JSON.stringify(value));
  }
  const broken = createUsdExchangeRate({providers: [provider('p', () => Promise.reject(new Error('network')))], policy, now: () => 1000});
  await assert.rejects(() => broken('TON'), code('FX_UNAVAILABLE'));
  // A timestamp slightly ahead within skew is clamped to now so settlement accepts it.
  const ahead = await createUsdExchangeRate({providers: [provider('p', () => ({usdPerUnit: '3', quotedAt: 1003}))], policy, now: () => 1000})('TON');
  assert.equal(ahead.quotedAt, 1000);
});

test('cross-check source must agree within policy; the primary price is never silently replaced', async () => {
  const two = {...policy, minSources: 2};
  const agree = await createUsdExchangeRate({providers: [provider('a', () => ({usdPerUnit: '3.000', quotedAt: 1000})), provider('b', () => ({usdPerUnit: '3.010', quotedAt: 998}))], policy: two, now: () => 1000})('TON');
  assert.equal(agree.usdPerUnit, '3.000'); assert.equal(agree.source, 'a;check=b');
  await assert.rejects(() => createUsdExchangeRate({providers: [provider('a', () => ({usdPerUnit: '3.00', quotedAt: 1000})), provider('b', () => ({usdPerUnit: '3.05', quotedAt: 1000}))], policy: two, now: () => 1000})('TON'), code('FX_DIVERGED'));
  await assert.rejects(() => createUsdExchangeRate({providers: [provider('a', () => ({usdPerUnit: '3', quotedAt: 1000})), provider('b', () => Promise.reject(new Error('down')))], policy: two, now: () => 1000})('TON'), code('FX_UNAVAILABLE'));
  await assert.rejects(() => createUsdExchangeRate({providers: [provider('a', () => Promise.reject(new Error('down'))), provider('b', () => ({usdPerUnit: '3', quotedAt: 1000}))], policy, now: () => 1000})('TON'), code('FX_UNAVAILABLE'));
});

test('policy limits are enforced: max age <= 60s, ttl <= 900s and > max age, unique sources', () => {
  for (const bad of [{...policy, maxAgeSeconds: 61}, {...policy, ttlSeconds: 901}, {...policy, ttlSeconds: 30, maxAgeSeconds: 30}, {...policy, minSources: 0}, {...policy, maxDeviationBps: 5000}]) assert.throws(() => createUsdExchangeRate({providers: [provider('a', () => ({usdPerUnit: '1', quotedAt: 1}))], policy: bad}), code('FX_INVALID'));
  assert.throws(() => createUsdExchangeRate({providers: [provider('a', () => ({usdPerUnit: '1', quotedAt: 1})), provider('a', () => ({usdPerUnit: '1', quotedAt: 1}))], policy}), code('FX_INVALID'));
  assert.throws(() => createUsdExchangeRate({providers: [provider('a', () => ({usdPerUnit: '1', quotedAt: 1}))], policy: {...policy, minSources: 2}}), code('FX_INVALID'));
  // The combined source label must fit the 200-character invoice snapshot field.
  const long = (tag: string) => provider(tag + 'x'.repeat(62), () => ({usdPerUnit: '1', quotedAt: 1}));
  assert.throws(() => createUsdExchangeRate({providers: [long('a'), long('b'), long('c'), long('d')], policy}), code('FX_INVALID'));
});
