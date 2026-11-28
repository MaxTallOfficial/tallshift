import {pricingPlanScopes} from '../../foundations/pricing-plans.ts';
import type {UsdExchangeRate} from '../payments/ton/quote.ts';

/**
 * Subscription levels (Max Tall, 26–27.11.2026): «Product» opens the six Product examples,
 * «Всё» every paid example, new ones included. The item lists come from the shared pricing
 * scopes, so the server and the pricing page cannot drift apart. There is no automatic
 * charge in crypto: every paid term is a separate quote, invoice and transfer.
 */
export type SubscriptionPlan = 'product' | 'all';
export const subscriptionPlanItems: Readonly<Record<SubscriptionPlan, readonly string[]>> = Object.freeze({
  product: Object.freeze([...pricingPlanScopes.product].sort()),
  all: Object.freeze([...pricingPlanScopes.bundle].sort()),
});
export const isSubscriptionPlan = (value: unknown): value is SubscriptionPlan => value === 'product' || value === 'all';
export const planCovers = (plan: SubscriptionPlan, itemId: string) => subscriptionPlanItems[plan].includes(itemId);
/** A paid term in whole calendar months. Which terms are actually sold is decided in launch.ts. */
export const isPaidMonths = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 12;

/**
 * One paid period of one level: open from startsAt (inclusive) to endsAt (exclusive). A 'term'
 * is a paid number of months; an 'upgrade' is the rest of a Product access switched to «Всё».
 * 'revoked' closes a period after a refund, 'upgraded' after a paid switch to «Всё».
 * paidMinor is the subtotal of the period's receipt (USDT minor units).
 */
export interface AccessPeriod {
  orderId: string; plan: SubscriptionPlan; kind: 'term' | 'upgrade'; months: number | null;
  startsAt: number; endsAt: number; status: 'active' | 'revoked' | 'upgraded'; paidMinor: number;
}
export interface CurrentAccess {plan: SubscriptionPlan; startsAt: number; endsAt: number}

const live = (periods: readonly AccessPeriod[]) => periods.filter(period => period.status === 'active');

/** The level open at `now`; its end is extended over directly following paid periods (renewals). */
export function currentAccess(periods: readonly AccessPeriod[], now: number): CurrentAccess | null {
  const active = live(periods).sort((a, b) => a.startsAt - b.startsAt || a.endsAt - b.endsAt);
  const covering = active.find(period => period.startsAt <= now && now < period.endsAt);
  if (!covering) return null;
  let endsAt = covering.endsAt;
  for (const period of active) if (period.plan === covering.plan && period.startsAt <= endsAt && period.endsAt > endsAt) endsAt = period.endsAt;
  return {plan: covering.plan, startsAt: covering.startsAt, endsAt};
}

/** Latest paid end (exclusive) of this level, or null when it was never paid. */
export function levelEnd(periods: readonly AccessPeriod[], plan: SubscriptionPlan): number | null {
  const ends = live(periods).filter(period => period.plan === plan).map(period => period.endsAt);
  return ends.length ? Math.max(...ends) : null;
}

/**
 * Start of a newly paid period: the payment time, or the current end of the same level when
 * that is later, so remaining days are never lost. The 0004 trigger enforces the same rule.
 */
export const renewalStart = (periods: readonly AccessPeriod[], plan: SubscriptionPlan, paidAt: number) => Math.max(paidAt, levelEnd(periods, plan) ?? 0);

/** True while another level is still paid after `at`. A new term of another level then waits; only Product → «Всё» has an upgrade. */
export const otherLevelPaid = (periods: readonly AccessPeriod[], plan: SubscriptionPlan, at: number) => live(periods).some(period => period.plan !== plan && period.endsAt > at);

/** One remaining Product period in an upgrade recalculation (USDT minor units, seconds). */
export interface UpgradeLine {orderId: string; startsAt: number; endsAt: number; remainingSeconds: number; paidMinor: number; allPriceMinor: number; topUpMinor: number}
/** Rounds up to the next minor unit (towards zero for a negative difference, which is also up). */
const ceilDiv = (numerator: bigint, denominator: bigint) => numerator >= 0n ? (numerator + denominator - 1n) / denominator : numerator / denominator;

/**
 * Product → «Всё» before the paid Product time ends (Max Tall, 27.11.2026: recalculation and a
 * top-up). For every remaining Product period the unused share of what was paid is credited and
 * the same share of the «Всё» price for the same term is charged; the sum is the top-up.
 * «Всё» then lasts until the Product access would have ended. Null: no Product access open now,
 * or a gap in it (a refunded period), which «Всё» must never cover.
 */
export function upgradeTopUp(periods: readonly AccessPeriod[], allPrice: (months: number) => number, at: number) {
  const product = live(periods).filter(period => period.plan === 'product' && period.endsAt > at).sort((a, b) => a.startsAt - b.startsAt || a.endsAt - b.endsAt);
  if (!product.length) return null;
  const access = currentAccess(periods, at), endsAt = Math.max(...product.map(period => period.endsAt));
  if (access?.plan !== 'product' || access.endsAt !== endsAt) return null;
  const lines: UpgradeLine[] = product.map(period => {
    if (period.kind !== 'term' || period.months === null) throw new RangeError('INVALID_PERIOD');
    const total = period.endsAt - period.startsAt, remainingSeconds = period.endsAt - Math.max(period.startsAt, at), allPriceMinor = allPrice(period.months);
    const topUpMinor = Number(ceilDiv(BigInt(allPriceMinor - period.paidMinor) * BigInt(remainingSeconds), BigInt(total)));
    return {orderId: period.orderId, startsAt: period.startsAt, endsAt: period.endsAt, remainingSeconds, paidMinor: period.paidMinor, allPriceMinor, topUpMinor};
  });
  return {lines, topUpMinor: lines.reduce((sum, line) => sum + line.topUpMinor, 0), endsAt};
}

/** USDT on TON has 6 decimals and prices are kept in 2-decimal minor units: one minor unit is 10⁴ base units. */
export function usdtBaseUnits(priceMinor: number) {
  if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0) throw new RangeError('INVALID_PRICE');
  return (BigInt(priceMinor) * 10_000n).toString();
}

/**
 * Prices are set in USDT, so a USDT invoice needs no market rate: the price is the amount.
 * Expressed in the payment module's rate shape (1 price unit per USDT), the unchanged
 * settlementAmount() then returns exactly priceMinor × 10⁴ base units. Gram still needs an
 * approved FX provider (launch.ts).
 */
export function usdtPriceRate(now: number): UsdExchangeRate {
  return {id: `usdt_${crypto.randomUUID().replaceAll('-', '')}`, asset: 'USDT', usdPerUnit: '1', source: 'tallshift:usdt-price', quotedAt: now, expiresAt: now + 900};
}
