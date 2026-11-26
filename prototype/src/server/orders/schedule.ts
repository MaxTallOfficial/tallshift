import type {TallshiftCloudflareEnv} from '../cloudflare/env.ts';
import {primaryAuthDatabase} from '../auth/store.ts';
import {paymentConfig} from '../payments/ton/config.ts';
import {createTonPaymentStore,type D1DatabaseLike} from '../payments/ton/store.ts';
import {createTonPaymentService,TonPaymentError} from '../payments/ton/service.ts';
import {createToncenterReader} from '../payments/ton/toncenter.ts';
import {createTonInboxWorker} from '../payments/ton/worker.ts';
import {createTonChainScanner,type ChainScanReader} from '../payments/ton/scanner.ts';
import type {TonChainProof} from '../payments/ton/verification.ts';
import {paidReleaseRegistry,type PaidRelease} from '../delivery/releases.ts';
import {createCommerceLedger} from './ledger.ts';
import {createFulfillmentWorker} from './fulfillment.ts';
import {salesFlagsEnabled} from './flags.ts';

/**
 * Cron entry (installed only through an explicit wrangler trigger): backfill hints from the
 * chain cursor, verify inbox hints, then fulfil settled invoices. Each step is isolated and
 * reports counts/codes only. It runs while invoices exist even if new sales are switched off.
 */
export interface ScheduleOptions {
  now?: () => number;
  /** Test seams; production uses the fixed Toncenter adapter for the confirmed recipient. */
  reader?: ChainScanReader & {readProof(hash: string, asset: 'TON' | 'USDT'): Promise<TonChainProof>};
  releases?: readonly PaidRelease[];
  db?: D1DatabaseLike;
}
export interface ScheduleReport {
  state: 'ran' | 'skipped';
  reason?: 'NO_DATABASE' | 'SCHEMA_MISSING' | 'NOTHING_TO_RECONCILE';
  scan?: unknown; inbox?: unknown; fulfillment?: unknown;
  errors: string[];
}
const requiredTables = ['ton_invoices', 'ton_webhook_inbox', 'ton_payment_outbox', 'commerce_quotes', 'commerce_orders', 'commerce_receipts', 'commerce_grants', 'commerce_fulfillments', 'ton_scan_cursors', 'commerce_release_revocations'];
const code = (cause: unknown) => {
  const value = cause instanceof Error ? (cause as Error & {code?: unknown}).code : undefined;
  return typeof value === 'string' && /^[A-Z_]{1,64}$/.test(value) ? value : 'TEMPORARILY_UNAVAILABLE';
};

export async function runCommerceSchedule(env: TallshiftCloudflareEnv, options: ScheduleOptions = {}): Promise<ScheduleReport> {
  if (!env.DB && !options.db) return {state: 'skipped', reason: 'NO_DATABASE', errors: []};
  const db: D1DatabaseLike = options.db ?? primaryAuthDatabase(env.DB!) as unknown as D1DatabaseLike;
  const tables = await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${requiredTables.map(() => '?').join(',')})`).bind(...requiredTables).all<{name: string}>();
  if (tables.results.length !== requiredTables.length) return {state: 'skipped', reason: 'SCHEMA_MISSING', errors: []};
  const sales = salesFlagsEnabled(env);
  const anyInvoice = await db.prepare('SELECT 1 AS present FROM ton_invoices LIMIT 1').bind().first<{present: number}>();
  if (!sales && !anyInvoice) return {state: 'skipped', reason: 'NOTHING_TO_RECONCILE', errors: []};

  const config = paymentConfig({enabled: false});
  const store = createTonPaymentStore(db);
  const reader = options.reader ?? createToncenterReader(config, {apiKey: env.TONCENTER_API_KEY});
  const unavailable = async () => {throw new TonPaymentError('COMMERCE_DISABLED');};
  // Reconciliation only: invoice creation is impossible from this service instance.
  const service = createTonPaymentService({config, store, resolveQuote: unavailable, exchangeRate: unavailable, isRecipientActive: async () => false, readProof: reader.readProof, now: options.now});
  const report: ScheduleReport = {state: 'ran', errors: []};
  try {report.scan = await createTonChainScanner({db, reader, network: config.network, recipient: config.recipient, now: options.now}).scan();} catch (cause) {report.errors.push(`scan:${code(cause)}`);}
  try {report.inbox = await createTonInboxWorker({store, network: config.network, recipient: config.recipient, reconcile: service.reconcile, now: options.now}).process(25);} catch (cause) {report.errors.push(`inbox:${code(cause)}`);}
  try {report.fulfillment = await createFulfillmentWorker({ledger: createCommerceLedger(db), releases: options.releases ?? paidReleaseRegistry, now: options.now}).process(25);} catch (cause) {report.errors.push(`fulfillment:${code(cause)}`);}
  return report;
}
