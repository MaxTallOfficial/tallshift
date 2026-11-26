import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The live home page used to render "preview server is not configured" until hydration, which visitors saw on slow
// connections although the demo server was configured. SSR must show the loading state whenever an origin is set.
const cache = await mkdtemp(resolve(tmpdir(), 'tallshift-remote-preview-ssr-'));
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, cacheDir: cache, logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false } });
after(async () => { await server.close(); await rm(cache, { recursive: true, force: true }); });
const { RemotePreview, previewFrameOrigin } = await server.ssrLoadModule('/src/platform/RemotePreview.tsx');
const { PlatformProvider } = await server.ssrLoadModule('/src/platform/platform-context.tsx');

const demo = 'https://tallshift-demo.mtalldesign.workers.dev';
const loading = { en: 'Loading preview…', ru: 'Загружаем превью…', vi: 'Đang tải bản xem trước…' } as const;
const render = (previewOrigin: string, locale: 'en' | 'ru' | 'vi') => renderToStaticMarkup(createElement(PlatformProvider, { value: { production: true, previewOrigin } },
  createElement(RemotePreview, { itemId: 'C001', label: 'Demo', config: { locale, target: 'vite', accent: '#EBD183', motion: 'subtle', duration: 160 } })));

test('a configured preview server renders the loading shell in SSR, never the unavailable notice', () => {
  for (const locale of ['en', 'ru', 'vi'] as const) {
    const html = render(demo, locale);
    assert.match(html, /class="rp-preview"/);
    assert.ok(html.includes(`<p role="status">${loading[locale]}</p>`), html);
    assert.doesNotMatch(html, /rp-unavailable/);
    // The channel id is random per mount, so the iframe appears only after hydration.
    assert.doesNotMatch(html, /<iframe\b/);
  }
});

test('a missing or unsafe preview origin keeps the honest unavailable notice', () => {
  for (const origin of ['', 'not a url', `${demo}/`, `${demo}/path`, 'https://user:secret@tallshift-demo.mtalldesign.workers.dev', 'javascript:alert(1)', 'ftp://tallshift-demo.mtalldesign.workers.dev']) {
    for (const locale of ['en', 'ru', 'vi'] as const) {
      const html = render(origin, locale);
      assert.match(html, /<p class="rp-unavailable">/, `${origin} ${locale}`);
      assert.doesNotMatch(html, /rp-preview|<iframe\b/, `${origin} ${locale}`);
    }
  }
});

test('preview origin selection accepts only exact http(s) origins different from the page', () => {
  assert.equal(previewFrameOrigin(demo), demo);
  assert.equal(previewFrameOrigin('http://127.0.0.1:4176'), 'http://127.0.0.1:4176');
  assert.equal(previewFrameOrigin(demo, 'https://tallshift.com'), demo);
  assert.equal(previewFrameOrigin(demo, demo), '');
  for (const value of ['', `${demo}/`, `${demo}?item=A001`, `${demo}#x`, 'data:text/html,hi', 'javascript:alert(1)']) assert.equal(previewFrameOrigin(value), '', value);
});
