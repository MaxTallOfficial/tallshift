import type {TonAsset} from './ton/store.ts';
import type {UsdExchangeRate} from './ton/quote.ts';

/**
 * USD price source for TON and USDT-on-TON invoices. There is deliberately no built-in
 * provider, no fixed rate and no USDT=$1 shortcut: the host passes adapters for the
 * provider(s) the owner approves. Without one, invoice creation fails closed.
 */
export interface FxObservation {
  /** Decimal USD per 1 whole unit (not base units), e.g. "3.1415". */
  usdPerUnit: string;
  /** Provider timestamp of the price, unix seconds. Not the time of our request. */
  quotedAt: number;
}
export interface FxProvider {
  /** Stable source label stored in every invoice snapshot, e.g. "provider-name:gram-usd". */
  readonly source: string;
  /**
   * Internal asset 'TON' is the native coin of the TON network, renamed Gram (GRAM) in 2026;
   * providers differ (GRAM, TON, or a numeric ID), so each adapter maps it explicitly.
   * 'USDT' is the USDT jetton on TON and needs its own USD quote.
   */
  quote(asset: TonAsset): Promise<FxObservation>;
}
export interface FxPolicy {
  /** Oldest accepted provider timestamp. settlementAmount() additionally caps this at 60s. */
  maxAgeSeconds: number;
  /** Invoice-facing validity of one quote; at most 900s (the quote/invoice limit). */
  ttlSeconds: number;
  /** Tolerated clock skew for provider timestamps slightly ahead of ours. */
  clockSkewSeconds: number;
  /** Number of independent sources that must answer. 1 = primary only. */
  minSources: number;
  /** Maximum spread between answering sources, basis points of the lowest price. */
  maxDeviationBps: number;
}
export class FxError extends Error {
  readonly code: 'FX_NOT_CONFIGURED' | 'FX_UNAVAILABLE' | 'FX_DIVERGED' | 'FX_INVALID';
  constructor(code: FxError['code']) {super(code); this.code = code;}
}
const decimal = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,12})?$/;
/** Scales a validated decimal to an integer with 12 fractional digits. */
function scaled(value: string) {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10n ** 12n + BigInt((fraction + '0'.repeat(12)).slice(0, 12));
}
export function validatePolicy(policy: FxPolicy) {
  const {maxAgeSeconds: age, ttlSeconds: ttl, clockSkewSeconds: skew, minSources, maxDeviationBps: bps} = policy;
  if (![age, ttl, skew, minSources, bps].every(Number.isSafeInteger) || age < 1 || age > 60 || ttl < 30 || ttl > 900 || ttl <= age || skew < 0 || skew > 10 || minSources < 1 || minSources > 5 || bps < 0 || bps > 1000) throw new FxError('FX_INVALID');
  return policy;
}

/**
 * Builds the host's exchangeRate(asset) dependency. The first provider is the primary
 * price; other providers are cross-checks. Fewer answering sources than required, stale
 * or future timestamps, malformed values or a spread above policy all fail closed.
 */
export function createUsdExchangeRate(deps: {providers: readonly FxProvider[]; policy: FxPolicy; now?: () => number}) {
  const policy = validatePolicy(deps.policy);
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  if (!deps.providers.length) return async (): Promise<UsdExchangeRate> => {throw new FxError('FX_NOT_CONFIGURED');};
  if (deps.providers.length < policy.minSources || new Set(deps.providers.map(provider => provider.source)).size !== deps.providers.length
    || !deps.providers.every(provider => typeof provider.source === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(provider.source))) throw new FxError('FX_INVALID');
  return async (asset: TonAsset): Promise<UsdExchangeRate> => {
    if (asset !== 'TON' && asset !== 'USDT') throw new FxError('FX_INVALID');
    const settled = await Promise.allSettled(deps.providers.map(provider => provider.quote(asset)));
    const at = now();
    const valid = settled.map((result, index) => {
      if (result.status !== 'fulfilled') return null;
      const {usdPerUnit, quotedAt} = result.value ?? {} as FxObservation;
      if (typeof usdPerUnit !== 'string' || !decimal.test(usdPerUnit) || scaled(usdPerUnit) <= 0n || !Number.isSafeInteger(quotedAt)) return null;
      if (quotedAt > at + policy.clockSkewSeconds || at - quotedAt > policy.maxAgeSeconds) return null;
      return {source: deps.providers[index].source, usdPerUnit, quotedAt: Math.min(quotedAt, at), value: scaled(usdPerUnit)};
    });
    // The primary price must itself be valid; a cross-check never replaces it silently.
    const primary = valid[0];
    const answered = valid.filter(value => value !== null);
    if (!primary || answered.length < policy.minSources) throw new FxError('FX_UNAVAILABLE');
    const values = answered.map(value => value.value);
    const low = values.reduce((a, b) => a < b ? a : b), high = values.reduce((a, b) => a > b ? a : b);
    if ((high - low) * 10000n > low * BigInt(policy.maxDeviationBps)) throw new FxError('FX_DIVERGED');
    const checks = answered.slice(1).map(value => value.source);
    return {
      id: `fx_${crypto.randomUUID().replaceAll('-', '')}`,
      asset,
      usdPerUnit: primary.usdPerUnit,
      source: checks.length ? `${primary.source};check=${checks.join(',')}` : primary.source,
      quotedAt: primary.quotedAt,
      expiresAt: primary.quotedAt + policy.ttlSeconds,
    };
  };
}
