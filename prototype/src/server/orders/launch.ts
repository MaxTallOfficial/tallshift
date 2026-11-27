import {createUsdExchangeRate,FxError,type FxPolicy,type FxProvider} from '../payments/fx.ts';
import {CommerceError} from './store.ts';
import type {CommerceHostDependencies} from './host.ts';
import {usdtPriceRate,type SubscriptionPlan} from './subscription.ts';

/** Subscription prices in USDT minor units (cents) by level and paid term in months. */
export type SubscriptionPrices = Readonly<Record<SubscriptionPlan, Readonly<Record<number, number>>>>;

/**
 * Owner decisions that gate any paid sale. Fill these only from Max Tall's explicit decisions
 * (docs/knowledge-base/commerce-launch-decisions-2026-11-26.ru.md). Anything unset keeps quotes
 * and invoices closed even if environment flags are switched on.
 */
export interface CommerceLaunchDecisions {
  /** Approved seller + terms/license/refund revision identifier, e.g. "terms-2026-12-01". */
  termsRevision: string | null;
  /** Approved tax rule; returns tax in USDT minor units plus a revision label. */
  tax: ((userId: string, subtotalMinor: number) => Promise<{amountMinor: number; revision: string}>) | null;
  /** Approved prices. A level/term pair that is not listed is not sold. */
  prices: SubscriptionPrices;
  /** Gram (the TON network coin) only: approved FX adapters quoting USDT per GRAM, and policy. USDT needs no rate. */
  gramFx: {providers: readonly FxProvider[]; policy: FxPolicy} | null;
}
export const commerceLaunchDecisions: Readonly<CommerceLaunchDecisions> = Object.freeze({
  termsRevision: null,
  tax: null,
  // Max Tall, 27.11.2026: a monthly subscription, «Product» 16 USDT and «Всё» 39 USDT per month
  // (roadmap decision 26), plus a discounted annual term he asked to set right away: 12 months for
  // the price of 10 — «Product» 160 USDT and «Всё» 390 USDT per year.
  prices: Object.freeze({product: Object.freeze({1: 1600, 12: 16000}), all: Object.freeze({1: 3900, 12: 39000})}),
  gramFx: null,
});

/** Approved price for a level and paid term, or null when that term is not sold. */
export function subscriptionPrice(prices: SubscriptionPrices, plan: SubscriptionPlan, months: number): number | null {
  const table = prices[plan];
  return table && Object.hasOwn(table, months) ? table[months] : null;
}

/** Production dependencies derived only from approved decisions; anything missing fails closed. */
export function productionCommerceDependencies(options: {deliveryReady: boolean; decisions?: Readonly<CommerceLaunchDecisions>; now?: () => number}): CommerceHostDependencies {
  const decisions = options.decisions ?? commerceLaunchDecisions;
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));
  const gram = decisions.gramFx ? createUsdExchangeRate({...decisions.gramFx, now}) : null;
  return {
    readiness: async () => ({deliveryReady: options.deliveryReady, sellerTermsReady: decisions.termsRevision !== null, termsRevision: decisions.termsRevision ?? ''}),
    tax: async (userId, subtotalMinor) => {
      if (!decisions.tax) throw new CommerceError('COMMERCE_DISABLED');
      return decisions.tax(userId, subtotalMinor);
    },
    price: (plan, months) => subscriptionPrice(decisions.prices, plan, months),
    exchangeRate: async asset => {
      if (asset === 'USDT') return usdtPriceRate(now());
      if (!gram) throw new FxError('FX_NOT_CONFIGURED');
      return gram(asset);
    },
  };
}
