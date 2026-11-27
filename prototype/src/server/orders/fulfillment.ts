import {addUtcMonths} from '../delivery/releases.ts';
import {LedgerError,type CommerceLedger,type Settlement} from './ledger.ts';
import {isPaidMonths,isSubscriptionPlan,otherLevelPaid,renewalStart} from './subscription.ts';

/**
 * Idempotent fulfillment worker: turns a verified settlement intent (ton_payment_outbox) into a
 * receipt and one access period for the paid level and term of the immutable quote. A renewal
 * starts at the current end of the same level, so remaining days are kept. It never creates
 * payments, never changes level on its own and never touches money. Disabling new sales does
 * not stop fulfillment of already settled invoices.
 */
export interface FulfillmentDependencies {
  ledger: CommerceLedger;
  now?: () => number;
}
export interface FulfillmentReport {fulfilled: number; retried: number; review: number; skipped: number}

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
    if (!isSubscriptionPlan(quote.plan) || !isPaidMonths(quote.months) || !quote.itemIds.length || JSON.stringify(sorted) !== JSON.stringify(quote.itemIds)
      || invoice.itemIdsJson !== JSON.stringify(quote.itemIds) || invoice.termsRevision !== quote.termsRevision || invoice.usdMinor !== quote.totalMinor) throw new Permanent('SNAPSHOT_MISMATCH');
    return {orderId: order.id, userId: order.userId, paidAt: invoice.paidAt, plan: quote.plan, months: quote.months};
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
          const startsAt = renewalStart(periods, next.plan, next.paidAt);
          // Switching level while another level is paid is not decided: such a payment waits for support.
          if (otherLevelPaid(periods, next.plan, startsAt)) throw new Permanent('PLAN_CONFLICT');
          const fulfilled = await deps.ledger.fulfill({invoiceId: candidate.invoiceId, orderId: next.orderId, userId: next.userId, paidAt: next.paidAt, startsAt, endsAt: addUtcMonths(startsAt, next.months), now: now()});
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
