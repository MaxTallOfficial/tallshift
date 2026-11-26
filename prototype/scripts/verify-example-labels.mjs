/**
 * Button labels and headings of every ready example (criteria v2, section 7 B):
 * no word split across lines (no syllable breaks) and at most two lines, at page widths
 * 320–1440 and at the 640/320 preview width toggles.
 *
 * Measurement reused from the A001 label QA (BETA-19, 26.11.2026): every word of the label is a
 * DOM Range and its client rects must stay on one line; lines are the distinct rows of all words.
 * Controls: button, [role=button], [role=tab] and links that are not inline text. Headings: h1–h6.
 * Hidden-but-laid-out text (stacked state labels) is measured too; display:none text is not.
 * Toggles (aria-pressed / aria-expanded) inside the demo are pressed once each to reach other labels.
 *
 * Scope decision of Max Tall, 27.11.2026 (option «а»): the two-line limit applies to control labels and
 * interface headings. Large display headings of the demo content (computed font-size ≥ 24px: hero, grid
 * and call-to-action titles whose text the integrator replaces) are checked only for syllable splits;
 * their line counts are still measured and reported, never hidden.
 *
 * Local stand only: npm run dev (http://127.0.0.1:4173). Temporary Chrome profile, only the stand
 * is reachable. Results: prototype/.qa/example-labels/labels.json (gitignored). Exit 1 on any failure.
 * Run: HALLMARK_PUPPETEER=<dir with puppeteer-core> node scripts/verify-example-labels.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const prototype = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(prototype, process.env.TALLSHIFT_QA_OUT || '.qa/example-labels');
mkdirSync(out, { recursive: true });
const origin = 'http://127.0.0.1:4173';
const locales = ['ru', 'en', 'vi'];
const pageWidths = [320, 375, 768, 1024, 1440];
const previewWidths = ['tablet', 'mobile'];

const cacheDir = mkdtempSync(resolve(tmpdir(), 'tallshift-label-qa-'));
const server = await createServer({ root: prototype, cacheDir, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } });
let ready;
try {
  const { materials } = await server.ssrLoadModule('/src/product/catalog-data.ts');
  ready = materials.filter(item => item.available).map(item => ({ id: item.id, slug: item.slug }));
} finally {
  await server.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
const only = process.env.TALLSHIFT_QA_ONLY?.split(',');
const examples = ready.filter(item => !only || only.includes(item.id));

/** Runs in the page: measures the preview document. */
function measure() {
  const doc = document.querySelector('iframe').contentDocument;
  const root = doc.querySelector('#system-preview-root');
  const rows = rects => {
    const centers = rects.map(rect => ({ center: (rect.top + rect.bottom) / 2, height: rect.height })).sort((a, b) => a.center - b.center);
    const lines = [];
    for (const item of centers) {
      const last = lines.at(-1);
      if (last && Math.abs(item.center - last.center) < Math.max(4, Math.min(item.height, last.height) / 2)) continue;
      lines.push(item);
    }
    return lines.length;
  };
  const items = [];
  for (const element of root.querySelectorAll('button, a, [role="button"], [role="tab"], h1, h2, h3, h4, h5, h6')) {
    if (!element.getClientRects().length) continue;
    const heading = /^H[1-6]$/.test(element.tagName);
    const style = getComputedStyle(element);
    if (element.tagName === 'A' && style.display === 'inline') continue;
    const words = [], broken = [];
    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || !parent.getClientRects().length) continue;
      for (const match of node.textContent.matchAll(/\S+/gu)) {
        const range = doc.createRange();
        range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
        const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
        if (!rects.length) continue;
        if (rows(rects) > 1) broken.push(match[0]);
        words.push(...rects);
      }
    }
    if (!words.length) continue;
    items.push({ kind: heading ? (parseFloat(style.fontSize) >= 24 ? 'display' : 'heading') : 'control', tag: element.tagName.toLowerCase(), role: element.getAttribute('role'), text: element.textContent.replace(/\s+/g, ' ').trim().slice(0, 80), lines: rows(words), broken, fontSize: parseFloat(style.fontSize) });
  }
  return { demoWidth: doc.documentElement.clientWidth, items };
}

