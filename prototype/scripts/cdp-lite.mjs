/**
 * Minimal Chrome DevTools Protocol driver for live QA without extra packages.
 * Starts the installed Chrome with a throwaway profile, never the user's browser profile.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function launchChrome({ headless = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'tallshift-live-qa-'));
  const args = [
    `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-sync', '--disable-component-update', '--disable-extensions',
    '--disable-default-apps', '--metrics-recording-only', '--password-store=basic', '--use-mock-keychain',
    ...(headless ? ['--headless=new'] : []), 'about:blank',
  ];
  const child = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not expose DevTools in 20 s')), 20000);
    child.stderr.on('data', chunk => {
      buffer += chunk;
      const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited early with ${code}`)); });
  });
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const browser = new CdpConnection(socket);
  browser.close = async () => {
    try { await browser.send('Browser.close'); } catch { /* already closed */ }
    socket.close();
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
    rmSync(profile, { recursive: true, force: true });
  };
  return browser;
}

class CdpConnection {
  constructor(socket) {
    this.socket = socket; this.id = 0; this.pending = new Map(); this.listeners = new Set();
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject, method } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${method}: ${message.error.message}`)); else resolve(message.result);
      } else if (message.method) for (const listener of this.listeners) listener(message);
    };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`${method}: timeout`)); } }, 30000);
    });
  }
  on(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
}

/** A page plus every out-of-process iframe it opens; events are tagged with their frame URL. */
export async function openPage(browser, { onEvent } = {}) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const frames = new Map();
  const record = (kind, sessionKey, detail) => onEvent?.({ kind, frame: sessionKey === sessionId ? 'page' : 'iframe', session: sessionKey, ...detail });
  // Commands are sent in order, so the domains are enabled before the paused target resumes; nothing waits on a paused target.
  const prepare = session => Promise.all([
    ...['Runtime.enable', 'Log.enable', 'Network.enable', 'Audits.enable', 'Page.enable'].map(method => browser.send(method, {}, session)),
    browser.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, session),
    browser.send('Runtime.runIfWaitingForDebugger', {}, session),
  ].map(command => command.catch(() => undefined)));
  const off = browser.on(async message => {
    const key = message.sessionId;
    if (key !== sessionId && !frames.has(key)) return;
    const { method, params } = message;
    if (method === 'Target.attachedToTarget') {
      const child = params.sessionId;
      frames.set(child, { url: params.targetInfo.url, targetId: params.targetInfo.targetId, type: params.targetInfo.type });
      await prepare(child);
    } else if (method === 'Target.detachedFromTarget') frames.delete(params.sessionId);
    else if (method === 'Target.targetInfoChanged' && frames.has(key)) frames.get(key).url = params.targetInfo.url;
    else if (method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(params.type)) record('console', key, { level: params.type, text: params.args.map(arg => arg.value ?? arg.description ?? '').join(' ') });
    else if (method === 'Runtime.exceptionThrown') record('exception', key, { text: params.exceptionDetails.exception?.description ?? params.exceptionDetails.text });
    else if (method === 'Log.entryAdded' && ['error', 'warning'].includes(params.entry.level)) record('log', key, { level: params.entry.level, source: params.entry.source, text: params.entry.text, url: params.entry.url });
    else if (method === 'Audits.issueAdded') record('issue', key, { code: params.issue.code, details: JSON.stringify(params.issue.details).slice(0, 600), node: Object.values(params.issue.details ?? {})[0]?.violatingNodeId });
    else if (method === 'Network.loadingFailed' && !params.canceled) record('network-failed', key, { text: params.errorText, blocked: params.blockedReason, corsError: params.corsErrorStatus?.corsError, requestId: params.requestId });
    else if (method === 'Network.responseReceived' && params.response.status >= 400) record('http-error', key, { status: params.response.status, url: params.response.url, requestId: params.requestId, server: params.response.headers?.server ?? params.response.headers?.Server, ray: params.response.headers?.['cf-ray'] });
    else if (method === 'Network.requestWillBeSent') record('request', key, { url: params.request.url, method: params.request.method });
  });
  await prepare(sessionId);
  const page = {
    sessionId, frames,
    send: (method, params) => browser.send(method, params, sessionId),
    async evaluate(expression, session = sessionId) {
      const result = await browser.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, session);
      if (result.exceptionDetails) throw new Error(`evaluate: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
      return result.result.value;
    },
    async waitFor(expression, { timeout = 20000, interval = 100, session = sessionId } = {}) {
      const started = Date.now();
      for (;;) {
        try { const value = await page.evaluate(expression, session); if (value) return value; } catch { /* document is navigating */ }
        if (Date.now() - started > timeout) return null;
        await delay(interval);
      }
    },
    /** Session of the newest attached out-of-process iframe whose URL starts with origin. */
    async frameSession(origin) {
      const { targetInfos } = await browser.send('Target.getTargets');
      const urls = new Map(targetInfos.map(info => [info.targetId, info.url]));
      let found = null;
      for (const [key, frame] of frames) { frame.url = urls.get(frame.targetId) ?? frame.url; if (frame.url.startsWith(origin)) found = key; }
      return found;
    },
    async waitForFrame(origin, timeout = 20000) {
      const started = Date.now();
      for (;;) { const key = await page.frameSession(origin); if (key) return key; if (Date.now() - started > timeout) return null; await delay(100); }
    },
    async viewport(width, height = 900) {
      const mobile = width < 768;
      await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, sessionId);
      await browser.send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false }, sessionId);
    },
    async goto(url) {
      const loaded = new Promise(resolve => {
        const off = browser.on(message => { if (message.sessionId === sessionId && message.method === 'Page.loadEventFired') { off(); resolve(); } });
        setTimeout(() => { off(); resolve(); }, 45000);
      });
      await browser.send('Page.navigate', { url }, sessionId);
      await loaded;
    },
    async click(x, y) {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await browser.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 }, sessionId);
    },
    async tap(x, y) {
      await browser.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }, sessionId);
      await browser.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
    },
    async type(text) { await browser.send('Input.insertText', { text }, sessionId); },
    async key(key, code = key, keyCode = 0) {
      for (const type of ['keyDown', 'keyUp']) await browser.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode }, sessionId);
    },
    async screenshot() { return Buffer.from((await browser.send('Page.captureScreenshot', { format: 'png' }, sessionId)).data, 'base64'); },
    async close() { off(); await browser.send('Target.closeTarget', { targetId }).catch(() => undefined); },
  };
  return page;
}
