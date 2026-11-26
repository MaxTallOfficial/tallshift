import {transactionHint} from './hints.ts';
import type {D1DatabaseLike,D1StatementLike,TonNetwork} from './store.ts';

/**
 * Backfill for missed webhooks. Reads the receiving account's transactions after a durable
 * cursor, stores each finalized transaction as an inbox hint and advances the cursor in the
 * same D1 batch, only over the contiguous finalized prefix (a pending transaction is never
 * skipped). The existing inbox worker then verifies every hint independently.
 */
export interface ChainScanReader {
  scan(afterLt: string, limit?: number): Promise<Array<{hash: string; lt: string; finalized: boolean}>>;
  head(): Promise<{lt: string; utime: number; finalized: boolean} | null>;
}
export interface ScanReport {
  state: 'scanned' | 'initialized' | 'busy' | 'cursor_required' | 'head_not_final' | 'lease_lost';
  pages: number; hints: number; cursor: string | null; caughtUp: boolean;
}
export class ScanError extends Error {
  readonly code: 'INVALID_INPUT' | 'DATABASE_ERROR';
  constructor(code: ScanError['code']) {super(code); this.code = code;}
}
const lt = (value: unknown): value is string => typeof value === 'string' && /^(?:0|[1-9]\d{0,19})$/.test(value) && BigInt(value) < (1n << 64n);

