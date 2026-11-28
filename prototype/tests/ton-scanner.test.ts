import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createD1Fixture} from './helpers/ton-d1.ts';
import {createTonChainScanner} from '../src/server/payments/ton/scanner.ts';
import {transactionHint} from '../src/server/payments/ton/hints.ts';
import {createTonHttpHandlers} from '../src/server/payments/ton/http.ts';
import {createTonInboxWorker} from '../src/server/payments/ton/worker.ts';
import {createToncenterReader} from '../src/server/payments/ton/toncenter.ts';
import type {TonPaymentService} from './helpers/scanner-types.ts';

const recipient = '0:' + 'a'.repeat(64), network = 'ton-testnet' as const;
type Tx = {lt: string; hash: string; finalized: boolean; utime: number};
const tx = (n: number, finalized = true, utime = 10_000 + n): Tx => ({lt: String(n), hash: n.toString(16).padStart(64, '0'), finalized, utime});
function setup(entries: Tx[] = [], options: {pageSize?: number; maxPages?: number} = {}) {
  const f = createD1Fixture();
  for (const file of ['0002_auth.sql', '0003_commerce.sql', '0004_commerce_fulfillment.sql']) f.sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  const state = {now: 20_000, entries};
  const calls = {scan: [] as string[], head: 0};
  const reader = {
    async scan(afterLt: string, limit = 100) {calls.scan.push(afterLt); return state.entries.filter(e => BigInt(e.lt) > BigInt(afterLt)).sort((a, b) => Number(BigInt(a.lt) - BigInt(b.lt))).slice(0, limit).map(({hash, lt, finalized}) => ({hash, lt, finalized}));},
    async head() {calls.head++; const last = state.entries.at(-1); return last ? {lt: last.lt, utime: last.utime, finalized: last.finalized} : null;},
  };
  const scanner = createTonChainScanner({db: f.db, reader, network, recipient, now: () => state.now, ...options});
  const cursor = () => (f.sqlite.prepare('SELECT last_lt FROM ton_scan_cursors').get() as {last_lt?: string} | undefined)?.last_lt ?? null;
  const invoice = (createdAt: number) => f.store.createInvoice({id: `inv-${createdAt}`, userId: 'buyer', quoteId: `quote-${createdAt}`, itemIds: ['S004'], termsRevision: 'terms', asset: 'TON', network, recipient, jettonMaster: null, amountBaseUnits: '1', comment: `ts_${createdAt.toString(16).padStart(32, '0')}`, createdAt, expiresAt: createdAt + 900, fxQuoteId: 'fx', fxSnapshot: {usdMinor: 1}, idempotencyKey: `i-${createdAt}`, inputDigest: 'c'.repeat(64)});
  return {f, state, calls, scanner, cursor, invoice};
}

test('absent cursor starts at the head only when no transaction after an invoice can be skipped', async () => {
  const empty = setup([tx(100), tx(101)]);
  try {
    assert.deepEqual(await empty.scanner.scan(), {state: 'initialized', pages: 0, hints: 0, cursor: '101', caughtUp: false});
    assert.equal(empty.cursor(), '101'); assert.equal(empty.f.count('ton_webhook_inbox'), 0);
  } finally {empty.f.sqlite.close();}
  const risky = setup([tx(100), tx(101, true, 15_000)]);
  try {
    await risky.invoice(14_000);
    assert.equal((await risky.scanner.scan()).state, 'cursor_required');
    assert.equal(risky.cursor(), null);
    assert.equal(await risky.scanner.initialize('99'), true);
    assert.equal(await risky.scanner.initialize('150'), false, 'explicit start never overwrites');
    assert.equal(risky.cursor(), '99');
  } finally {risky.f.sqlite.close();}
  const safe = setup([tx(100), tx(101, true, 15_000)]);
  try {
    await safe.invoice(15_001);
    assert.equal((await safe.scanner.scan()).state, 'initialized');
    assert.equal(safe.cursor(), '101');
  } finally {safe.f.sqlite.close();}
  const pending = setup([tx(100), tx(101, false)]);
  try {assert.equal((await pending.scanner.scan()).state, 'head_not_final'); assert.equal(pending.cursor(), null);} finally {pending.f.sqlite.close();}
});

