import {createUsdExchangeRate,FxError,type FxPolicy,type FxProvider} from '../payments/fx.ts';
import {CommerceError} from './store.ts';
import type {CommerceHostDependencies} from './host.ts';

/**
 * Owner decisions that gate any paid sale. Every value is unset on purpose: no seller terms
 * revision, no tax rule and no FX provider have been approved yet, so the production host
 * keeps quotes and invoices closed even if environment flags are switched on.
 * Fill these only from Max Tall's explicit decisions (see docs/knowledge-base/commerce-stage-2026-11-26.ru.md).
 */
export interface CommerceLaunchDecisions {
  /** Approved seller + terms/license/refund revision identifier, e.g. "terms-2026-12-01". */
  termsRevision: string | null;
  /** Approved tax rule; returns tax in USD minor units plus a revision label. */
  tax: ((userId: string, subtotalMinor: number) => Promise<{amountMinor: number; revision: string}>) | null;
  /** Approved FX adapters (first = primary price, others = cross-checks) and policy. */
  fx: {providers: readonly FxProvider[]; policy: FxPolicy} | null;
}
export const commerceLaunchDecisions: Readonly<CommerceLaunchDecisions> = Object.freeze({termsRevision: null, tax: null, fx: null});

/** Production dependencies derived only from approved decisions; anything missing fails closed. */
export function productionCommerceDependencies(options: {deliveryReady: boolean; decisions?: Readonly<CommerceLaunchDecisions>}): CommerceHostDependencies {
  const decisions = options.decisions ?? commerceLaunchDecisions;
  return {
    readiness: async () => ({deliveryReady: options.deliveryReady, sellerTermsReady: decisions.termsRevision !== null, termsRevision: decisions.termsRevision ?? ''}),
    tax: async (userId, subtotalMinor) => {
      if (!decisions.tax) throw new CommerceError('COMMERCE_DISABLED');
      return decisions.tax(userId, subtotalMinor);
    },
    exchangeRate: decisions.fx ? createUsdExchangeRate(decisions.fx) : async () => {throw new FxError('FX_NOT_CONFIGURED');},
  };
}
