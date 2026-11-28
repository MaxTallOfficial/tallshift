/**
 * Read-only live QA of the isolated interactive demos on tallshift.com and preview.tallshift.com.
 * Loads pages in a throwaway Chrome profile, clicks inside the demo iframe and changes local
 * settings only; it never signs in, submits forms or calls account APIs.
 *
 *   node scripts/verify-live-demos.mjs [--env production,staging] [--locales en,ru,vi] [--widths 1440,375]
 *        [--items A001,C001] [--slow] [--out <dir>, default .qa/live-demos (git-ignored)]
 *   node scripts/verify-live-demos.mjs --env local [--main http://localhost:4174] [--demo http://127.0.0.1:4175]
 *   (build the demo with VITE_PREVIEW_PARENT_ORIGIN=http://localhost:4174 and Next with NEXT_PUBLIC_PREVIEW_ORIGIN=http://127.0.0.1:4175)
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchChrome, openPage } from './cdp-lite.mjs';

const option = (name, fallback) => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : fallback; };
const environments = {
  production: { main: 'https://tallshift.com', demo: 'https://tallshift-demo.mtalldesign.workers.dev' },
  staging: { main: 'https://preview.tallshift.com', demo: 'https://tallshift-demo-staging.mtalldesign.workers.dev' },
  // Local build of the same code (next start + scripts/serve-preview.mjs). localhost and 127.0.0.1 are different
  // sites, so the demo runs in its own process like on workers.dev and its frame can be inspected.
  local: { main: option('main', 'http://localhost:4174'), demo: option('demo', 'http://127.0.0.1:4175') },
};
const examples = { A001: 'state-relay', C001: 'press-button', C002: 'content-tabs', E001: 'content-reveal', S003: 'starter-action-band', S001: 'starter-split-hero', S002: 'starter-feature-grid', A003: 'line-assemble', A006: 'ledger-reflow' };
const colorless = new Set(['E001', 'A003', 'A006']);
// Controls (button indexes inside the demo) that start the example's own animation; used to prove motion=off reaches the demo.
const animationTriggers = { E001: [1, 0], A003: [0], A006: [0] };
const runningAnimations = `document.getAnimations().filter(a => a.playState === 'running' && !(a.effect?.target instanceof Element && a.effect.target.closest('button'))).length`;
const accent = '#A8D8FF';
const envs = option('env', 'production,staging').split(',');
const locales = option('locales', 'en,ru,vi').split(',');
const widths = option('widths', '1440,375').split(',').map(Number);
const items = option('items', Object.keys(examples).join(',')).split(',');
const slow = process.argv.includes('--slow');
const out = resolve(option('out', '.qa/live-demos'));
mkdirSync(out, { recursive: true });
const delay = ms => new Promise(done => setTimeout(done, ms));

/** Records when the false "not configured" placeholder and the iframe exist, relative to the first paint. */
const timelineScript = `(() => { const t = window.__qa = { events: [] }; const mark = n => t.events.push([n, Math.round(performance.now())]);
  let had = false, frame = false;
  new MutationObserver(() => { const p = !!document.querySelector('.rp-unavailable'); if (p && !had) { had = true; mark('placeholder-in'); } if (!p && had) { had = false; mark('placeholder-out'); }
    const f = !!document.querySelector('.rp-preview iframe'); if (f && !frame) { frame = true; mark('iframe-in'); } }).observe(document, { subtree: true, childList: true });
  document.addEventListener('securitypolicyviolation', e => t.events.push(['csp', e.violatedDirective, e.blockedURI]));
  new PerformanceObserver(list => { for (const entry of list.getEntries()) mark(entry.name); }).observe({ type: 'paint', buffered: true }); })();`;

/** How long a visitor could see the placeholder after the first contentful paint. */
function placeholderExposure(events) {
  const paint = events.find(([name]) => name === 'first-contentful-paint')?.[1];
  if (paint === undefined) return null;
  let total = 0, since = null;
  for (const [name, time] of events) {
    if (name === 'placeholder-in') since = time;
    if (name === 'placeholder-out' && since !== null) { total += Math.max(0, time - Math.max(since, paint)); since = null; }
  }
  if (since !== null) total = Infinity;
  return total;
}

