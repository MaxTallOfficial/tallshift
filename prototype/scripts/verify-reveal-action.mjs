/** Local-only browser QA for E001/S003 and their reusable React API. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { exampleCopy } from '../src/product/example-copy.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(process.env.HALLMARK_PUPPETEER || '.', 'starter-examples-qa.cjs'));
const puppeteer = require('puppeteer-core');
const out = resolve(root, 'docs/art-direction-2026/evidence/reveal-action-2026-11-07');
mkdirSync(out, { recursive: true });
const origin = 'http://127.0.0.1:4173';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-background-networking', '--disable-sync', '--disable-component-update'] });
const checks = [], flows = [], errors = [], blockedRequests = [];
let passed = false;
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol)) void request.continue();
    else { blockedRequests.push(request.url()); void request.abort('blockedbyclient'); }
  });
  async function settle() { await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }); }
  async function layout(tag) {
    await settle();
    const issues = await page.evaluate(() => {
      const issues = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('Page horizontal overflow');
      for (const element of document.querySelectorAll('.tp-material-heading,.tp-workbar,.tp-settings,.tp-mobile-settings,.tp-kit-grid,.tp-settings-content,.tp-panel-explanation,dialog[open]')) {
        if (element.getClientRects().length && element.scrollWidth > element.clientWidth + 2) issues.push(`${element.className}: ${element.scrollWidth}/${element.clientWidth}`);
      }
      for (const choice of document.querySelectorAll('.tp-settings-content .system-segmented-choice')) {
        if (!choice.getClientRects().length) continue;
        const walker = document.createTreeWalker(choice, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          for (const word of node.textContent.matchAll(/\S+/gu)) {
            const range = document.createRange(); range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
            if (new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size > 1) issues.push(`Motion label splits a word: ${word[0]}`);
          }
        }
      }
      const frame = document.querySelector('iframe');
      const doc = frame?.contentDocument;
      if (doc?.querySelector('#system-preview-root') && doc.documentElement.scrollWidth > frame.clientWidth + 2) issues.push('Example horizontal overflow');
      return issues;
    });
    if (checks.length && checks.length % 30 === 0) console.log(JSON.stringify({ progress: checks.length }));
    checks.push({ url: page.url(), width: await page.evaluate(() => innerWidth), tag, issues });
    assert.deepEqual(issues, [], JSON.stringify(checks.at(-1)));
  }
  async function open(path, width = 1440) {
    await page.setViewport({ width, height: 900 });
    await page.goto(origin + path, { waitUntil: 'load' });
    await page.waitForSelector('main h1');
    await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelector('#system-preview-root')?.children.length > 0);
    await layout('page');
    return (await page.$('iframe')).contentFrame();
  }
  for (const [id, slug] of [['E001', 'content-reveal'], ['S003', 'starter-action-band']]) {
    for (const locale of ['ru', 'en', 'vi']) for (const width of [320, 390, 768, 1024, 1440]) {
      const frame = await open(`/${locale}/library/${slug}`, width);
      assert.equal(await page.$eval('.tp-material-heading > div > p', node => node.textContent), exampleCopy[locale][id].lead);
      assert.equal(await page.$eval('.tp-panel-explanation', node => node.textContent), exampleCopy[locale][id].demoHelp);
      if ([390, 1440].includes(width)) { await page.evaluate(() => scrollTo(0, 0)); await settle(); await page.screenshot({ path: resolve(out, `${slug}-${locale}-${width}.png`), fullPage: true }); }
      if (id === 'E001') {
        // Capture/layout can cause an earlier genuine intersection. Reset the once-only
        // example before observing the explicit replay, as a visitor can do.
        await page.evaluate(() => { globalThis.__previousReveal = document.querySelector('iframe').contentDocument.querySelector('[data-content-reveal]'); });
        await frame.click('button:nth-child(2)');
        await page.waitForFunction(() => { const preview = document.querySelector('iframe').contentDocument; return preview.querySelector('[data-content-reveal]') !== globalThis.__previousReveal && preview.querySelector('[role="region"]').scrollTop === 0; });
        // The preview disallows iframe scripts. Create the spy in the parent realm,
        // just like the React controller, so Chrome can call it from the real IO.
        await page.evaluate(() => {
          const preview = document.querySelector('iframe').contentWindow;
          const element = preview.document.querySelector('[data-content-reveal]');
          const animate = element.animate.bind(element);
          preview.__revealCalls = 0;
          element.animate = (...args) => { preview.__revealCalls++; return animate(...args); };
        });
        await frame.click('button');
        await page.waitForFunction(() => document.querySelector('iframe').contentWindow.__revealCalls > 0);
        assert(await frame.$eval('[data-content-reveal]', node => node.textContent.length > 100));
        if ([390, 1440].includes(width)) { await page.evaluate(() => scrollTo(0, 0)); await settle(); await page.screenshot({ path: resolve(out, `${slug}-${locale}-${width}-entered.png`), fullPage: true }); }
        await frame.click('[data-content-reveal] a');
        assert(await page.evaluate(() => {
          const frame = document.querySelector('iframe');
          const doc = frame.contentDocument;
          const target = doc.querySelector('[data-content-reveal] p[tabindex]');
          const viewport = doc.querySelector('[role="region"]');
          const rect = target.getBoundingClientRect();
          const clip = viewport.getBoundingClientRect();
          const parent = frame.getBoundingClientRect();
          return doc.activeElement === target && rect.top >= clip.top + viewport.clientTop - 1
            && rect.bottom <= clip.bottom - viewport.clientTop + 1
            && parent.top + rect.top >= -1 && parent.top + rect.bottom <= innerHeight + 1;
        }), 'The explanation link focuses its destination and scrolls it fully into view');
        await frame.click('button:nth-child(2)');
        await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('[role="region"]').scrollTop === 0);
        assert.equal(frame.url(), 'about:srcdoc');
      } else {
        const button = await frame.$('button[aria-controls]');
        const panelId = await button.evaluate(node => node.getAttribute('aria-controls'));
        assert.equal(await frame.$eval(`[id="${panelId}"]`, node => node.hidden), true);
        await button.click();
        assert.equal(await button.evaluate(node => node.getAttribute('aria-expanded')), 'true');
        assert.equal(await frame.$eval(`[id="${panelId}"]`, node => node.hidden), false);
        assert.equal(await button.evaluate(node => node.ownerDocument.activeElement === node), true);
        await button.click();
        assert.equal(await frame.$eval(`[id="${panelId}"]`, node => node.hidden), true);
      }
      await layout('interaction');
      await open(`/${locale}/library/${slug}?view=code`, width);
      assert(await page.$eval('.system-code-panel,.system-code-with-navigation', node => Boolean(node.textContent)));
      await open(`/${locale}/library/${slug}?view=prompt`, width);
      assert(await page.$eval('.pd-document', node => node.textContent.includes('SelectedExample.tsx')));
      assert.equal(await page.$$('.pd-document details .sy-integration-guide').then(nodes => nodes.length), 1, 'Readable AI request includes the correct guide');
    }
    for (const locale of ['ru', 'en', 'vi']) for (const width of [320, 1440]) {
      await open(`/${locale}/library/${slug}`, width);
      if (width === 320) { await page.click('.tp-mobile-settings > button'); await page.waitForSelector('dialog[open]'); }
      const prefix = width === 320 ? 'dialog[open]' : '.tp-settings';
      assert.equal(await page.$eval(`${prefix} .sc-number input`, node => Number(node.max)), id === 'E001' ? 600 : 480);
      if (id === 'E001') {
        assert.equal(await page.$$( `${prefix} .sc-hex-row`).then(nodes => nodes.length), 0);
        const input = `${prefix} .sc-number input`;
        await page.$eval(input, node => node.select()); await page.type(input, '601');
        assert(await page.$eval(`${prefix} .system-download-action button`, node => node.disabled));
        assert((await page.$eval(`${prefix} .tp-settings-status`, node => node.textContent)).includes('600'));
        await page.$eval(input, node => node.select()); await page.type(input, '600');
        assert.equal(await page.$eval(`${prefix} .sc-range`, node => node.value), '600');
        assert.equal(await page.$eval(`${prefix} .system-download-action button`, node => node.disabled), false);
        const help = await page.$eval(`${prefix} .sc-duration .sc-feedback > span:first-child`, node => node.textContent);
        assert(help.includes('600')); assert(!help.includes('480'));
      } else {
        assert.equal(await page.$eval(`${prefix} .sc-field-label`, node => node.textContent), exampleCopy[locale][id].accentLabel);
        assert.equal(await page.$eval(`${prefix} .sc-color-description`, node => node.textContent), exampleCopy[locale][id].accentHelp);
        await page.$eval(`${prefix} .sc-hex-row input`, node => node.select());
        await page.type(`${prefix} .sc-hex-row input`, '#C4DB9B');
        assert(await page.$eval(`${prefix} .system-download-action button`, node => node.disabled));
        await page.click(`${prefix} .sc-color-apply`);
        assert.equal(await page.$eval(`${prefix} .system-download-action button`, node => node.disabled), false);
      }
      await page.focus(`${prefix} .sc-number input`);
      await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
      await page.keyboard.press('Tab');
      assert.equal(await page.$eval(`${prefix} .sc-number input`, node => node.ownerDocument.activeElement === node), true);
      assert.equal(await page.$eval(`${prefix} .sc-number input`, node => getComputedStyle(node).outlineStyle), 'solid');
      await page.click(`${prefix} .sc-number input`);
      assert.equal(await page.$eval(`${prefix} .sc-number input`, node => getComputedStyle(node).outlineStyle), 'none');
      await layout('settings-applied');
      if (width !== 320) { await page.evaluate(() => scrollTo(0, 0)); await settle(); }
      await page.screenshot({ path: resolve(out, `${slug}-${locale}-${width}-settings.png`), fullPage: width !== 320 });
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { globalThis.__copied = text; } } }));
      await page.click(`${prefix} .tp-settings-content > button`);
      await page.waitForFunction(() => globalThis.__copied);
      const shared = await page.evaluate(() => globalThis.__copied);
      const url = new URL(shared);
      assert.equal(url.pathname, `/${locale}/library/${slug}`);
      const envelope = JSON.parse(new URLSearchParams(url.hash.slice(1)).get('share'));
      assert.equal(envelope.itemId, id);
      if (id === 'E001') { assert.equal(envelope.configProjection.duration, 600); assert.equal('accent' in envelope.configProjection, false); }
      await page.goto(shared, { waitUntil: 'load' });
      // A hash-only goto keeps the current document and its open settings sheet.
      // Reload to verify the initial configuration a recipient opens from the link.
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelector('#system-preview-root')?.children.length > 0);
      await page.click('.tp-workbar > button'); await page.waitForSelector('dialog[open] .tp-guide');
      await layout('guide');
      assert((await page.$eval('dialog[open]', node => node.textContent)).includes(id === 'E001' ? 'ContentReveal' : 'ActionBand'));
    }
    flows.push(`${id}: RU/EN/VI, five widths, demo/code/AI request/guide, real interaction, item-specific settings, blocked exports and item-bound shared appearance`);
  }
  // Existing pages retain the original duration limit and color controls.
  for (const slug of ['state-relay', 'press-button', 'content-tabs']) {
    await open(`/ru/library/${slug}`, 1440);
    assert.equal(await page.$eval('.tp-settings .sc-number input', node => node.max), '480');
    assert.equal(await page.$$('.tp-settings .sc-hex-row').then(nodes => nodes.length), 1);
  }
  await page.evaluate(async () => { const fixture = await import('/tests/fixtures/reveal-action-contracts.tsx'); globalThis.contracts = fixture.mountContracts(); });
  await page.waitForSelector('#contract-scroll-a');
  await page.evaluate(() => { const container = document.querySelector('#contract-scroll-a'); container.scrollIntoView(); container.scrollTop = 260; });
  await page.waitForFunction(() => globalThis.contracts.calls.some(call => call.instance === 'a'));
  assert.equal(await page.evaluate(() => globalThis.contracts.calls[0].duration), 600);
  await page.focus('#contract-reveal-focus-a');
  assert.equal(await page.$eval('.contract-reveal-a', node => node.getAnimations().length), 0, 'Focus cancels movement immediately');
  assert.equal(await page.$eval('.contract-reveal-a', node => getComputedStyle(node).opacity), '1');
  await page.focus('#contract-scroll-a');
  await page.evaluate(() => { document.querySelector('#contract-scroll-a').scrollTop = 0; });
  await page.waitForFunction(() => document.querySelector('.contract-reveal-a').dataset.revealState === 'settled');
  await page.evaluate(() => { document.querySelector('#contract-scroll-a').scrollTop = 260; });
  await page.waitForFunction(() => globalThis.contracts.calls.filter(call => call.instance === 'a').length >= 2);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(() => document.querySelector('.contract-reveal-a').getAnimations().length === 0);
  await page.evaluate(() => globalThis.contracts.options({ motion: 'off', duration: 600 }));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-content-reveal]')].every(node => node.dataset.revealState === 'static'));
  await page.emulateMediaFeatures([]);
  await page.evaluate(() => globalThis.contracts.options({ motion: 'expressive', duration: 600 }));
  await page.waitForFunction(() => document.querySelector('.contract-reveal-a').dataset.revealState !== 'static');
  await page.click('#contract-band-no-note button');
  assert.equal(await page.$eval('#contract-band-count', node => node.textContent), '1');
  await page.click('#contract-band-blocked button');
  assert.equal(await page.$eval('#contract-band-count', node => node.textContent), '1');
  assert.equal(await page.$eval('#contract-band-no-note section', node => node.getAttribute('aria-describedby').trim().split(/\s+/).length), 1);
  assert.equal(await page.$eval('#contract-band-link a', node => node.getAttribute('href')), '#contract-destination');
  const colorPairs = await page.$$eval('.contract-band-surface section', nodes => nodes.map(node => ({ foreground: getComputedStyle(node.querySelector('h2')).color, background: getComputedStyle(node).backgroundColor })));
  function luminance(color) { const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; }
  for (const pair of colorPairs) { const values = [luminance(pair.foreground), luminance(pair.background)].sort((a, b) => b - a); assert((values[0] + .05) / (values[1] + .05) >= 4.5, JSON.stringify(pair)); }
  await page.setViewport({ width: 320, height: 900 });
  assert(await page.$eval('#reveal-action-contracts', node => node.scrollWidth <= node.clientWidth + 1));
  await page.evaluate(() => globalThis.contracts.unmount());
  flows.push('Reusable APIs: real viewport entry, 600ms animation, immediate focus/reduce/off cancellation, re-entry, StrictMode, native action/link and blocked action, absent empty note, contrast on custom surfaces and 320px layout');
  assert.deepEqual(errors, []); assert.deepEqual(blockedRequests, []);
  passed = true;
  console.log(JSON.stringify({ passed, cases: checks.length, flows, errors, blockedRequests }, null, 2));
} finally {
  writeFileSync(resolve(out, 'checks.json'), JSON.stringify({ passed, checks, flows, errors, blockedRequests }, null, 2));
  await browser.close();
}
