import {addUtcMonths} from '../delivery/releases.ts';
import {LedgerError,type CommerceLedger,type Settlement} from './ledger.ts';
import {currentAccess,isPaidMonths,isSubscriptionPlan,levelEnd,otherLevelPaid,renewalStart,type AccessPeriod,type SubscriptionPlan} from './subscription.ts';

/**
 * Idempotent fulfillment worker: turns a verified settlement intent (ton_payment_outbox) into a
 * receipt and one access period. A term starts at the current end of the same level, so
 * remaining days are kept. An upgrade closes the remaining Product periods and opens «Всё» from
 * the payment until the Product end that was recalculated in the quote. It never creates
 * payments and never touches money. Disabling new sales does not stop fulfillment of already
 * settled invoices.
 */
export interface FulfillmentDependencies {
  ledger: CommerceLedger;
  now?: () => number;
}
export interface FulfillmentReport {fulfilled: number; retried: number; review: number; skipped: number}

/**
 * End of a paid term that starts at `startsAt`. A renewal keeps the day of month of the
 * uninterrupted chain of terms it continues (31 Jan → 28 Feb → 31 Mar), so a subscription started
 * on the 29th–31st does not drift to the 28th. Closed (refunded or upgraded) terms still fix the
 * day of month; only the start of the new term comes from paid, open access.
 */
export function termEnd(periods: readonly AccessPeriod[], plan: SubscriptionPlan, startsAt: number, months: number) {
  const terms = periods.filter(period => period.plan === plan && period.kind === 'term' && period.months !== null);
  let anchor = startsAt, total = months;
  for (let previous = terms.find(period => period.endsAt === anchor); previous && total + previous.months! <= 120; previous = terms.find(period => period.endsAt === anchor)) {
    anchor = previous.startsAt; total += previous.months!;
  }
  return addUtcMonths(anchor, total);
}

class Permanent extends Error {
  readonly code: string;
  constructor(code: string) {super(code); this.code = code;}
}

export function createFulfillmentWorker(deps: FulfillmentDependencies) {
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  function validate(settlement: Settlement | null) {
    if (!settlement) throw new Permanent('INVOICE_MISSING');
    const {invoice, quote, order} = settlement;
    if (!quote || !order) throw new Permanent('ORDER_MISSING');
    if (invoice.status !== 'paid' || invoice.paidAt === null) throw new Permanent('INVOICE_NOT_PAID');
    if (quote.userId !== invoice.userId || order.userId !== invoice.userId) throw new Permanent('OWNER_MISMATCH');
    const sorted = [...quote.itemIds].sort();
    const shape = quote.kind === 'term' ? isPaidMonths(quote.months) : quote.kind === 'upgrade' && quote.plan === 'all' && quote.months === null && quote.currentAccessEnd !== null && quote.upgradeOrderIds.length > 0;
    if (!isSubscriptionPlan(quote.plan) || !shape || !quote.itemIds.length || JSON.stringify(sorted) !== JSON.stringify(quote.itemIds)
      || invoice.itemIdsJson !== JSON.stringify(quote.itemIds) || invoice.termsRevision !== quote.termsRevision || invoice.usdMinor !== quote.totalMinor) throw new Permanent('SNAPSHOT_MISMATCH');
    return {orderId: order.id, userId: order.userId, paidAt: invoice.paidAt, plan: quote.plan, kind: quote.kind === 'upgrade' ? 'upgrade' as const : 'term' as const, months: quote.months, productEnd: quote.currentAccessEnd, upgradeOrderIds: quote.upgradeOrderIds};
  }
  return {
    async process(limit = 25): Promise<FulfillmentReport> {
      const report: FulfillmentReport = {fulfilled: 0, retried: 0, review: 0, skipped: 0};
      for (const candidate of await deps.ledger.fulfillmentCandidates(now(), limit)) {
        let orderId: string | null = null;
        try {
          const settlement = await deps.ledger.settlement(candidate.invoiceId);
          // Known before validation, so a review state is always attached to the owner's order.
          orderId = settlement?.order?.id ?? null;
          const next = validate(settlement);
          // Other orders' periods only: a replay of this order never shifts its own start.
          const periods = (await deps.ledger.accessPeriods(next.userId)).filter(period => period.orderId !== next.orderId);
          let startsAt: number, endsAt: number;
          if (next.kind === 'upgrade') {
            if (next.productEnd! <= next.paidAt) throw new Permanent('UPGRADE_EXPIRED');
            // The Product access recalculated in the quote must still be open at the payment, unrefunded,
            // uninterrupted and exactly the one being switched.
            const quoted = periods.filter(period => next.upgradeOrderIds.includes(period.orderId));
            const remaining = periods.filter(period => period.status === 'active' && period.plan === 'product' && period.endsAt > next.paidAt);
            const access = currentAccess(periods, next.paidAt);
            if (quoted.length !== next.upgradeOrderIds.length || quoted.some(period => period.status !== 'active') || remaining.some(period => !next.upgradeOrderIds.includes(period.orderId))
              || access?.plan !== 'product' || access.endsAt !== next.productEnd || levelEnd(periods, 'product') !== next.productEnd) throw new Permanent('UPGRADE_CHANGED');
            if (otherLevelPaid(periods, 'product', next.paidAt)) throw new Permanent('PLAN_CONFLICT');
            startsAt = next.paidAt; endsAt = next.productEnd!;
          } else {
            startsAt = renewalStart(periods, next.plan, next.paidAt);
            // A new term of another level while one is paid is not sold; such a payment waits for support.
            if (otherLevelPaid(periods, next.plan, startsAt)) throw new Permanent('PLAN_CONFLICT');
            endsAt = termEnd(periods, next.plan, startsAt, next.months!);
          }
          const fulfilled = await deps.ledger.fulfill({invoiceId: candidate.invoiceId, orderId: next.orderId, userId: next.userId, kind: next.kind, paidAt: next.paidAt, startsAt, endsAt, now: now()});
          if (fulfilled) report.fulfilled++;
          else if (await deps.ledger.markAttempt(candidate.invoiceId, orderId, 'review', 'FULFILLMENT_REJECTED', now()) === 'fulfilled') report.skipped++;
          else report.review++;
        } catch (cause) {
          const permanent = cause instanceof Permanent || cause instanceof LedgerError && cause.code === 'INVALID_INPUT';
          const code = cause instanceof Permanent ? cause.code : cause instanceof LedgerError ? cause.code : 'TEMPORARILY_UNAVAILABLE';
          let state: 'retry' | 'review' | 'fulfilled';
          try {state = await deps.ledger.markAttempt(candidate.invoiceId, orderId, permanent ? 'review' : 'retry', code, now());} catch {report.skipped++; continue;}
          if (state === 'review') report.review++; else if (state === 'retry') report.retried++; else report.skipped++;
        }
      }
      return report;
    },
  };
}
