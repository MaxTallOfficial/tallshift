import {addUtcMonths,validatePaidReleases,type PaidRelease} from '../delivery/releases.ts';
import {LedgerError,type CommerceLedger,type GrantPlan,type Settlement} from './ledger.ts';

/**
 * Idempotent fulfillment worker: turns a verified settlement intent (ton_payment_outbox)
 * into a receipt and grants for exactly the paid missing items of the immutable quote.
 * It never creates payments, never grants anything outside the paid snapshot and never
 * touches money. Disabling new sales does not stop fulfillment of already settled invoices.
 */
export interface FulfillmentDependencies {
  ledger: CommerceLedger;
  /** Reviewed paid releases; every snapshot hash of a paid quote must be present. */
  releases: readonly PaidRelease[];
  now?: () => number;
}
export interface FulfillmentReport {fulfilled: number; retried: number; review: number; skipped: number}

/** Splits the paid subtotal over sorted item IDs: quotient each, +1 for the first remainder IDs. */
export function allocateMinor(totalMinor: number, sortedItemIds: readonly string[]) {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0 || !sortedItemIds.length) throw new RangeError('INVALID_ALLOCATION');
  const base = Math.floor(totalMinor / sortedItemIds.length), remainder = totalMinor % sortedItemIds.length;
  return sortedItemIds.map((itemId, index) => ({itemId, allocationMinor: base + (index < remainder ? 1 : 0)}));
}

class Permanent extends Error {
  readonly code: string;
  constructor(code: string) {super(code); this.code = code;}
}

export function createFulfillmentWorker(deps: FulfillmentDependencies) {
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const known = new Map(validatePaidReleases(deps.releases).map(release => [release.sha256, release.itemId]));
  function plan(invoiceId: string, settlement: Settlement | null) {
    if (!settlement) throw new Permanent('INVOICE_MISSING');
    const {invoice, quote, order} = settlement;
    if (!quote || !order) throw new Permanent('ORDER_MISSING');
    if (invoice.status !== 'paid' || invoice.paidAt === null) throw new Permanent('INVOICE_NOT_PAID');
    if (quote.userId !== invoice.userId || order.userId !== invoice.userId) throw new Permanent('OWNER_MISMATCH');
    const sorted = [...quote.itemIds].sort();
    if (!quote.itemIds.length || JSON.stringify(sorted) !== JSON.stringify(quote.itemIds) || invoice.itemIdsJson !== JSON.stringify(quote.itemIds)
      || invoice.termsRevision !== quote.termsRevision || invoice.usdMinor !== quote.totalMinor) throw new Permanent('SNAPSHOT_MISMATCH');
    // Each snapshot hash must be a reviewed release of that very item.
    if (Object.keys(quote.releases).length !== quote.itemIds.length || !quote.itemIds.every(id => known.get(quote.releases[id]) === id)) throw new Permanent('RELEASE_UNKNOWN');
    const grants: GrantPlan[] = allocateMinor(quote.subtotalMinor, quote.itemIds).map(({itemId, allocationMinor}) => ({itemId, allocationMinor, releaseSha256: quote.releases[itemId]}));
    return {invoiceId, orderId: order.id, userId: order.userId, paidAt: invoice.paidAt, updatesEnd: addUtcMonths(invoice.paidAt, 12), grants};
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
          const next = plan(candidate.invoiceId, settlement);
          // Paid grants for an item the owner already holds are still delivered; the overlap is surfaced to support.
          const held = new Set((await deps.ledger.activeGrants(next.userId)).filter(grant => grant.orderId !== next.orderId).map(grant => grant.itemId));
          const note = next.grants.some(grant => held.has(grant.itemId)) ? 'OWNERSHIP_OVERLAP' : null;
          if (await deps.ledger.fulfill({...next, note, now: now()})) report.fulfilled++;
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