export function createTonChainScanner(deps: {
  db: D1DatabaseLike; reader: ChainScanReader; network: TonNetwork; recipient: string;
  now?: () => number; pageSize?: number; maxPages?: number; leaseSeconds?: number;
}) {
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const pageSize = deps.pageSize ?? 100, maxPages = deps.maxPages ?? 5, leaseSeconds = deps.leaseSeconds ?? 120;
  if (!/^(?:0|-1):[a-f0-9]{64}$/.test(deps.recipient) || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 || !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 50 || !Number.isSafeInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 600) throw new ScanError('INVALID_INPUT');
  const scope = `${deps.network}:${deps.recipient}`;
  const statement = (sql: string, ...values: unknown[]) => deps.db.prepare(sql).bind(...values);
  const batch = async (statements: D1StatementLike[]) => {
    const result = await deps.db.batch(statements);
    if (result.length !== statements.length || result.some(item => !item.success)) throw new ScanError('DATABASE_ERROR');
    return result;
  };
  const hintStatements = async (entries: readonly {hash: string; lt: string}[], at: number) => Promise.all(entries.map(async entry => {
    const hint = await transactionHint(deps.network, deps.recipient, entry.lt, entry.hash);
    return statement('INSERT INTO ton_webhook_inbox (event_key,body_digest,received_at,reference) VALUES (?,?,?,?) ON CONFLICT DO NOTHING', hint.eventKey, hint.bodyDigest, at, hint.reference);
  }));
  const report = (state: ScanReport['state'], cursor: string | null, pages = 0, hints = 0, caughtUp = false): ScanReport => ({state, pages, hints, cursor, caughtUp});

  /**
   * Starts at the account head only when no transaction after an existing invoice could be
   * skipped: either no invoices exist yet or the newest transaction predates all of them.
   * Otherwise an operator must initialize the cursor explicitly before the first invoice.
   */
  async function initializeIfSafe(): Promise<ScanReport> {
    const head = await deps.reader.head();
    if (head && !head.finalized) return report('head_not_final', null);
    if (head && !lt(head.lt)) throw new ScanError('INVALID_INPUT');
    const earliest = await statement('SELECT min(created_at) AS at FROM ton_invoices WHERE network=? AND recipient=?', deps.network, deps.recipient).first<{at: number | null}>();
    if (earliest?.at !== null && earliest?.at !== undefined && head && head.utime >= Number(earliest.at)) return report('cursor_required', null);
    const start = head?.lt ?? '0';
    await batch([statement('INSERT INTO ton_scan_cursors(scope,last_lt,updated_at) VALUES(?,?,?) ON CONFLICT DO NOTHING', scope, start, now())]);
    return report('initialized', start);
  }

  return {
    async scan(): Promise<ScanReport> {
      const existing = await statement('SELECT last_lt FROM ton_scan_cursors WHERE scope=?', scope).first<{last_lt: string}>();
      if (!existing) return initializeIfSafe();
      const token = crypto.randomUUID();
      const claimed = await batch([statement('UPDATE ton_scan_cursors SET lease_until=?,lease_token=? WHERE scope=? AND (lease_until IS NULL OR lease_until<=?)', now() + leaseSeconds, token, scope, now())]);
      if (claimed[0].meta?.changes !== 1) return report('busy', existing.last_lt);
      let cursor = (await statement('SELECT last_lt FROM ton_scan_cursors WHERE scope=? AND lease_token=?', scope, token).first<{last_lt: string}>())?.last_lt ?? null;
      if (!lt(cursor)) throw new ScanError('DATABASE_ERROR');
      let pages = 0, hints = 0, caughtUp = false, lost = false;
      try {
        while (pages < maxPages) {
          const entries = await deps.reader.scan(cursor, pageSize);
          const prefix: typeof entries = [];
          for (const entry of entries) {if (!entry.finalized) break; prefix.push(entry);}
          if (!prefix.length) {caughtUp = entries.length === 0; break;}
          const last = prefix[prefix.length - 1].lt, at = now();
          const result = await batch([...await hintStatements(prefix, at),
            statement('UPDATE ton_scan_cursors SET last_lt=?,updated_at=?,lease_until=? WHERE scope=? AND lease_token=? AND last_lt=?', last, at, at + leaseSeconds, scope, token, cursor)]);
          if (result[result.length - 1].meta?.changes !== 1) {lost = true; break;}
          hints += result.slice(0, -1).filter(item => item.meta?.changes === 1).length;
          cursor = last; pages++;
          if (prefix.length < entries.length) break;
          if (entries.length < pageSize) {caughtUp = true; break;}
        }
      } finally {
        await batch([statement('UPDATE ton_scan_cursors SET lease_until=NULL,lease_token=NULL WHERE scope=? AND lease_token=?', scope, token)]);
      }
      return report(lost ? 'lease_lost' : 'scanned', cursor, pages, hints, caughtUp);
    },
    /**
     * Operator recovery: re-reads a closed historical range (fromLt, toLt] and stores hints.
     * Never moves the cursor; duplicates are absorbed by the shared hint key.
     */
    async backfill(fromLt: string, toLt: string, pageLimit = 20) {
      if (!lt(fromLt) || !lt(toLt) || BigInt(toLt) <= BigInt(fromLt) || !Number.isSafeInteger(pageLimit) || pageLimit < 1 || pageLimit > 50) throw new ScanError('INVALID_INPUT');
      let cursor = fromLt, pages = 0, hints = 0, pending = 0, complete = false;
      while (pages < pageLimit) {
        const entries = (await deps.reader.scan(cursor, pageSize));
        const inRange = entries.filter(entry => BigInt(entry.lt) <= BigInt(toLt));
        const finalized = inRange.filter(entry => entry.finalized);
        pending += inRange.length - finalized.length;
        if (finalized.length) {
          const result = await batch(await hintStatements(finalized, now()));
          hints += result.filter(item => item.meta?.changes === 1).length;
        }
        pages++;
        if (!entries.length || inRange.length < entries.length || entries.length < pageSize) {complete = true; break;}
        cursor = entries[entries.length - 1].lt;
      }
      return {pages, hints, pending, complete};
    },
    /** Operator-only explicit start (e.g. an lt before the first invoice). Never overwrites a cursor. */
    async initialize(startLt: string) {
      if (!lt(startLt)) throw new ScanError('INVALID_INPUT');
      const result = await batch([statement('INSERT INTO ton_scan_cursors(scope,last_lt,updated_at) VALUES(?,?,?) ON CONFLICT DO NOTHING', scope, startLt, now())]);
      return result[0].meta?.changes === 1;
    },
  };
}
