/**
 * Free bundle delivery check (read-only).
 *
 * 1. Builds the expected ZIP for every connected Free example from the local sources,
 *    with the material page defaults (accent #EBD183, 160 ms, subtle, preserve, no context).
 * 2. Optionally opens a site in a temporary headless Chrome, presses the real download
 *    action and hashes the ZIP the page generates. Only the site origin is reachable;
 *    every other request is aborted and recorded. Downloads are denied: the bytes are
 *    read from the Blob inside the page, nothing is saved, no form is submitted.
 *
 * Usage:
 *   node scripts/verify-free-delivery.mjs --expected-only
 *   HALLMARK_PUPPETEER=<dir with puppeteer-core> node scripts/verify-free-delivery.mjs https://tallshift.com
 * TALLSHIFT_QA_OUT=<repo-relative dir> stores the JSON evidence.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { strFromU8, unzipSync } from 'fflate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const expectedOnly = args.includes('--expected-only');
const siteArg = args.find(value => !value.startsWith('--'));
const allowedSites = new Set(['https://tallshift.com', 'https://preview.tallshift.com', 'http://127.0.0.1:4173', 'http://127.0.0.1:4174']);
const site = siteArg ? new URL(siteArg).origin : null;
if (!expectedOnly) assert(site && allowedSites.has(site), `Use one of: ${[...allowedSites].join(', ')}`);
const locales = ['en', 'ru', 'vi'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const defaults = locale => ({ locale, target: 'next', accent: '#EBD183', duration: 160, motion: 'subtle', mode: 'preserve', context: '' });

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const expected = [];
try {
  const { materialRecipe } = await server.ssrLoadModule('/src/product/material-recipes.tsx');
  const { materials } = await server.ssrLoadModule('/src/product/catalog-data.ts');
  for (const material of materials.filter(item => item.available)) {
    const recipe = materialRecipe(material.id);
    assert(recipe, `${material.id}: available material has a recipe`);
    const configs = [...locales.map(defaults), { ...defaults('en'), target: 'vite' }];
    for (const config of configs) {
      const bytes = await recipe.archive(config);
      const again = await recipe.archive(config);
      assert.equal(sha256(bytes), sha256(again), `${material.id}: deterministic ZIP`);
      const entries = unzipSync(bytes);
      const manifest = JSON.parse(strFromU8(entries['manifest.json']));
      const checksums = entries['checksums.json'] ? JSON.parse(strFromU8(entries['checksums.json'])) : null;
      expected.push({
        id: material.id, slug: material.slug, locale: config.locale, target: config.target,
        zipSha256: sha256(bytes), bytes: bytes.length, files: Object.keys(entries).length,
        itemVersion: manifest.itemVersion ?? null, releaseStatus: manifest.releaseStatus ?? null,
        checksumsSha256: entries['checksums.json'] ? sha256(entries['checksums.json']) : null,
        coveredFiles: checksums ? Object.keys(checksums.files).length : null,
      });
    }
  }
} finally {
  await server.close();
}

const result = { generatedAt: new Date().toISOString(), defaults: defaults('en'), expected, site, live: [], blockedRequests: [], pageErrors: [], passed: false };
const write = () => {
  if (!process.env.TALLSHIFT_QA_OUT) return;
  const out = resolve(root, '..', process.env.TALLSHIFT_QA_OUT);
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, expectedOnly ? 'free-delivery-expected.json' : `free-delivery-${new URL(site).hostname}.json`), JSON.stringify(result, null, 2) + '\n');
};

if (expectedOnly) {
  result.passed = true;
  write();
  console.log(JSON.stringify({ passed: true, expected: expected.map(({ id, locale, target, zipSha256, releaseStatus }) => ({ id, locale, target, zipSha256, releaseStatus })) }, null, 2));
  process.exit(0);
}

const require = createRequire(resolve(process.env.HALLMARK_PUPPETEER || '.', 'free-delivery-qa.cjs'));
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--disable-background-networking', '--disable-sync', '--disable-component-update', '--no-first-run', '--no-default-browser-check'],
});
try {
  const page = await browser.newPage();
  const session = await page.createCDPSession();
  await session.send('Browser.setDownloadBehavior', { behavior: 'deny' }).catch(() => session.send('Page.setDownloadBehavior', { behavior: 'deny' }));
  page.on('pageerror', error => result.pageErrors.push(`${page.url()}: ${error.message}`));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === site || ['data:', 'blob:', 'about:'].includes(url.protocol)) void request.continue();
    else { result.blockedRequests.push(request.url()); void request.abort('blockedbyclient'); }
  });
  // Keep a reference to every generated Blob; the anchor download itself is denied.
  await page.evaluateOnNewDocument(() => {
    const original = URL.createObjectURL.bind(URL);
    globalThis.__tallshiftBlobs = [];
    URL.createObjectURL = object => { if (object instanceof Blob) globalThis.__tallshiftBlobs.push(object); return original(object); };
  });
  await page.setViewport({ width: 1440, height: 900 });
  for (const item of expected) {
    const path = `/${item.locale}/library/${item.slug}${item.target === 'vite' ? '?target=vite' : ''}`;
    await page.goto(site + path, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');
    const button = await page.waitForSelector('.tp-settings .system-download-action button:not([disabled])', { timeout: 15000 });
    await page.evaluate(() => { globalThis.__tallshiftBlobs.length = 0; });
    await button.click();
    await page.waitForFunction(() => globalThis.__tallshiftBlobs.length > 0, { timeout: 15000 });
    const live = await page.evaluate(async () => {
      const blob = globalThis.__tallshiftBlobs.at(-1);
      const buffer = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      return { type: blob.type, size: blob.size, sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''), base64: btoa(binary) };
    });
    const entries = unzipSync(Buffer.from(live.base64, 'base64'));
    const manifest = JSON.parse(strFromU8(entries['manifest.json']));
    const record = {
      id: item.id, locale: item.locale, target: item.target, url: site + path,
      liveZipSha256: live.sha256, expectedZipSha256: item.zipSha256, match: live.sha256 === item.zipSha256,
      liveBytes: live.size, expectedBytes: item.bytes, type: live.type,
      liveChecksumsSha256: entries['checksums.json'] ? sha256(entries['checksums.json']) : null,
      checksumsMatch: entries['checksums.json'] ? sha256(entries['checksums.json']) === item.checksumsSha256 : null,
      liveReleaseStatus: manifest.releaseStatus ?? null, liveItemVersion: manifest.itemVersion ?? null,
    };
    result.live.push(record);
    console.log(JSON.stringify({ id: record.id, locale: record.locale, target: record.target, match: record.match }));
  }
  result.passed = result.live.length === expected.length && result.live.every(record => record.match) && result.pageErrors.length === 0;
  console.log(JSON.stringify({ passed: result.passed, site, cases: result.live.length, mismatches: result.live.filter(record => !record.match).map(record => `${record.id}/${record.locale}/${record.target}`), blockedRequests: [...new Set(result.blockedRequests.map(url => new URL(url).origin))], pageErrors: result.pageErrors }, null, 2));
} finally {
  write();
  await browser.close();
}
if (!result.passed) process.exitCode = 1;