const fingerprint = `(() => { const root = document.getElementById('root'); return JSON.stringify({
  text: root.innerText,
  attrs: [...root.querySelectorAll('[aria-pressed],[aria-selected],[aria-expanded],[aria-checked],[data-state],[hidden],[data-reflow-key]')].map(e => [e.getAttribute('aria-pressed'), e.getAttribute('aria-selected'), e.getAttribute('aria-expanded'), e.getAttribute('aria-checked'), e.getAttribute('data-state'), e.hidden, e.getAttribute('data-reflow-key')]),
  scroll: [...root.querySelectorAll('*')].filter(e => e.scrollTop > 0).map(e => Math.round(e.scrollTop)),
  hash: location.hash.replace(/channel=[^&]*/, '') }); })()`;

/** Words of controls and headings inside the demo that break across lines (e.g. a label squeezed into an icon column). */
const wordSplits = `(() => { const found = [];
  for (const element of document.querySelectorAll('#root button, #root a, #root [role=tab], #root label, #root h1, #root h2, #root h3')) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { const node = walker.currentNode; if (!node.parentElement?.getClientRects().length) continue;
      for (const word of node.textContent.matchAll(/[^\\s\\u2013\\u2014\\/-]+/gu)) { if ([...word[0]].length > 24) continue;
        const range = document.createRange(); range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
        const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
        if (lines > 1) found.push({ word: word[0], lines, in: element.tagName.toLowerCase() }); } } }
  return found.slice(0, 20); })()`;

const candidates = `(() => { const seen = new Set(); const list = [];
  const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  for (const selector of ['[role=tab][aria-selected=false]', 'button:not([disabled])', 'a[href^="#"]', 'input[type=radio]:not(:checked)', 'summary'])
    for (const e of document.querySelectorAll('#root ' + selector)) if (!seen.has(e) && visible(e)) { seen.add(e); list.push(e); }
  window.__qaCandidates = list.slice(0, 8);
  return window.__qaCandidates.map(e => (e.getAttribute('aria-label') || e.innerText || e.value || e.tagName).trim().slice(0, 60)); })()`;

/** Scrolls an element of the main document into view without smooth scrolling, then clicks its centre. */
async function clickMain(page, expression, mobile) {
  const ok = await page.evaluate(`(() => { const e = ${expression}; if (!e) return false; e.scrollIntoView({ block: 'center', behavior: 'instant' }); window.__qaTarget = e; return true; })()`);
  if (!ok) return false;
  await delay(250);
  const box = await page.evaluate(`(() => { const r = window.__qaTarget.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: window.__qaTarget.innerText?.trim() ?? '' }; })()`);
  if (mobile) await page.tap(box.x, box.y); else await page.click(box.x, box.y);
  return box;
}

async function clickInFrame(page, frame, index, mobile) {
  const box = await page.evaluate(`(() => { const e = window.__qaCandidates[${index}]; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`, frame);
  await page.evaluate(`(() => { const f = document.querySelector('.rp-preview iframe'); const r = f.getBoundingClientRect(); window.scrollBy({ top: r.top + ${box.y} - innerHeight / 2, behavior: 'instant' }); })()`);
  await delay(250);
  const frameBox = await page.evaluate(`(() => { const n = document.querySelector('.rp-preview iframe').getBoundingClientRect(); return { x: n.left, y: n.top }; })()`);
  const x = frameBox.x + box.x, y = frameBox.y + box.y;
  if (mobile) await page.tap(x, y); else await page.click(x, y);
}

/** Starts the demo's own animation with real clicks and counts running non-button animations shortly after. */
async function animationProbe(page, frame, item, mobile) {
  const steps = animationTriggers[item];
  if (!steps) return null;
  let peak = 0;
  for (const [position, index] of steps.entries()) {
    await page.evaluate(`(window.__qaCandidates = [...document.querySelectorAll('#root button:not([disabled])')], true)`, frame);
    await clickInFrame(page, frame, index, mobile);
    if (position < steps.length - 1) { await delay(400); continue; }
    for (let sample = 0; sample < 4; sample++) { await delay(40); peak = Math.max(peak, await page.evaluate(runningAnimations, frame)); }
  }
  await delay(900);
  return peak;
}

async function previewReady(page, timeout = 20000) {
  return page.waitFor(`(() => { const s = document.querySelector('.rp-preview > p[role=status]'); return s && document.querySelector('.rp-preview iframe') && s.textContent === '' ? true : null; })()`, { timeout });
}