test('scan stores hints for the finalized prefix and advances the cursor in the same batch; a pending transaction is never skipped', async () => {
  const s = setup([tx(101), tx(102), tx(103, false), tx(104)]);
  try {
    await s.scanner.initialize('100');
    assert.deepEqual(await s.scanner.scan(), {state: 'scanned', pages: 1, hints: 2, cursor: '102', caughtUp: false});
    assert.equal(s.cursor(), '102');
    s.state.entries[2].finalized = true;
    assert.deepEqual(await s.scanner.scan(), {state: 'scanned', pages: 1, hints: 2, cursor: '104', caughtUp: true});
    assert.equal(s.f.count('ton_webhook_inbox'), 4);
    assert.deepEqual(await s.scanner.scan(), {state: 'scanned', pages: 0, hints: 0, cursor: '104', caughtUp: true});
    assert.equal(s.f.sqlite.prepare('SELECT lease_token FROM ton_scan_cursors').get()?.lease_token, null, 'lease released');
  } finally {s.f.sqlite.close();}
});

test('scan and webhook derive the same durable hint, so either source deduplicates the other', async () => {
  const s = setup([tx(101)]);
  try {
    await s.scanner.initialize('100');
    await s.scanner.scan();
    const hint = await transactionHint(network, recipient, '101', tx(101).hash);
    assert.equal(s.f.sqlite.prepare('SELECT reference FROM ton_webhook_inbox WHERE event_key=?').get(hint.eventKey)?.reference, hint.reference);
    const secret = 'w'.repeat(40);
    const http = createTonHttpHandlers({service: {} as TonPaymentService, store: s.f.store, config: {network, recipient, usdtMaster: '0:' + 'b'.repeat(64), enabled: false}, mainOrigin: 'https://tallshift.test', authenticate: async () => null, verifyCsrf: async () => false, rateLimit: async () => false, webhookSecret: secret, now: () => 20_001});
    const response = await http.webhook(new Request('https://tallshift.test/api/v1/payment/webhooks/tonapi', {method: 'POST', headers: {authorization: `Bearer ${secret}`, 'content-type': 'application/json'}, body: JSON.stringify({event_type: 'account_tx', account_id: recipient, lt: '101', tx_hash: tx(101).hash})}));
    assert.equal(response.status, 202);
    assert.equal(s.f.count('ton_webhook_inbox'), 1);
  } finally {s.f.sqlite.close();}
});

test('pagination is bounded per run and resumes from the durable cursor', async () => {
  const s = setup(Array.from({length: 250}, (_, i) => tx(1001 + i)), {pageSize: 100, maxPages: 2});
  try {
    await s.scanner.initialize('1000');
    assert.deepEqual(await s.scanner.scan(), {state: 'scanned', pages: 2, hints: 200, cursor: '1200', caughtUp: false});
    assert.deepEqual(await s.scanner.scan(), {state: 'scanned', pages: 1, hints: 50, cursor: '1250', caughtUp: true});
    assert.deepEqual(s.calls.scan, ['1000', '1100', '1200']);
  } finally {s.f.sqlite.close();}
});

test('a live lease makes a concurrent scanner back off; an expired lease is reclaimed', async () => {
  const s = setup([tx(101)]);
  try {
    await s.scanner.initialize('100');
    s.f.sqlite.prepare("UPDATE ton_scan_cursors SET lease_until=?,lease_token='other'").run(s.state.now + 60);
    assert.equal((await s.scanner.scan()).state, 'busy');
    assert.equal(s.f.count('ton_webhook_inbox'), 0);
    s.state.now += 61;
    assert.equal((await s.scanner.scan()).hints, 1);
  } finally {s.f.sqlite.close();}
});

