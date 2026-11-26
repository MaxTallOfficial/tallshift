import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerceFixture,memoryBucket,release,zipBytes} from './helpers/commerce-fixture.ts';
import {createFulfillmentWorker} from '../src/server/orders/fulfillment.ts';
import {createDeliveryHttpHandlers} from '../src/server/delivery/downloads.ts';
import {createR2ArtifactStore} from '../src/server/delivery/storage.ts';
import {createDownloadTickets,ticketBinding} from '../src/server/delivery/tickets.ts';
import {releaseAccess,validatePaidReleases,paidReleaseRegistry,type PaidRelease} from '../src/server/delivery/releases.ts';
import {publishedPaidReleases} from '../src/server/orders/service.ts';

const origin = 'https://tallshift.test', secret = 'test-only-secret-at-least-32-characters';
async function delivery(options: {extra?: {release: PaidRelease; bytes: Uint8Array}[]} = {}) {
  const f = createCommerceFixture({items: ['S004', 'S005', 'S006', 'C003', 'C004', 'E002']});
  for (const entry of options.extra ?? []) {f.releases.push(entry.release); f.objects.set(entry.release.objectKey, entry.bytes);}
  await f.settle('buyer', 'product');
  await createFulfillmentWorker({ledger: f.ledger, releases: f.releases, now: () => f.state.now}).process();
  const storage = memoryBucket(f.objects);
  const ctl = {session: {userId: 'buyer', sessionId: 'session-a'} as {userId: string; sessionId: string} | null, csrf: true, limit: true, enabled: true};
  const tickets = createDownloadTickets(secret);
  const h = createDeliveryHttpHandlers({
    get enabled() {return ctl.enabled;}, mainOrigin: origin, releases: f.releases, ledger: f.ledger, storage: createR2ArtifactStore(storage.bucket),
    tickets: () => tickets, authenticate: async () => ctl.session, verifyCsrf: async () => ctl.csrf, rateLimit: async () => ctl.limit, now: () => f.state.now,
  });
  const issue = (body: unknown, headers: Record<string, string> = {}) => h.issue(new Request(`${origin}/api/v1/downloads`, {method: 'POST', headers: {origin, 'content-type': 'application/json', ...headers}, body: JSON.stringify(body)}));
  const serve = (url: string) => h.serve(new Request(origin + url), url.split('/').pop()!);
  return {f, h, ctl, storage, issue, serve};
}

test('no paid release is registered yet: every paid item stays planned', () => {
  assert.equal(paidReleaseRegistry.length, 0);
  assert.equal(Object.keys(publishedPaidReleases).length, 0);
});

test('registry validation rejects malformed, oversized, duplicated or mis-keyed entries', () => {
  const good = release('S004', '1.0.0', 500).release;
  assert.doesNotThrow(() => validatePaidReleases([good]));
  for (const bad of [{...good, sha256: 'A'.repeat(64)}, {...good, byteLength: 6 * 1024 * 1024}, {...good, objectKey: 'public/S004.zip'}, {...good, version: '1.0'}, {...good, itemId: 'X001'}, {...good, kind: 'beta'}]) assert.throws(() => validatePaidReleases([bad as PaidRelease]));
  assert.throws(() => validatePaidReleases([good, {...good}]), /DUPLICATE_RELEASE/);
});

test('entitlements come from the server ledger only and are private to the owner', async () => {
  const {f, h, ctl} = await delivery();
  try {
    const response = await h.entitlements(new Request(`${origin}/api/v1/me/entitlements`));
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const body = await response.json();
    assert.deepEqual(body.items.map((x: {itemId: string}) => x.itemId), ['C003', 'C004', 'E002', 'S004', 'S005', 'S006']);
    assert.equal(body.items[0].functionalUpdatesUntil, '1971-01-01');
    assert.equal(body.items[0].releases[0].access, 'available');
    assert.equal(body.receipts.length, 1); assert.equal(body.receipts[0].subtotalMinor, 1600);
    ctl.session = {userId: 'other', sessionId: 'session-b'};
    assert.deepEqual((await (await h.entitlements(new Request(origin))).json()).items, []);
    ctl.session = null; assert.equal((await h.entitlements(new Request(origin))).status, 401);
    ctl.session = {userId: 'buyer', sessionId: 'session-a'}; ctl.enabled = false;
    const disabled = await h.entitlements(new Request(origin));
    assert.equal(disabled.status, 503); assert.equal((await disabled.json()).error.code, 'COMMERCE_DISABLED');
  } finally {f.sqlite.close();}
});

test('owner downloads exact verified bytes through a session-bound ticket with private headers', async () => {
  const {f, issue, serve, storage} = await delivery();
  try {
    const issued = await issue({itemId: 'S004'});
    assert.equal(issued.status, 201);
    const ticket = await issued.json();
    assert.match(ticket.url, /^\/api\/v1\/downloads\/v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    assert.equal(ticket.expiresAt, 1120);
    assert.ok(!ticket.url.includes('buyer') && !ticket.url.includes('session-a'), 'no internal IDs in the URL');
    const response = await serve(ticket.url);
    assert.equal(response.status, 200);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), zipBytes('S004@1.0.0'));
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('content-type'), 'application/zip');
    assert.equal(response.headers.get('content-disposition'), 'attachment; filename="tallshift-S004-1.0.0.zip"');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(storage.calls, [f.releases.find(r => r.itemId === 'S004')!.objectKey], 'object key comes from the registry');
    assert.deepEqual(f.sqlite.prepare('SELECT outcome FROM commerce_download_events ORDER BY created_at,outcome').all().map(r => r.outcome), ['issued', 'served']);
  } finally {f.sqlite.close();}
});