/** On narrow screens the settings live in a modal sheet; it must be closed before clicking inside the demo. */
async function closeSettings(page, mobile) {
  if (!mobile) return;
  await page.key('Escape', 'Escape', 27);
  await page.waitFor(`document.querySelector('dialog[open]') ? null : true`, { timeout: 3000 });
}

async function settingsRoot(page, mobile) {
  if (!mobile) return '.tp-settings .tp-settings-content';
  const opened = await clickMain(page, `document.querySelector('.tp-mobile-settings button[aria-haspopup=dialog]')`, mobile);
  if (!opened) return null;
  return (await page.waitFor(`document.querySelector('dialog[open] .tp-settings-content') ? true : null`, { timeout: 5000 })) ? 'dialog[open] .tp-settings-content' : null;
}

async function evidence(page, frame) {
  return page.evaluate(`(() => { const html = document.documentElement.outerHTML;
    return { lang: document.documentElement.lang, accent: html.toLowerCase().includes('${accent.toLowerCase()}'),
      motion: [...new Set([...document.querySelectorAll('[data-motion]')].map(e => e.getAttribute('data-motion')))],
      motionVars: [...new Set((html.match(/--[\\w-]*(?:duration|motion|ms)[\\w-]*:\\s*[^;"]+/g) || []))].slice(0, 6) }; })()`, frame);
}

