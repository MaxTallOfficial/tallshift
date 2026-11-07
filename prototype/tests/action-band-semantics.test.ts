import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { contrastRatio } from '../src/foundations/tokens.ts';

const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => server.close());
const { ActionBand } = await server.ssrLoadModule('/src/recipes/starter-action-band/ActionBand.tsx');
const { Demo } = await server.ssrLoadModule('/src/recipes/starter-action-band/Demo.tsx');
const noop = () => {};
const base = { title: 'Next step', description: 'A clear next action.', action: { label: 'Show details', onClick: noop } };

test('the closing section exposes exactly one non-submitting native action and labelled content', () => {
  const html = renderToStaticMarkup(createElement(ActionBand, base));
  assert.equal((html.match(/<button\b/g) ?? []).length, 1);
  assert.equal((html.match(/<a\b/g) ?? []).length, 0);
  assert.match(html, /<button[^>]*type="button"/);
  assert.match(html, /<section[^>]*aria-labelledby="[^"]+-title"[^>]*aria-describedby="[^"]+-description"/);
  assert.match(html, /<h2[^>]*>Next step<\/h2>/);
  assert.match(html, />Show details<\/span>/);
});

test('link and busy variants preserve C001 semantics without manufacturing a second action', () => {
  const link = renderToStaticMarkup(createElement(ActionBand, { ...base, action: { label: 'Open details', href: '/details?from=closing&mode=plain' } }));
  assert.equal((link.match(/<a\b/g) ?? []).length, 1);
  assert.doesNotMatch(link, /<button\b/);
  assert.match(link, /href="\/details\?from=closing&amp;mode=plain"/);
  const busy = renderToStaticMarkup(createElement(ActionBand, { ...base, action: { label: 'Open details', href: '/details', pending: true, pendingLabel: 'Preparing details' } }));
  assert.match(busy, /<a[^>]*aria-disabled="true"[^>]*aria-busy="true"/);
  assert.doesNotMatch(busy, /href=/);
  assert.match(busy, /role="link"/);
});

test('omitted or blank note has no element or dangling description while real note is linked', () => {
  for (const note of [undefined, '', '   ']) {
    const html = renderToStaticMarkup(createElement(ActionBand, { ...base, note }));
    assert.doesNotMatch(html, /-note/);
    assert.equal((html.match(/<p\b/g) ?? []).length, 1);
  }
  const html = renderToStaticMarkup(createElement(ActionBand, { ...base, note: 'No information is sent.' }));
  assert.match(html, /aria-describedby="[^"]+-description [^"]+-note"/);
  assert.match(html, /<p[^>]*id="[^"]+-note"[^>]*>No information is sent\.<\/p>/);
});

test('custom section surfaces use real readable text rather than the fixed dark-theme foreground', () => {
  for (const surface of ['#FFFFFF', '#777777', '#EBD183', '#101713', '#000000']) {
    const html = renderToStaticMarkup(createElement(ActionBand, { ...base, surface }));
    const foreground = html.match(/--ab-text:(#[\da-f]{6})/i)?.[1];
    assert.ok(foreground, `Custom surface ${surface} has an explicit readable text color`);
    assert.ok(contrastRatio(foreground, surface) >= 4.5, `${foreground} on ${surface}`);
    assert.ok(html.includes(`--ab-secondary:${foreground}`), 'Description and note keep the same readable foreground');
  }
});

test('localized demo begins with one disclosure action, a hidden instruction and no false result', () => {
  for (const [locale, label] of [['ru', 'Показать шаги подключения'], ['en', 'Show setup steps'], ['vi', 'Xem các bước cài đặt']]) {
    const html = renderToStaticMarkup(createElement(Demo, { locale, motion: 'off' }));
    assert.equal((html.match(/<button\b/g) ?? []).length, 1);
    assert.match(html, /aria-controls="[^"]+-steps" aria-expanded="false"/);
    assert.match(html, /<section[^>]*id="[^"]+-steps"[^>]*hidden=""/);
    assert.ok(html.includes(label));
    assert.match(html, /SelectedExample\.tsx/);
  }
});
