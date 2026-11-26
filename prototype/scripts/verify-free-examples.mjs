/**
 * Local-only browser QA for S001, S002, A003 and A006 (stand: npm run dev, http://127.0.0.1:4173).
 *
 * Real behaviour of each demo, RU/EN/VI at 320/768/1440, keyboard focus, reduced motion,
 * forced colours, mobile settings, and one-settings consistency of demo, code, AI request,
 * guide, share link and ZIP (SHA-256 against the same recipe built in Node).
 * Temporary Chrome profile; only the local origin is reachable; downloads are denied and
 * the ZIP is read from the page Blob. Run: HALLMARK_PUPPETEER=<dir with puppeteer-core> node scripts/verify-free-examples.mjs
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { strFromU8, unzipSync } from 'fflate';

const prototype = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = resolve(prototype, '..');
const out = resolve(repository, process.env.TALLSHIFT_QA_OUT || 'docs/art-direction-2026/evidence/free-examples-final-2026-11-26');
const screens = resolve(out, 'screens');
mkdirSync(screens, { recursive: true });
const origin = 'http://127.0.0.1:4173';
const only = process.env.TALLSHIFT_QA_ONLY?.split(',');
const examples = [['S001', 'starter-split-hero'], ['S002', 'starter-feature-grid'], ['A003', 'line-assemble'], ['A006', 'ledger-reflow']].filter(([id]) => !only || only.includes(id));
const locales = ['ru', 'en', 'vi'];
const widths = [320, 768, 1440];
const custom = { accent: '#C4DB9B', motion: 'expressive', duration: 210, target: 'vite' };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// The same recipes in Node, with an isolated Vite cache so the running stand is not touched.
const cacheDir = mkdtempSync(resolve(tmpdir(), 'tallshift-free-qa-'));
const server = await createServer({ root: prototype, cacheDir, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } });
const load = path => server.ssrLoadModule(path);
const { materialRecipe } = await load('/src/product/material-recipes.tsx');
const { materials } = await load('/src/product/catalog-data.ts');
const { materialDisplayName } = await load('/src/product/material-presentation.ts');
const { exampleCopy } = await load('/src/product/example-copy.ts');
const { productCopy } = await load('/src/product/product-copy.ts');
const demoCopy = Object.fromEntries(await Promise.all(examples.map(async ([id, slug]) => [id, (await load(`/src/recipes/${slug}/copy.ts`)).copy])));

const require = createRequire(resolve(process.env.HALLMARK_PUPPETEER || '.', 'free-examples-qa.cjs'));
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-background-networking', '--disable-sync', '--disable-component-update', '--no-first-run', '--no-default-browser-check'] });
const checks = [], flows = [], errors = [], blockedRequests = [], zips = [];
let passed = false;
try {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny' }).catch(() => cdp.send('Page.setDownloadBehavior', { behavior: 'deny' }));
  page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol)) void request.continue();
    else { blockedRequests.push(request.url()); void request.abort('blockedbyclient'); }
  });
  await page.evaluateOnNewDocument(() => {
    globalThis.__blobs = []; globalThis.__copied = [];
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = object => { if (object instanceof Blob) globalThis.__blobs.push(object); return create(object); };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { globalThis.__copied.push(text); } } });
  });
  const media = (reduce = false, forced = false) => cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }, { name: 'forced-colors', value: forced ? 'active' : 'none' }] });
  const settle = () => page.evaluate(async () => { await document.fonts.ready; await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))); });
  const pause = ms => new Promise(done => setTimeout(done, ms));
  // A DevTools expression, not page eval: the callback receives the preview document.
  const inFrame = (fn, ...args) => page.evaluate(`(${fn.toString()})(document.querySelector('iframe').contentDocument, ...${JSON.stringify(args)})`);
  const frame = async () => (await page.$('iframe')).contentFrame();

  async function layout(tag) {
    await settle();
    const issues = await page.evaluate(() => {
      const issues = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('Page horizontal overflow');
      for (const element of document.querySelectorAll('.tp-material-heading,.tp-workbar,.tp-settings,.tp-mobile-settings,.tp-kit-grid,.tp-material-notes,.tp-settings-content,.tp-panel-explanation,dialog[open]')) {
        if (element.getClientRects().length && element.scrollWidth > element.clientWidth + 2) issues.push(`${element.className}: ${element.scrollWidth}/${element.clientWidth}`);
      }
      const frame = document.querySelector('iframe');
      const doc = frame?.contentDocument;
      if (doc?.querySelector('#system-preview-root') && frame.getClientRects().length) {
        if (doc.documentElement.scrollWidth > frame.clientWidth + 2) issues.push('Example horizontal overflow');
        for (const element of doc.querySelectorAll('#system-preview-root :is(a,button,h1,h2,h3,h4,p,li)')) {
          if (element.getClientRects().length && element.scrollWidth > element.clientWidth + 2) issues.push(`Clipped ${element.tagName}: ${element.textContent.slice(0, 40)}`);
        }
      }
      return issues;
    });
    checks.push({ url: page.url(), width: await page.evaluate(() => innerWidth), tag, issues });
    if (checks.length % 40 === 0) console.log(JSON.stringify({ progress: checks.length }));
    assert.deepEqual(issues, [], JSON.stringify(checks.at(-1)));
  }
  async function spy() {
    await page.evaluate(() => {
      globalThis.__animations = [];
      const proto = document.querySelector('iframe').contentWindow.Element.prototype;
      if (Object.hasOwn(proto, '__tallshiftAnimate')) return;
      const original = proto.animate;
      Object.defineProperty(proto, '__tallshiftAnimate', { value: original });
      // Created in the parent realm, like the React controller, because iframe scripts stay disabled.
      proto.animate = function (keyframes, options) { globalThis.__animations.push({ tag: this.tagName, duration: typeof options === 'number' ? options : options?.duration }); return original.call(this, keyframes, options); };
    });
  }
  const animations = () => page.evaluate(() => globalThis.__animations ?? []);
  async function open(path, width = 1440, tag = 'page') {
    await page.setViewport({ width, height: 900 });
    await page.goto(origin + path, { waitUntil: 'load' });
    await page.waitForSelector('main h1');
    await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.querySelector('#system-preview-root')?.children.length > 0);
    await spy();
    await layout(tag);
  }
  async function shot(name, fullPage = true) { await page.evaluate(() => scrollTo(0, 0)); await settle(); await page.screenshot({ path: resolve(screens, `${name}.png`), fullPage }); }
  // Page controls: centre before a real click, so the sticky site header never covers the target.
  async function press(handle) { await handle.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' })); await handle.click(); }
  async function pageTap(selector) { await press(await page.waitForSelector(selector, { visible: true })); }
  async function clickText(selector, text) {
    const handles = await page.$$(selector);
    for (const handle of handles) if ((await handle.evaluate(node => node.textContent.trim())) === text) { await press(handle); return; }
    throw new Error(`No ${selector} with text ${text}`);
  }
  async function previewButtons() { return (await frame()).$$('#system-preview-root button'); }
  // A real pointer click inside the example. Centre first: the sticky site header can cover an element at the top edge.
  // Rows that are still moving would receive the click at a stale position, so wait for running effects first.
  async function tap(handle) {
    await page.waitForFunction(() => (document.querySelector('iframe').contentDocument.getAnimations?.() ?? []).every(animation => animation.playState !== 'running'), { timeout: 3000 });
    await handle.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await handle.click();
  }
  async function restart() { await pageTap('.sv-reset'); await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('#system-preview-root')?.children.length > 0); }

  async function demoBehaviour(id, locale, width, full) {
    const t = demoCopy[id][locale];
    if (id === 'S001') {
      const links = await inFrame(doc => [...doc.querySelectorAll('#system-preview-root a')].map(link => ({ href: link.getAttribute('href'), text: link.textContent.trim(), target: Boolean(doc.getElementById(decodeURIComponent((link.getAttribute('href') || '').slice(1)))) })));
      assert.deepEqual(links.map(link => link.text), [t.primary, t.secondary]);
      assert(links.every(link => link.href.startsWith('#') && link.target), 'Both links lead to real sections of the example');
      const anchors = await (await frame()).$$('#system-preview-root a');
      for (const [index, anchor] of anchors.entries()) {
        await tap(anchor);
        const opened = await page.evaluate(() => {
          const frame = document.querySelector('iframe');
          const doc = frame.contentDocument;
          const active = doc?.activeElement;
          const rect = active?.getBoundingClientRect();
          const parent = frame.getBoundingClientRect();
          return { url: doc?.URL, root: Boolean(doc?.querySelector('#system-preview-root')), active: active?.id, visible: Boolean(rect) && parent.top + rect.top >= -1 && parent.top + rect.top < innerHeight, ring: active ? getComputedStyle(active).outlineStyle : null };
        });
        assert.equal(opened.url, 'about:srcdoc', 'The link keeps the preview document');
        assert.equal(opened.root, true);
        assert.equal(opened.active, decodeURIComponent(links[index].href.slice(1)), 'The link moves focus to its section');
        assert.equal(opened.visible, true, 'The section is scrolled into view');
        assert.equal(opened.ring, 'none', 'No focus ring after a pointer click');
      }
      assert.equal(await inFrame(doc => doc.querySelectorAll('#system-preview-root li').length), 3);
    } else if (id === 'S002') {
      const grid = await inFrame(doc => {
        const section = doc.querySelector('#system-preview-root section');
        const style = getComputedStyle(section);
        const items = [...section.querySelectorAll('li')];
        return { count: items.length, columns: new Set(items.map(item => Math.round(item.getBoundingClientRect().left))).size, content: section.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), focusable: doc.querySelectorAll('#system-preview-root :is(a,button,input,select,textarea,[tabindex])').length, texts: items.map(item => item.textContent) };
      });
      assert.equal(grid.count, 3);
      assert.equal(grid.columns, grid.content >= 640 ? 3 : 1, `Three benefits never leave an orphan (content ${grid.content}px)`);
      assert.equal(grid.focusable, 0, 'The static grid has no fake actions');
      t.features.forEach((feature, index) => assert(grid.texts[index].includes(feature.title) && grid.texts[index].includes(feature.description)));
    } else if (id === 'A003') {
      const heading = () => inFrame(doc => doc.querySelector('#system-preview-root [data-line-state]').textContent);
      assert.equal(await heading(), t.heading);
      const [replay, alternate] = await previewButtons();
      await page.evaluate(() => { globalThis.__animations = []; });
      await tap(replay);
      await page.waitForFunction(() => globalThis.__animations.length > 0, { timeout: 5000 });
      const calls = await animations();
      assert(calls.every(call => call.tag === 'SPAN' && call.duration > 0 && call.duration <= 320), JSON.stringify(calls));
      await tap(alternate);
      await page.waitForFunction(text => document.querySelector('iframe').contentDocument.querySelector('[data-line-state]').textContent === text, {}, t.second);
      await pause(400);
      assert.equal(await inFrame(doc => [...doc.querySelectorAll('[data-line-word]')].every(word => getComputedStyle(word).opacity === '1' && word.getClientRects().length)), true, 'Resting words stay visible');
      await tap(alternate);
      await page.waitForFunction(text => document.querySelector('iframe').contentDocument.querySelector('[data-line-state]').textContent === text, {}, t.heading);
    } else {
      const rows = () => inFrame(doc => [...doc.querySelectorAll('#system-preview-root li[data-reflow-key]')].map(row => ({ key: row.dataset.reflowKey, title: row.querySelector('h3').textContent, status: row.querySelector('p').textContent })));
      const status = () => inFrame(doc => doc.querySelector('#system-preview-root [role="status"]').textContent);
      const controls = async () => (await previewButtons()).slice(0, 3);
      const initial = await rows();
      assert.deepEqual(initial.map(row => row.title), t.tasks.slice(0, 4));
      assert.equal(initial.filter(row => row.status === t.done).length, 1);
      assert.equal(await status(), `${t.count} 4`);
      let [add, reverse, filter] = await controls();
      await tap(add);
      assert.equal((await rows())[0].title, `${t.task} 1`);
      assert.equal(await status(), `${t.count} 5`);
      await page.evaluate(() => { globalThis.__animations = []; });
      const before = (await rows()).map(row => row.key);
      [add, reverse, filter] = await controls();
      await tap(reverse);
      assert.deepEqual((await rows()).map(row => row.key), [...before].reverse());
      await page.waitForFunction(() => globalThis.__animations.length > 0, { timeout: 5000 });
      assert((await animations()).every(call => call.tag === 'DIV' && call.duration === 160), JSON.stringify(await animations()));
      if (!full) return;
      [add, reverse, filter] = await controls();
      await tap(filter);
      assert.equal(await filter.evaluate(node => node.getAttribute('aria-pressed')), 'true');
      assert.equal(await filter.evaluate(node => node.textContent), t.all);
      assert((await rows()).every(row => row.status === t.active));
      assert.equal(await status(), `${t.count} 4`);
      // Complete the first visible task, then remove the rest: the active filter becomes empty.
      await tap((await (await frame()).$$('#system-preview-root li[data-reflow-key] button'))[0]);
      assert.equal(await status(), `${t.count} 3`);
      while ((await rows()).length) await tap((await (await frame()).$$('#system-preview-root li[data-reflow-key] button'))[1]);
      assert.equal(await inFrame(doc => doc.querySelector('#system-preview-root ul + p')?.textContent), t.empty);
      [add, reverse, filter] = await controls();
      await tap(filter);
      const done = await rows();
      assert.equal(done.length, 2); assert(done.every(row => row.status === t.done));
      await tap((await (await frame()).$$('#system-preview-root li[data-reflow-key] button'))[0]);
      assert.equal((await rows()).filter(row => row.status === t.active).length, 1, 'Reopen returns a task to work');
      while ((await rows()).length) await tap((await (await frame()).$$('#system-preview-root li[data-reflow-key] button'))[1]);
      assert.equal(await inFrame(doc => doc.querySelector('#system-preview-root ul + p')?.textContent), t.emptyAll);
      assert.equal(await status(), `${t.count} 0`);
      [add] = await controls();
      await tap(add);
      assert.equal((await rows()).length, 1);
    }
  }

  const focusState = () => inFrame(doc => {
    const element = doc.activeElement; const style = getComputedStyle(element);
    const rings = [...doc.querySelectorAll('#system-preview-root *')].filter(node => getComputedStyle(node).outlineStyle !== 'none' && parseFloat(getComputedStyle(node).outlineWidth) > 0);
    return { tag: element.tagName, id: element.id, outline: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor, rings: rings.length };
  });
  async function keyboard(id) {
    if (id === 'S002') {
      assert.equal(await inFrame(doc => doc.querySelectorAll('#system-preview-root :is(a,button,input,select,textarea,[tabindex])').length), 0);
      return 'no focusable controls (static list)';
    }
    const result = {};
    if (id !== 'S001') {
      // A real pointer click on a control leaves no ring.
      const control = (await (await frame()).$$('#system-preview-root button'))[id === 'A006' ? 1 : 1];
      await tap(control);
      result.pointer = await focusState();
      assert.equal(result.pointer.outline, 'none', `Pointer activation leaves no focus ring: ${JSON.stringify(result.pointer)}`);
      assert.equal(result.pointer.rings, 0);
    }
    // Start from the example text, then Tab to its first control: one visible ring.
    await tap(await (await frame()).$('#system-preview-root h2'));
    await page.keyboard.press('Tab');
    result.keyboard = await focusState();
    assert(['A', 'BUTTON'].includes(result.keyboard.tag), JSON.stringify(result.keyboard));
    assert.equal(result.keyboard.outline, 'solid', JSON.stringify(result.keyboard));
    assert(result.keyboard.width >= 2 && result.keyboard.rings === 1, JSON.stringify(result.keyboard));
    if (id === 'S001') {
      // Enter on the link moves focus to its section; the keyboard ring moves with it.
      await page.keyboard.press('Enter');
      result.section = await focusState();
      assert.equal(result.section.tag, 'SECTION', JSON.stringify(result.section));
      assert.equal(result.section.outline, 'solid', JSON.stringify(result.section));
      assert.equal(result.section.rings, 1, JSON.stringify(result.section));
    }
    return result;
  }

  for (const [id, slug] of examples) {
    const material = materials.find(item => item.id === id);
    const recipe = materialRecipe(id);
    await media();
    for (const locale of locales) {
      const p = productCopy[locale], e = exampleCopy[locale][id];
      for (const width of widths) {
        await open(`/${locale}/library/${slug}`, width);
        assert.equal(await page.$eval('main h1', node => node.textContent), materialDisplayName(material, locale));
        assert.equal(await page.$eval('.tp-material-heading > div > p', node => node.textContent), e.lead);
        assert.equal(await page.$eval('.tp-panel-explanation', node => node.textContent), e.demoHelp);
        if (width !== 768 || locale === 'en') await shot(`${slug}-${locale}-${width}`);
        await demoBehaviour(id, locale, width, width === 1440);
        await layout('interaction');
        if (width === 320) {
          await pageTap('.tp-mobile-settings > button'); await page.waitForSelector('dialog[open]');
          await layout('mobile-settings');
          assert.equal(await page.$$('dialog[open] .sc-hex-row').then(nodes => nodes.length), recipe.colorControl ? 1 : 0);
          if (recipe.colorControl) {
            assert.equal(await page.$eval('dialog[open] .sc-field-label', node => node.textContent), e.accentLabel);
            assert.equal(await page.$eval('dialog[open] .sc-color-description', node => node.textContent), e.accentHelp);
          }
          assert.equal(await page.$eval('dialog[open] .sc-number input', node => Number(node.max)), 480);
          if (locale === 'en') await shot(`${slug}-${locale}-320-settings`, false);
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => !document.querySelector('dialog[open]'));
          assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.tp-mobile-settings > button')), true, 'Closing settings returns focus');
        }
      }

      // One configuration across demo, code, AI request, guide, share link and ZIP.
      await open(`/${locale}/library/${slug}`, 1440, 'settings');
      await pageTap('.tp-settings input[type="radio"][value="vite"]');
      await page.waitForFunction(() => new URLSearchParams(location.search).get('target') === 'vite');
      await page.evaluate(() => { globalThis.__animations = []; });
      if (recipe.colorControl) {
        await page.$eval('.tp-settings .sc-hex-row input', node => node.select());
        await page.type('.tp-settings .sc-hex-row input', custom.accent);
        await pageTap('.tp-settings .sc-color-apply');
      }
      await clickText('.tp-settings .system-segmented-choice', p.expressive);
      await page.$eval('.tp-settings .sc-number input', node => node.select());
      await page.type('.tp-settings .sc-number input', String(custom.duration));
      await page.waitForFunction(text => document.querySelector('.tp-settings .tp-settings-status')?.textContent === text, {}, p.applied);
      assert.equal(await page.$eval('.tp-settings .system-download-action button', node => node.disabled), false);
      if (id === 'S001') assert.equal(await inFrame(doc => getComputedStyle(doc.querySelector('#system-preview-root a')).backgroundColor), 'rgb(196, 219, 155)');
      if (id === 'S002') assert.equal(await inFrame(doc => getComputedStyle(doc.querySelector('#system-preview-root li')).borderTopColor), 'rgb(196, 219, 155)');
      // The duration field applies each valid keystroke (2, 21, 210), and S001/S002 replay their entrance on every change.
      // Wait for the final value instead of the first animation; A003/A006 are triggered only after the settings settle.
      if (id === 'A003' || id === 'A006') { await page.evaluate(() => { globalThis.__animations = []; }); await tap((await previewButtons())[id === 'A003' ? 0 : 1]); }
      await page.waitForFunction((only, duration) => only ? globalThis.__animations.length > 0 : globalThis.__animations.some(call => call.duration === duration), { timeout: 5000 }, id === 'A003', custom.duration);
      const used = (await animations()).map(call => call.duration);
      assert(id === 'A003' ? used.every(value => value > 0 && value <= custom.duration) : used.includes(custom.duration), `Demo uses the selected duration: ${used}`);
      await layout('settings-applied');
      if (locale === 'en') await shot(`${slug}-en-1440-settings`);
      await page.evaluate(() => { globalThis.__blobs.length = 0; globalThis.__copied.length = 0; });
      await pageTap('.tp-settings .system-download-action button');
      await page.waitForFunction(() => globalThis.__blobs.length > 0);
      const zipBytes = Buffer.from(await page.evaluate(async () => { const bytes = new Uint8Array(await globalThis.__blobs.at(-1).arrayBuffer()); let text = ''; for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(text); }), 'base64');
      const config = { locale, target: custom.target, accent: recipe.colorControl ? custom.accent : '#EBD183', duration: custom.duration, motion: custom.motion };
      const expected = await recipe.archive({ ...config, mode: 'preserve', context: '' });
      assert.equal(sha256(zipBytes), sha256(expected), `${id} ${locale}: page ZIP equals the recipe built from the same settings`);
      const zip = unzipSync(zipBytes);
      const text = path => strFromU8(zip[path]);
      assert.deepEqual(JSON.parse(text('config.json')), { locale, target: custom.target, ...(recipe.colorControl ? { accent: custom.accent } : {}), duration: custom.duration, motion: custom.motion });
      const manifest = JSON.parse(text('manifest.json'));
      assert.equal(manifest.itemId, id); assert.equal(manifest.target, 'vite-react-ts'); assert.deepEqual([...manifest.files].sort(), Object.keys(zip).sort());
      const sums = JSON.parse(text('checksums.json'));
      for (const [path, digest] of Object.entries(sums.files)) assert.equal(sha256(zip[path]), digest, `${path} checksum`);
      zips.push({ id, locale, settings: config, sha256: sha256(zipBytes), files: Object.keys(zip).length });
      await pageTap('#material-tab-code');
      await page.waitForSelector('#material-panel-code:not([hidden])');
      await clickText('.tp-source-toolbar button', p.copyCode);
      await page.waitForFunction(() => globalThis.__copied.length > 0);
      assert.equal(await page.evaluate(() => globalThis.__copied.at(-1)), text('SelectedExample.tsx'), 'Code view shows the ZIP source for the same settings');
      await layout('code');
      await pageTap('#material-tab-prompt');
      await page.waitForSelector('#material-panel-prompt:not([hidden])');
      await clickText('#material-panel-prompt button', p.copyPrompt);
      await page.waitForFunction(() => globalThis.__copied.length > 1);
      assert.equal(await page.evaluate(() => globalThis.__copied.at(-1)), text('INTEGRATION_PROMPT.txt'), 'Copied AI request equals the ZIP request');
      assert(await page.$eval('.pd-document', node => node.textContent.includes('SelectedExample.tsx')));
      await layout('prompt');
      if (locale === 'en') await shot(`${slug}-en-1440-prompt`, false);
      await pageTap('.tp-workbar > button'); await page.waitForSelector('dialog[open] .tp-guide');
      const guideTitle = text(`INSTALL.${locale}.md`).split('\n').find(line => line.startsWith('## '))?.slice(3).trim();
      assert(await page.$eval('dialog[open] .tp-guide', (node, title) => node.textContent.includes(title), guideTitle), `Guide shows INSTALL.${locale}.md`);
      await layout('guide');
      if (locale === 'en') await shot(`${slug}-en-1440-guide`, false);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await pageTap('#material-tab-demo');
      await pageTap('.tp-settings-content > button');
      await page.waitForFunction(() => globalThis.__copied.length > 2);
      const shared = new URL(await page.evaluate(() => globalThis.__copied.at(-1)));
      assert.equal(shared.pathname, `/${locale}/library/${slug}`);
      await page.goto(shared.href, { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('main h1');
      assert.equal(await page.$eval('.tp-settings .sc-number input', node => node.value), String(custom.duration));
      if (recipe.colorControl) assert.equal((await page.$eval('.tp-settings .sc-hex-row input', node => node.value)).toUpperCase(), custom.accent);
      flows.push(`${id} ${locale}: page ZIP ${sha256(zipBytes).slice(0, 12)} = recipe; code, AI request, guide and share link use the same settings`);

      await page.setViewport({ width: 1440, height: 900 });
      await open(`/${locale}/library/${slug}`, 1440, 'keyboard');
      flows.push(`${id} ${locale}: keyboard ${JSON.stringify(await keyboard(id))}`);
    }

    // Reduced motion: content stays, no entrance or reorder animation runs.
    await media(true);
    await open(`/en/library/${slug}`, 1440, 'reduced-motion');
    assert.equal(await page.$eval('.tp-settings fieldset.system-segmented', node => node.disabled && node.getAttribute('aria-disabled') === 'true'), true, 'Motion choice is disabled by the system setting');
    assert(await page.$eval('.tp-settings', (node, help) => node.textContent.includes(help), productCopy.en.reduced));
    await page.evaluate(() => { globalThis.__animations = []; });
    if (id === 'S001' || id === 'S002') await restart();
    if (id === 'A003') await tap((await previewButtons())[0]);
    if (id === 'A006') await tap((await previewButtons())[1]);
    await pause(500);
    assert.deepEqual(await animations(), [], 'Reduced motion starts no animation');
    assert.equal(await inFrame(doc => [...doc.querySelectorAll('#system-preview-root *')].every(node => getComputedStyle(node).opacity === '1')), true, 'Everything stays visible');
    flows.push(`${id}: reduced motion — no animate() calls, content fully visible, motion control disabled`);

    // Forced colours: system colours, one visible keyboard ring.
    await media(false, true);
    await open(`/en/library/${slug}`, 1440, 'forced-colors');
    assert(await page.evaluate(() => matchMedia('(forced-colors: active)').matches));
    await shot(`${slug}-en-1440-forced-colors`, false);
    const forced = await keyboard(id);
    const contrast = await inFrame(doc => [...doc.querySelectorAll('#system-preview-root :is(h2,h3,p,a,button)')].filter(node => node.getClientRects().length).every(node => getComputedStyle(node).color !== getComputedStyle(node).backgroundColor));
    assert.equal(contrast, true);
    flows.push(`${id}: forced colours — ${JSON.stringify(forced)}`);
    await media();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(blockedRequests, []);
  passed = true;
  console.log(JSON.stringify({ passed, cases: checks.length, zips: zips.length, flows: flows.length, errors, blockedRequests }, null, 2));
} finally {
  writeFileSync(resolve(out, 'browser-checks.json'), JSON.stringify({ generatedAt: new Date().toISOString(), passed, origin, examples: examples.map(([id]) => id), widths, locales, custom, cases: checks.length, checks, flows, zips, errors, blockedRequests }, null, 2) + '\n');
  await browser.close();
  await server.close();
  rmSync(cacheDir, { recursive: true, force: true });
}