async function checkPage(browser, env, locale, width, item, kind) {
  const config = environments[env];
  const path = kind === 'home' ? `/${locale}` : `/${locale}/library/${examples[item]}`;
  const result = { env, locale, width, item, kind, url: config.main + path, failures: [], notes: [] };
  const events = [];
  const page = await openPage(browser, { onEvent: event => events.push(event) });
  const mobile = width < 768;
  try {
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: timelineScript });
    await page.viewport(width);
    if (slow) { await page.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 }); await page.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
    const started = Date.now();
    await page.goto(result.url);
    const ready = await previewReady(page, slow ? 45000 : 20000);
    result.readyMs = ready ? Date.now() - started : null;
    if (!ready) result.failures.push('preview did not reach the applied state');
    const shell = await page.evaluate(`({ placeholder: document.querySelector('.rp-unavailable')?.textContent ?? null, status: document.querySelector('.rp-preview > p[role=status]')?.textContent ?? null,
      iframe: (f => f && { src: f.src.replace(/#channel=.*/, '#channel=…'), height: Math.round(f.getBoundingClientRect().height), width: Math.round(f.getBoundingClientRect().width), sandbox: f.getAttribute('sandbox') })(document.querySelector('.rp-preview iframe')),
      overflow: document.documentElement.scrollWidth > innerWidth + 1, timeline: window.__qa?.events ?? [] })`);
    Object.assign(result, { placeholderAfterLoad: shell.placeholder, status: shell.status, iframe: shell.iframe, pageOverflow: shell.overflow, timeline: shell.timeline, placeholderVisibleMs: placeholderExposure(shell.timeline) });
    if (shell.placeholder) result.failures.push(`placeholder still shown: ${shell.placeholder}`);
    if (shell.overflow) result.failures.push('page horizontal overflow');
    if (shell.iframe && !shell.iframe.src.startsWith(`${config.demo}/?item=${item}`)) result.failures.push(`unexpected iframe src ${shell.iframe.src}`);
    const frame = ready ? await page.waitForFrame(config.demo, 10000) : null;
    if (ready && !frame) result.failures.push('demo iframe target not found');
    if (frame) {
      const inside = await page.waitFor(`(() => { const r = document.getElementById('root'); const t = r?.innerText ?? ''; return t.length > 20 && !t.includes('Loading preview') ? { lang: document.documentElement.lang, length: t.length, failed: t.includes('Preview unavailable'), overflow: document.documentElement.scrollWidth > innerWidth + 1, height: Math.ceil(r.getBoundingClientRect().height) } : null; })()`, { session: frame, timeout: 10000 });
      result.frame = inside;
      if (!inside) result.failures.push('demo content did not render');
      else {
        if (inside.lang !== locale) result.failures.push(`demo language ${inside.lang} instead of ${locale}`);
        if (inside.failed) result.failures.push('demo error boundary shown');
        if (inside.overflow) result.failures.push('demo horizontal overflow inside iframe');
        // Before any scrolling: on phones the demo starts below the fold, where Chrome pauses rendering of
        // cross-origin iframes. A height that only arrives once the demo is on screen moves the page under the visitor.
        await delay(300);
        const atLoad = await page.evaluate(`(f => { const r = f.getBoundingClientRect(); return { iframe: Math.round(r.height), onScreen: r.top < innerHeight && r.bottom > 0 }; })(document.querySelector('.rp-preview iframe'))`);
        const content = await page.evaluate(`Math.ceil(document.getElementById('root').getBoundingClientRect().height)`, frame);
        result.heightBeforeScroll = { ...atLoad, content };
        if (Math.abs(atLoad.iframe - Math.max(120, content)) > 4) result.failures.push(`demo height not applied before scrolling: iframe ${atLoad.iframe} px, content ${content} px${atLoad.onScreen ? '' : ' (demo off screen; the page jumps when the visitor reaches it)'}`);
      }
      const splits = inside ? await page.evaluate(wordSplits, frame) : [];
      result.splitWords = splits;
      if (splits.length) result.failures.push(`words broken across lines in the demo: ${splits.slice(0, 5).map(split => `${split.word} (${split.lines} lines, ${split.in})`).join(', ')}`);
      // Interaction: the first control whose activation visibly changes the example.
      const labels = await page.evaluate(candidates, frame);
      result.controls = labels;
      if (!labels.length) result.interaction = { status: 'no-controls' };
      for (let index = 0; index < labels.length && !result.interaction; index++) {
        const before = await page.evaluate(fingerprint, frame);
        await clickInFrame(page, frame, index, mobile);
        await delay(900);
        const after = await page.evaluate(fingerprint, frame);
        if (after !== before) result.interaction = { status: 'changed', control: labels[index] };
      }
      if (!result.interaction) { result.interaction = { status: 'no-visible-change', tried: labels }; result.failures.push('no control changed the example'); }
      // Chrome throttles animation frames in off-screen cross-origin iframes; measure again once the demo is on screen.
      await page.evaluate(`(document.querySelector('.rp-preview iframe').scrollIntoView({ block: 'start', behavior: 'instant' }), true)`);
      await delay(800);
      const visibleHeight = await page.evaluate(`Math.round(document.querySelector('.rp-preview iframe').getBoundingClientRect().height)`);
      const contentHeight = await page.evaluate(`Math.ceil(document.getElementById('root').getBoundingClientRect().height)`, frame);
      result.heightOnScreen = { iframe: visibleHeight, content: contentHeight };
      if (Math.abs(visibleHeight - Math.max(120, contentHeight)) > 4) result.failures.push(`iframe height ${visibleHeight} does not follow demo content ${contentHeight} on screen`);
      // Settings: accent and motion are sent through the bridge and must reach the iframe.
      if (kind === 'library') {
        const root = await settingsRoot(page, mobile);
        if (!root) result.failures.push('settings panel not reachable');
        else {
          const before = await evidence(page, frame);
          result.settings = { before };
          if (!colorless.has(item)) {
            const focused = await page.evaluate(`(() => { const i = document.querySelector('${root} .sc-hex-row input'); if (!i) return false; i.focus(); i.select(); return true; })()`);
            if (!focused) result.failures.push('accent field missing');
            else {
              await page.type(accent); await page.key('Enter', 'Enter', 13);
              await delay(300);
              const applied = await previewReady(page, 8000);
              const after = await evidence(page, frame);
              result.settings.accent = { applied: Boolean(applied), found: after.accent, blocked: await page.evaluate(`document.querySelector('${root} .tp-settings-status')?.dataset.blocked ?? null`) };
              if (!after.accent) result.failures.push('accent change did not reach the demo');
            }
          }
          let animatedBefore = null;
          if (animationTriggers[item]) { await closeSettings(page, mobile); animatedBefore = await animationProbe(page, frame, item, mobile); if (mobile) await settingsRoot(page, mobile); }
          const off = await clickMain(page, `[...document.querySelectorAll('${root} fieldset.system-segmented label.system-segmented-option')].at(-1)`, mobile);
          if (!off) result.failures.push('motion control missing');
          else {
            await delay(300);
            const applied = await previewReady(page, 8000);
            const after = await evidence(page, frame);
            const checked = await page.evaluate(`[...document.querySelectorAll('${root} fieldset.system-segmented input')].findIndex(i => i.checked)`);
            let animatedAfter = null;
            if (animationTriggers[item]) { await closeSettings(page, mobile); animatedAfter = await animationProbe(page, frame, item, mobile); }
            result.settings.motion = { label: off.text, checkedIndex: checked, applied: Boolean(applied), before: { motion: before.motion, vars: before.motionVars }, after: { motion: after.motion, vars: after.motionVars }, ...(animatedBefore === null ? {} : { runningAnimations: { subtle: animatedBefore, off: animatedAfter } }) };
            if (animatedBefore !== null && animatedAfter > 0) result.failures.push(`animations still run with motion off (${animatedAfter})`);
            if (animatedBefore === 0) result.notes.push('animation probe saw no running animation with the default motion');
            if (checked !== 2) result.failures.push('motion option did not switch to off');
            if (!applied) result.failures.push('motion change was not acknowledged by the demo');
            if (JSON.stringify([before.motion, before.motionVars]) === JSON.stringify([after.motion, after.motionVars]) && animatedBefore === null) result.notes.push('motion change has no DOM marker; acknowledged through the bridge only');
          }
          if (mobile && !animationTriggers[item]) await closeSettings(page, mobile);
        }
      }
      // Toolbar: width switch and reload on the home page and one library page.
      if (kind === 'home' || item === 'C001') {
        await clickMain(page, `document.querySelectorAll('.rp-toolbar label.system-segmented-option')[2]`, mobile);
        await delay(400);
        const max = await page.evaluate(`(document.querySelector('.rp-stage') ?? document.querySelector('.rp-preview iframe'))?.style.maxWidth ?? null`);
        await page.evaluate(`(window.__qaOldFrame = document.querySelector('.rp-preview iframe'), true)`);
        await clickMain(page, `document.querySelector('.rp-toolbar button')`, mobile);
        await delay(300);
        const reloaded = await page.waitFor(`(() => { const f = document.querySelector('.rp-preview iframe'); const s = document.querySelector('.rp-preview > p[role=status]'); return f && f !== window.__qaOldFrame && s.textContent === '' ? true : null; })()`, { timeout: 15000 });
        result.toolbar = { narrowMaxWidth: max, reloaded: Boolean(reloaded) };
        if (max !== '320px') result.failures.push('width switch did not narrow the preview');
        if (!reloaded) result.failures.push('reload did not bring the preview back');
      }
    }
    await delay(500);
    const late = await page.evaluate(`window.__qa?.events.filter(e => e[0] === 'csp') ?? []`).catch(() => []);
    const hosts = new Set([new URL(config.main).host, new URL(config.demo).host]);
    // For server errors keep Cloudflare's error code (e.g. 1102 CPU limit, 1027 daily limit) and the ray id.
    for (const event of events) if (event.kind === 'http-error' && event.status >= 500 && event.requestId) {
      const body = await browser.send('Network.getResponseBody', { requestId: event.requestId }, event.session).catch(() => null);
      const text = body ? (body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body) : '';
      event.text = [text.match(/Error code:?\s*(\d{3,4})|Error (\d{4})/)?.slice(1).find(Boolean) && `Cloudflare error ${text.match(/Error code:?\s*(\d{3,4})|Error (\d{4})/).slice(1).find(Boolean)}`, text.match(/<title>([^<]{0,120})/)?.[1], !text.startsWith('<') && text.slice(0, 120), event.ray && `ray ${event.ray}`].filter(Boolean).join(' · ') || undefined;
      if (event.text) event.text = `${event.status} ${event.text}`;
    }
    for (const event of events) if (event.kind === 'issue' && event.node) {
      const described = await browser.send('DOM.describeNode', { backendNodeId: event.node }, event.session).catch(() => null);
      if (described) event.nodeDescription = `${described.node.localName} ${JSON.stringify(described.node.attributes ?? [])}`.slice(0, 200);
    }
    result.problems = events.filter(event => event.kind !== 'request').map(({ kind, frame, level, text, code, details, status, url, source, blocked, corsError, nodeDescription }) => ({ kind, frame, level, source, text, code, details, status, url, blocked, corsError, nodeDescription }));
    const requested = [...new Set(events.filter(event => event.kind === 'request').map(event => event.url))];
    result.analytics = requested.filter(url => /cloudflareinsights\.com|\/cdn-cgi\/rum/.test(url)).map(url => url.replace(/\?.*/, ''));
    result.foreignRequests = requested.filter(url => { try { const u = new URL(url); return ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) && !hosts.has(u.host) && u.host !== 'static.cloudflareinsights.com'; } catch { return false; } });
    result.cspViolations = late;
    if (late.length) result.failures.push(`CSP violation: ${JSON.stringify(late)}`);
    const minorIssue = problem => problem.kind === 'issue' && problem.code === 'GenericIssue' && /FormEmptyIdAndName|FormLabelForNameError|FormAutocomplete/.test(problem.details ?? '');
    // Staging and local runs have no auth secrets: the session probe answers 503 AUTH_UNAVAILABLE by design (not a demo defect).
    const stagingAuth = problem => env !== 'production' && (problem.url ?? '').endsWith('/api/auth/get-session') && (problem.status === 503 || /status of 503/.test(problem.text ?? ''));
    for (const problem of result.problems) if (stagingAuth(problem)) { if (!result.notes.includes(`${env} auth disabled: /api/auth/get-session 503 logged in console`)) result.notes.push(`${env} auth disabled: /api/auth/get-session 503 logged in console`); }
    else if (minorIssue(problem)) result.notes.push(`${problem.frame} DevTools issue: ${problem.details.match(/"errorType":"(\w+)"/)?.[1]} on ${problem.nodeDescription ?? 'unknown node'}`);
    else if (['exception', 'issue', 'network-failed', 'http-error'].includes(problem.kind) || problem.level === 'error') result.failures.push(`${problem.frame} ${problem.kind}: ${problem.text ?? problem.code ?? problem.status} ${problem.url ?? problem.details ?? ''}`.trim());
    if (result.foreignRequests.length) result.failures.push(`requests to other hosts: ${result.foreignRequests.join(', ')}`);
  } catch (error) {
    result.failures.push(`script error: ${error.message}`);
  } finally { await page.close(); }
  return result;
}

