/** Local-only browser QA for C001/C002 and their reusable React API. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { exampleCopy } from '../src/product/example-copy.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(process.env.HALLMARK_PUPPETEER || '.', 'starter-examples-qa.cjs'));
const puppeteer = require('puppeteer-core');
const out = resolve(root, 'docs/art-direction-2026/evidence/starter-examples-2026-11-06');
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
  for (const [id, slug] of [['C001', 'press-button'], ['C002', 'content-tabs']]) {
    for (const locale of ['ru', 'en', 'vi']) for (const width of [320, 390, 768, 1024, 1440]) {
      const frame = await open(`/${locale}/library/${slug}`, width);
      assert.equal(await page.$eval('.tp-material-heading > div > p', node => node.textContent), exampleCopy[locale][id].lead);
      assert.equal(await page.$eval('.tp-panel-explanation', node => node.textContent), exampleCopy[locale][id].demoHelp);
      if ([390, 1440].includes(width)) { await page.evaluate(() => scrollTo(0, 0)); await settle(); await page.screenshot({ path: resolve(out, `${slug}-${locale}-${width}.png`), fullPage: true }); }
      if (id === 'C001') {
        await frame.click('button:not([aria-pressed])');
        assert.equal(await frame.$eval('[role="status"] strong', node => node.textContent), '1');
        await frame.click('button[aria-pressed]:nth-child(2)');
        await frame.click('button[aria-busy="true"]');
        assert.equal(await frame.$eval('[role="status"] strong', node => node.textContent), '1');
        await frame.click('button[aria-pressed]:nth-child(3)');
        await frame.click('button[aria-disabled="true"]');
        assert.equal(await frame.$eval('[role="status"] strong', node => node.textContent), '1');
        await frame.click('a');
        assert.equal(frame.url(), 'about:srcdoc', 'Local explanation link does not navigate the preview');
      } else {
        const before = await frame.$eval('[role="tabpanel"]:not([hidden])', node => node.textContent);
        await frame.click('[role="tab"]:nth-child(2)');
        assert.notEqual(await frame.$eval('[role="tabpanel"]:not([hidden])', node => node.textContent), before);
        await page.keyboard.press('End');
        assert.equal(await frame.$eval('[role="tab"]:last-of-type', node => node.getAttribute('aria-selected')), 'true');
        await page.keyboard.press('Home');
        assert.equal(await frame.$eval('[role="tab"]:first-child', node => node.getAttribute('aria-selected')), 'true');
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
      assert.equal(await page.$eval(`${prefix} .sc-field-label`, node => node.textContent), exampleCopy[locale][id].accentLabel);
      assert.equal(await page.$eval(`${prefix} .sc-color-description`, node => node.textContent), exampleCopy[locale][id].accentHelp);
      await page.$eval(`${prefix} .sc-hex-row input`, node => node.select());
      await page.type(`${prefix} .sc-hex-row input`, '#C4DB9B');
      assert(await page.$eval(`${prefix} .system-download-action button`, node => node.disabled));
      await page.click(`${prefix} .sc-color-apply`);
      assert.equal(await page.$eval(`${prefix} .system-download-action button`, node => node.disabled), false);
      await layout('color-applied');
      await page.screenshot({ path: resolve(out, `${slug}-${locale}-${width}-settings.png`), fullPage: width !== 320 });
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { globalThis.__copied = text; } } }));
      await page.click(`${prefix} .tp-settings-content > button`);
      await page.waitForFunction(() => globalThis.__copied);
      const shared = await page.evaluate(() => globalThis.__copied);
      const url = new URL(shared);
      assert.equal(url.pathname, `/${locale}/library/${slug}`);
      assert.equal(JSON.parse(new URLSearchParams(url.hash.slice(1)).get('share')).itemId, id);
      await page.goto(shared, { waitUntil: 'load' });
      // A hash-only goto keeps the current document and its open settings sheet.
      // Reload to verify the initial configuration a recipient opens from the link.
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelector('[style*="#C4DB9B"]'));
      await page.click('.tp-workbar > button'); await page.waitForSelector('dialog[open] .tp-guide');
      await layout('guide');
      assert((await page.$eval('dialog[open]', node => node.textContent)).includes(id === 'C001' ? 'PressButton' : 'ContentTabs'));
    }
    flows.push(`${id}: RU/EN/VI, five widths, demo/code/AI request/guide, real interaction, blocked exports and item-bound shared appearance`);
  }
  await open('/ru/library/content-tabs');
  await page.evaluate(async () => { const fixture = await import('/tests/fixtures/example-contracts.tsx'); globalThis.contracts = fixture.mountContracts(); });
  await page.waitForSelector('#contract-button');
  await page.click('#contract-button');
  assert.equal(await page.$eval('#contract-count', node => node.textContent), '1');
  assert.equal(await page.$eval('#contract-button', node => getComputedStyle(node).outlineStyle), 'none');
  await page.evaluate(() => globalThis.contracts.pending(true));
  await page.waitForSelector('#contract-button[aria-busy="true"]');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'contract-button', 'Pending keeps focus');
  await page.keyboard.press('Enter'); await page.click('#contract-button');
  for (const selector of ['#contract-disabled', '#contract-disabled-link', '#contract-pending-link']) await page.click(selector);
  assert.equal(await page.$eval('#contract-count', node => node.textContent), '1');
  assert.equal(await page.$eval('#contract-disabled-link', node => node.hasAttribute('href')), false);
  assert.equal(await page.$eval('#contract-pending-link', node => node.hasAttribute('href')), false);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'solid');
  for (const size of ['sm', 'md', 'lg']) assert(await page.$eval(`.contract-size-${size}`, node => node.getBoundingClientRect().height >= 44 && node.getBoundingClientRect().width >= 44));
  assert.equal(await page.$eval('#contract-uncontrolled [aria-selected="true"]', node => node.textContent), 'Section second with a long label');
  await page.click('#contract-uncontrolled [role="tab"]:nth-child(2)');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('#contract-uncontrolled [aria-selected="true"]', node => node.textContent), 'Section third with a long label');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'tabpanel');
  await page.click('#contract-controlled [role="tab"]:nth-child(2)');
  assert.equal(await page.$eval('#contract-controlled [aria-selected="true"]', node => node.textContent), 'Section first with a long label');
  assert.deepEqual(await page.evaluate(() => globalThis.contracts.changes), ['second']);
  await page.evaluate(() => globalThis.contracts.controlled('third'));
  await page.waitForFunction(() => document.querySelector('#contract-controlled [aria-selected="true"]').textContent.includes('third'));
  await page.click('#contract-vertical [role="tab"]'); await page.keyboard.press('ArrowDown');
  assert.equal(await page.$eval('#contract-vertical [aria-selected="true"]', node => node.textContent), 'Section second with a long label');
  const identity = await page.$$eval('#example-contracts [role="tab"],#example-contracts [role="tabpanel"]', nodes => nodes.map(node => node.id));
  assert.equal(new Set(identity).size, identity.length, 'Multiple instances have unique IDs');
  assert(await page.$$eval('#example-contracts [role="tabpanel"][hidden] a', nodes => nodes.every(node => !node.getClientRects().length)));
  await page.evaluate(() => globalThis.contracts.items(['first', 'second']));
  await page.waitForFunction(() => document.querySelectorAll('#contract-controlled [role="tab"]').length === 2);
  assert.equal(await page.$eval('#contract-controlled [aria-selected="true"]', node => node.textContent), 'Section first with a long label');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  assert.equal(await page.$eval('#contract-button', node => getComputedStyle(node).transitionDuration), '0s');
  assert(await page.$$eval('#contract-controlled [aria-hidden="true"]', nodes => nodes.every(node => getComputedStyle(node).transitionDuration === '0s')));
  const colorPairs = await page.$$eval('.contract-color', nodes => nodes.map(node => ({ foreground: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor })));
  function luminance(color) { const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; }
  for (const pair of colorPairs) { const values = [luminance(pair.foreground), luminance(pair.background)].sort((a, b) => b - a); assert((values[0] + .05) / (values[1] + .05) >= 4.5, JSON.stringify(pair)); }
  assert.equal(await page.$eval('#contract-dark-tabs [aria-selected="true"]', node => getComputedStyle(node).color), await page.$eval('#contract-dark-tabs > div', node => getComputedStyle(node).color), 'Custom dark accent cannot make selected text unreadable');
  const session = await page.createCDPSession();
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  assert(await page.evaluate(() => matchMedia('(forced-colors: active)').matches));
  assert.equal(await page.$eval('#contract-controlled [aria-selected="true"]', node => getComputedStyle(node).outlineStyle), 'solid');
  assert.notEqual(await page.$eval('#contract-dark-tabs [aria-hidden="true"]', node => getComputedStyle(node).backgroundColor), 'rgb(13, 12, 9)', 'Forced colors replaces the custom indicator color');
  await session.detach();
  await page.evaluate(() => globalThis.contracts.unmount());
  flows.push('Reusable API: native button/link blocking, retained focus, pointer/keyboard rings, 44px targets, controlled/uncontrolled/vertical tabs, hidden panels, unique IDs, removed selection, StrictMode and dynamic reduced motion');
  assert.deepEqual(errors, []); assert.deepEqual(blockedRequests, []);
  passed = true;
  console.log(JSON.stringify({ passed, cases: checks.length, flows, errors, blockedRequests }, null, 2));
} finally {
  writeFileSync(resolve(out, 'checks.json'), JSON.stringify({ passed, checks, flows, errors, blockedRequests }, null, 2));
  await browser.close();
}
