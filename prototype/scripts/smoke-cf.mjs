import assert from 'node:assert/strict';

// Run against `npm run dev:cf`; never contact a cloud account or a public host.
const origin = process.env.CF_SMOKE_ORIGIN ?? 'http://127.0.0.1:8787';
const target = new URL(origin);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname), 'Local smoke requires a loopback host');
assert.equal(target.protocol, 'http:');
const nonces = new Set();
let assetPath;
for (const locale of ['en', 'ru', 'vi']) {
  const response = await fetch(`${origin}/${locale}`);
  assert.equal(response.status, 200, `${locale} status`);
  const html = await response.text();
  assert.match(html, new RegExp(`<html[^>]+lang="${locale}"`));
  const csp = response.headers.get('content-security-policy') ?? '';
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, 'CSP nonce');
  assert.ok(!nonces.has(nonce), 'Nonce must differ between requests');
  nonces.add(nonce);
  assert.match(csp, /'strict-dynamic'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /frame-src 'none'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.match(response.headers.get('permissions-policy') ?? '', /clipboard-write=\(self\)/);
  for (const script of html.matchAll(/<script\b([^>]*)>/g)) {
    assert.ok(script[1].includes(`nonce="${nonce}"`), 'Every script must carry the response nonce');
  }
  assetPath ??= html.match(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/)?.[1];
}
assert.ok(assetPath, 'Built static asset present');
const asset = await fetch(new URL(assetPath.replaceAll('&amp;', '&'), origin));
assert.equal(asset.status, 200, 'Built static asset served');
assert.ok((await asset.arrayBuffer()).byteLength > 0);
console.log('PASS: workerd routes EN/RU/VI, locale, per-request CSP nonce, all script nonces, security headers, static asset');