test('a failed batch keeps cursor and inbox unchanged; the cursor cannot move backwards', async () => {
  const s = setup([tx(101), tx(102)]);
  try {
    await s.scanner.initialize('100');
    s.f.sqlite.exec("CREATE TRIGGER fixture_inbox_crash BEFORE INSERT ON ton_webhook_inbox BEGIN SELECT RAISE(ABORT,'fixture crash'); END");
    await assert.rejects(() => s.scanner.scan());
    assert.equal(s.cursor(), '100'); assert.equal(s.f.count('ton_webhook_inbox'), 0);
    assert.equal(s.f.sqlite.prepare('SELECT lease_token FROM ton_scan_cursors').get()?.lease_token, null);
    s.f.sqlite.exec('DROP TRIGGER fixture_inbox_crash');
    assert.equal((await s.scanner.scan()).cursor, '102');
    assert.throws(() => s.f.sqlite.prepare("UPDATE ton_scan_cursors SET last_lt='99'").run(), /scan cursor cannot move backwards/);
    assert.throws(() => s.f.sqlite.prepare("UPDATE ton_scan_cursors SET last_lt='0102'").run(), /CHECK constraint failed/);
  } finally {s.f.sqlite.close();}
});

test('operator backfill re-reads a closed range without moving the cursor and is idempotent', async () => {
  const s = setup([...Array.from({length: 30}, (_, i) => tx(101 + i)), tx(131, false), tx(132)], {pageSize: 10});
  try {
    await s.scanner.initialize('500');
    assert.deepEqual(await s.scanner.backfill('100', '131'), {pages: 4, hints: 30, pending: 1, complete: true});
    assert.equal(s.cursor(), '500');
    assert.deepEqual(await s.scanner.backfill('100', '131'), {pages: 4, hints: 0, pending: 1, complete: true});
    await assert.rejects(() => s.scanner.backfill('131', '100'));
  } finally {s.f.sqlite.close();}
});

test('scanned hints are verified by the existing inbox worker exactly like webhook hints', async () => {
  const s = setup([tx(101), tx(102)]);
  try {
    await s.scanner.initialize('100');
    await s.scanner.scan();
    const seen: string[] = [];
    const worker = createTonInboxWorker({store: s.f.store, network, recipient, now: () => s.state.now, reconcile: async (hash, asset) => {seen.push(`${asset}:${hash.slice(-3)}`); return {matched: hash === tx(101).hash};}});
    assert.deepEqual(await worker.process(), {matched: 1, unmatched: 1, retried: 0, review: 0, skipped: 0});
    // Inbox order follows the hint key, not lt; the matched hint stops after TON, the other tries both assets.
    assert.deepEqual(seen.sort(), ['TON:065', 'TON:066', 'USDT:066']);
    assert.equal(s.f.sqlite.prepare("SELECT count(*) AS n FROM ton_webhook_inbox WHERE state='processed'").get()?.n, 2);
  } finally {s.f.sqlite.close();}
});

test('operator requeue gives only exhausted hints a fresh retry budget', async () => {
  const s = setup();
  try {
    const insert = s.f.sqlite.prepare("INSERT INTO ton_webhook_inbox(event_key,body_digest,received_at,reference,state,attempts,last_error) VALUES(?,?,1,'ref','review',?,?)");
    insert.run('hint_exhausted', 'a'.repeat(64), 8, 'RETRY_EXHAUSTED');
    insert.run('hint_invalid', 'b'.repeat(64), 1, 'INVALID_REFERENCE');
    assert.equal(await s.f.store.requeueExhaustedWebhooks(), 1);
    const rows = s.f.sqlite.prepare('SELECT event_key,state,attempts,last_error FROM ton_webhook_inbox ORDER BY event_key').all();
    assert.deepEqual(rows.map(r => [r.event_key, r.state, r.attempts, r.last_error]), [['hint_exhausted', 'received', 0, null], ['hint_invalid', 'review', 1, 'INVALID_REFERENCE']]);
  } finally {s.f.sqlite.close();}
});

test('Toncenter requests of one cron reader are spaced to respect the provider rate limit', async () => {
  const times: number[] = [];
  const fetcher = (async () => {times.push(Date.now()); return new Response(JSON.stringify({ok: true, result: {state: 'active'}}), {headers: {'content-type': 'application/json'}});}) as unknown as typeof fetch;
  const reader = createToncenterReader({network, recipient, usdtMaster: '0:' + 'b'.repeat(64), enabled: false}, {fetcher, minIntervalMs: 40});
  await Promise.all([reader.isRecipientActive(), reader.isRecipientActive(), reader.isRecipientActive()]);
  assert.equal(times.length, 3);
  assert.ok(times[1] - times[0] >= 35 && times[2] - times[1] >= 35, JSON.stringify(times));
});
