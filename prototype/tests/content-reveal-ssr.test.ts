import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// An isolated cache keeps these SSR checks from invalidating the local dev server.
const cache = await mkdtemp(resolve(tmpdir(), 'tallshift-reveal-ssr-'));
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, cacheDir: cache, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false } });
after(async () => { await server.close(); await rm(cache, { recursive: true, force: true }); });
const { ContentReveal } = await server.ssrLoadModule('/src/recipes/content-reveal/ContentReveal.tsx');
const { Demo } = await server.ssrLoadModule('/src/recipes/content-reveal/Demo.tsx');

test('SSR reveal preserves readable children and native actions without a hidden initial state', () => {
  for (const motion of ['off', 'subtle', 'expressive']) {
    const html = renderToStaticMarkup(createElement(ContentReveal, { motion, duration: 600 }, createElement('h2', null, 'Visible section'), createElement('a', { href: '/details' }, 'Read details')));
    assert.match(html, /<h2>Visible section<\/h2>/);
    assert.match(html, /<a href="\/details">Read details<\/a>/);
    assert.doesNotMatch(html, /\shidden(?:=|\s|>)|\sinert(?:=|\s|>)|aria-hidden|opacity:|transform:|tabindex=/);
    assert.equal((html.match(/<a\b/g) ?? []).length, 1);
  }
});

test('all localized demos include their readable content and non-submitting replay controls in SSR', () => {
  for (const locale of ['ru', 'en', 'vi']) {
    const html = renderToStaticMarkup(createElement(Demo, { locale, motion: 'off', duration: 600 }));
    assert.equal((html.match(/<button\b/g) ?? []).length, 2);
    assert.equal((html.match(/<button[^>]*type="button"/g) ?? []).length, 2);
    assert.match(html, /role="region"[^>]*aria-label="[^"]+"[^>]*tabindex="0"/);
    assert.match(html, /data-content-reveal=""/);
    assert.match(html, /<article\b/);
    assert.doesNotMatch(html, /aria-busy|aria-hidden|\shidden(?:=|\s|>)|opacity:0/);
  }
});
