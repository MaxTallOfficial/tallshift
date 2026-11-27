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

/** One paid period of one level: open from startsAt (inclusive) to endsAt (exclusive). */
export interface AccessPeriod {orderId: string; plan: SubscriptionPlan; months: number; startsAt: number; endsAt: number; status: 'active' | 'revoked'}
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

/** True while another level is still paid after `at`. Switching level mid-term is not decided, so it is refused. */
export const otherLevelPaid = (periods: readonly AccessPeriod[], plan: SubscriptionPlan, at: number) => live(periods).some(period => period.plan !== plan && period.endsAt > at);

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