const require = createRequire(resolve(process.env.HALLMARK_PUPPETEER || '.', 'example-labels-qa.cjs'));
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-background-networking', '--disable-sync', '--disable-component-update', '--no-first-run', '--no-default-browser-check'] });
const results = [], errors = [], blockedRequests = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol)) void request.continue();
    else { blockedRequests.push(request.url()); void request.abort('blockedbyclient'); }
  });
  const settle = () => page.evaluate(async () => { await document.fonts.ready; const doc = document.querySelector('iframe').contentDocument; await doc.fonts?.ready; await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))); });
  const pause = ms => new Promise(done => setTimeout(done, ms));
  async function record(example, locale, pageWidth, preview, state) {
    await settle();
    const measured = await page.evaluate(measure);
    for (const item of measured.items) {
      const failures = [];
      if (item.broken.length) failures.push(`word split across lines: ${item.broken.join(' | ')}`);
      // Max Tall, 27.11.2026, option «а»: display headings (≥ 24px) keep only the syllable-split rule.
      if (item.lines > 2 && item.kind !== 'display') failures.push(`${item.lines} lines`);
      results.push({ id: example.id, locale, pageWidth, preview, demoWidth: measured.demoWidth, state, ...item, ok: failures.length === 0, failures });
    }
  }
  for (const example of examples) for (const locale of locales) for (const pageWidth of pageWidths) {
    await page.setViewport({ width: pageWidth, height: 900 });
    await page.goto(`${origin}/${locale}/library/${example.slug}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelector('#system-preview-root')?.children.length > 0);
    await pause(250);
    await record(example, locale, pageWidth, 'full', 'default');
    // Toggles and radio choices show other labels (states, filters, expanded steps, error mode). Press each once, in order.
    for (const selector of ['#system-preview-root :is(button, a)[aria-pressed], #system-preview-root :is(button, a)[aria-expanded]', '#system-preview-root input[type="radio"]']) {
      const count = await page.evaluate(query => document.querySelector('iframe').contentDocument.querySelectorAll(query).length, selector);
      for (let index = 0; index < count; index++) {
        await page.evaluate((query, position) => {
          const toggle = document.querySelector('iframe').contentDocument.querySelectorAll(query)[position];
          toggle?.scrollIntoView({ block: 'center', behavior: 'instant' });
          toggle?.click();
        }, selector, index);
        await pause(200);
        await record(example, locale, pageWidth, 'full', `${selector.includes('radio') ? 'choice' : 'toggle'} ${index + 1}`);
      }
    }
    if (pageWidth === 1440) for (const preview of previewWidths) {
      await page.evaluate(value => { const input = document.querySelector(`.sv-toolbar input[type="radio"][value="${value}"]`); input?.click(); }, preview);
      await pause(300);
      await record(example, locale, pageWidth, preview, 'default');
    }
  }
} finally {
  await browser.close();
}
const failures = results.filter(item => !item.ok);
const summary = {
  passed: failures.length === 0 && errors.length === 0 && blockedRequests.length === 0,
  examples: examples.map(example => example.id), locales, pageWidths, previewWidths,
  measured: results.length,
  failedCases: failures.length,
  displayHeadingsOverTwoLines: results.filter(item => item.kind === 'display' && item.lines > 2).length,
  byExample: Object.fromEntries(examples.map(example => [example.id, { measured: results.filter(item => item.id === example.id).length, failed: failures.filter(item => item.id === example.id).length }])),
  errors, blockedRequests,
};
writeFileSync(resolve(out, 'labels.json'), JSON.stringify({ generatedAt: new Date().toISOString(), origin, ...summary, failures, results }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
const distinct = [...new Map(failures.map(item => [`${item.id}|${item.locale}|${item.kind}|${item.text}|${item.failures.join(';')}`, item])).values()];
for (const item of distinct) console.log(`FAIL ${item.id} ${item.locale} ${item.kind} “${item.text}” — ${item.failures.join('; ')} (e.g. page ${item.pageWidth}, demo ${item.demoWidth}px, ${item.preview}, ${item.state})`);
if (!summary.passed) process.exitCode = 1;