const runId = `${envs.join('-')}${slow ? '-slow' : ''}`;
const lines = resolve(out, `live-demos-${runId}.jsonl`);
writeFileSync(lines, '');
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`page check exceeded ${ms / 1000} s`)), ms))]);
let browser = await launchChrome();
const results = [];
try {
  for (const env of envs) for (const width of widths) for (const locale of locales) {
    const pages = [['home', 'A001'], ...items.map(item => ['library', item])];
    for (const [kind, item] of pages) {
      if (kind === 'home' && !items.includes('A001') && process.argv.includes('--items')) continue;
      let result;
      // A hung headless Chrome is a harness fault, not a site verdict: restart it and repeat the page once.
      for (let attempt = 1; attempt <= 2 && !result; attempt++) {
        try { result = await withTimeout(checkPage(browser, env, locale, width, item, kind), slow ? 240000 : 120000); result.attempt = attempt; }
        catch (error) {
          console.log(`harness ${env} ${width} ${locale} ${item}: ${error.message}; restarting Chrome`);
          await browser.close().catch(() => undefined);
          browser = await launchChrome();
          if (attempt === 2) result = { env, locale, width, item, kind, attempt, failures: [`harness error twice: ${error.message}`], notes: [] };
        }
      }
      if (result.failures.some(failure => /script error: .*timeout/.test(failure)) && result.attempt === 1) {
        console.log(`retry ${env} ${width} ${locale} ${item} after CDP timeout`);
        await browser.close().catch(() => undefined);
        browser = await launchChrome();
        const retry = await withTimeout(checkPage(browser, env, locale, width, item, kind), slow ? 240000 : 120000).catch(error => ({ env, locale, width, item, kind, failures: [`harness error: ${error.message}`], notes: [] }));
        retry.attempt = 2; retry.firstAttemptFailures = result.failures; result = retry;
      }
      results.push(result);
      appendFileSync(lines, JSON.stringify(result) + '\n');
      console.log(`${result.failures.length ? 'FAIL' : 'pass'} ${env} ${width} ${locale} ${kind === 'home' ? 'home(A001)' : item} ready=${result.readyMs ?? '—'}ms placeholderVisible=${result.placeholderVisibleMs ?? '—'}ms interaction=${result.interaction?.status ?? '—'}${result.interaction?.control ? `(${result.interaction.control})` : ''}${result.attempt > 1 ? ' attempt=2' : ''}${result.failures.length ? ` :: ${result.failures.join(' | ')}` : ''}`);
    }
  }
} finally { await browser.close(); }
const summary = { checkedAt: new Date().toISOString(), slow, total: results.length, failed: results.filter(r => r.failures.length).length, results };
const file = resolve(out, `live-demos-${runId}.json`);
writeFileSync(file, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ total: summary.total, failed: summary.failed, file }));