test('ticket is useless for another session, another user, after expiry or when tampered', async () => {
  const {f, ctl, issue, serve} = await delivery();
  try {
    const {url} = await (await issue({itemId: 'S004'})).json();
    ctl.session = {userId: 'buyer', sessionId: 'session-other-device'};
    assert.equal((await serve(url)).status, 403);
    ctl.session = {userId: 'other', sessionId: 'session-a'};
    assert.equal((await serve(url)).status, 403);
    ctl.session = null;
    assert.equal((await serve(url)).status, 401);
    ctl.session = {userId: 'buyer', sessionId: 'session-a'};
    const parts = url.split('.');
    assert.equal((await serve([parts[0], parts[1], parts[2].slice(0, -2) + (parts[2].endsWith('AA') ? 'BB' : 'AA')].join('.'))).status, 403);
    assert.equal((await serve('/api/v1/downloads/not-a-ticket')).status, 403);
    f.state.now = 1120;
    assert.equal((await serve(url)).status, 403, 'expired');
  } finally {f.sqlite.close();}
});

test('coverage is re-checked on every request: revoked grants and withdrawn releases stop delivery', async () => {
  const {f, issue, serve} = await delivery();
  try {
    const {url} = await (await issue({itemId: 'S004'})).json();
    f.sqlite.prepare("UPDATE commerce_grants SET status='revoked',revoked_at=1001,revoke_reason='refund' WHERE item_id='S004'").run();
    const denied = await serve(url);
    assert.equal(denied.status, 403); assert.equal((await denied.json()).error.code, 'RELEASE_NOT_COVERED');
    assert.equal((await issue({itemId: 'S004'})).status, 403);
    const second = await (await issue({itemId: 'S005'})).json();
    await f.ledger.revokeRelease('S005', f.releases.find(r => r.itemId === 'S005')!.sha256, 'security', 1001);
    const gone = await serve(second.url);
    assert.equal(gone.status, 410); assert.equal((await gone.json()).error.code, 'RELEASE_REVOKED');
    assert.equal((await issue({itemId: 'S005'})).status, 410);
  } finally {f.sqlite.close();}
});

test('storage integrity or availability failures return no bytes and keep ownership', async () => {
  const {f, issue, serve, storage} = await delivery();
  try {
    const key = f.releases.find(r => r.itemId === 'S004')!.objectKey;
    storage.objects.set(key, zipBytes('tampered!!'));
    const {url} = await (await issue({itemId: 'S004'})).json();
    const corrupt = await serve(url);
    assert.equal(corrupt.status, 503); assert.equal((await corrupt.json()).error.code, 'ARTIFACT_INTEGRITY');
    storage.objects.delete(key);
    assert.equal((await serve(url)).status, 503);
    assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM commerce_grants WHERE status='active'").get()?.n, 6);
    assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM commerce_download_events WHERE outcome='served'").get()?.n, 0);
  } finally {f.sqlite.close();}
});

test('issue validates origin, CSRF, rate limit, strict body and ownership', async () => {
  const {f, ctl, issue} = await delivery();
  try {
    assert.equal((await issue({itemId: 'S004'}, {origin: 'https://evil.test'})).status, 403);
    ctl.csrf = false; assert.equal((await issue({itemId: 'S004'})).status, 403); ctl.csrf = true;
    ctl.limit = false; assert.equal((await issue({itemId: 'S004'})).status, 429); ctl.limit = true;
    assert.equal((await issue({itemId: 'S004', userId: 'other'})).status, 400);
    assert.equal((await issue({itemId: 'S004', objectKey: 'paid/S004/1.0.0/x.zip'})).status, 400);
    assert.equal((await issue({itemId: '../S004'})).status, 400);
    assert.equal((await issue({itemId: 'S012'})).status, 403, 'not owned');
    assert.equal((await issue({itemId: 'S004', sha256: 'f'.repeat(64)})).status, 404);
    ctl.session = null; assert.equal((await issue({itemId: 'S004'})).status, 401);
  } finally {f.sqlite.close();}
});

test('functional updates end with the window; security remediation stays available to owners', async () => {
  const late = 4_000_000_000;
  const functional = release('S004', '1.1.0', late, 'functional'), security = release('S005', '1.0.1', late, 'security');
  const {f, issue, serve} = await delivery({extra: [functional, security]});
  try {
    assert.equal((await issue({itemId: 'S004', sha256: functional.release.sha256})).status, 403);
    const latest = await (await issue({itemId: 'S004'})).json();
    assert.equal(latest.version, '1.0.0');
    const fix = await (await issue({itemId: 'S005'})).json();
    assert.equal(fix.version, '1.0.1');
    assert.deepEqual(new Uint8Array(await (await serve(fix.url)).arrayBuffer()), security.bytes);
    assert.equal(releaseAccess(security.release, [], new Set()), 'not_covered', 'security fixes need ownership');
  } finally {f.sqlite.close();}
});

test('tickets have a bounded lifetime and bind user and session', async () => {
  const tickets = await createDownloadTickets(secret);
  const binding = await ticketBinding('buyer', 'session-a');
  assert.notEqual(binding, await ticketBinding('buyer', 'session-b'));
  const token = await tickets.sign({binding, itemId: 'S004', sha256: 'a'.repeat(64), expiresAt: 1500});
  assert.equal(await tickets.verify(token, 1000), null, 'lifetime above 120s is refused');
  assert.ok(await tickets.verify(token, 1400));
  assert.equal(await (await createDownloadTickets('another-secret-with-at-least-32-chars')).verify(token, 1400), null);
  await assert.rejects(() => createDownloadTickets('short'));
});
