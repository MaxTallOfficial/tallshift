import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// SSR only: real browser checks are needed for modal focus, Escape, containment and return focus.
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false } });
after(async () => { await server.close(); });
const { SystemDialog } = await server.ssrLoadModule('/src/foundations/SystemDialog.tsx');
const { SystemSheet } = await server.ssrLoadModule('/src/foundations/SystemSheet.tsx');
const { ModalSpecimen } = await server.ssrLoadModule('/src/foundations/ModalSpecimen.tsx');
const noop = () => {};
function attribute(tag: string, name: string) { return tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1]; }

test('dialog renders a named native dialog and localized close action; never opens non-modally during SSR', () => {
  const html = renderToStaticMarkup(createElement(SystemDialog, { id: 'sample-modal', open: true, onOpenChange: noop, title: 'Edit draft', description: 'Your draft stays here.', closeLabel: 'Close editor', children: createElement('input', { name: 'draft', defaultValue: 'Keep me' }) }));
  const dialog = html.match(/<dialog\b[^>]*>/)?.[0]; assert.ok(dialog);
  assert.equal(attribute(dialog, 'id'), 'sample-modal');
  assert.equal(attribute(dialog, 'aria-modal'), 'true');
  assert.doesNotMatch(dialog, /\sopen(?:=|\s|>)/);
  const titleId = attribute(dialog, 'aria-labelledby'); const descriptionId = attribute(dialog, 'aria-describedby');
  assert.ok(titleId); assert.ok(descriptionId);
  assert.ok(html.includes(`id="${titleId}"`)); assert.ok(html.includes(`id="${descriptionId}"`));
  assert.match(html, /aria-label="Close editor"/);
  assert.match(html, /name="draft" value="Keep me"/);
});

test('sheet shares modal semantics, optional description has no dangling reference', () => {
  const html = renderToStaticMarkup(createElement(SystemSheet, { open: false, onOpenChange: noop, title: 'Files', closeLabel: 'Close files', children: 'Source files', footer: createElement('button', { type: 'button' }, 'Done') }));
  const dialog = html.match(/<dialog\b[^>]*>/)?.[0]; assert.ok(dialog);
  assert.equal(attribute(dialog, 'data-variant'), 'sheet');
  assert.equal(attribute(dialog, 'aria-describedby'), undefined);
  assert.doesNotMatch(dialog, /\sopen(?:=|\s|>)/);
  assert.match(html, /class="system-dialog-footer"/);
  assert.match(html, /Source files/);
});

test('localized specimens have unique modal labels and real form ownership without nested dialogs', () => {
  for (const locale of ['en', 'ru', 'vi']) {
    const html = renderToStaticMarkup(createElement(ModalSpecimen, { locale }));
    const dialogs = html.match(/<dialog\b[^>]*>/g) ?? [];
    assert.equal(dialogs.length, 3);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    const submitForm = html.match(/<button\b[^>]*type="submit"[^>]*>/)?.[0]; assert.ok(submitForm);
    const form = attribute(submitForm, 'form'); assert.ok(form);
    assert.ok(html.includes(`<form id="${form}"`));
    dialogs.forEach(dialog => {
      const label = attribute(dialog, 'aria-labelledby'); assert.ok(label);
      assert.ok(ids.includes(label));
    });
  }
});
