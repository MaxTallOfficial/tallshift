import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Render the actual TSX modules; these assertions cover emitted semantics only.
// Keyboard, pointer, layout and assistive technology still require browser QA.
const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(async () => { await server.close(); });
const { SystemSelect } = await server.ssrLoadModule('/src/foundations/SystemSelect.tsx');
const { SystemSearchCombobox } = await server.ssrLoadModule('/src/foundations/SystemSearchCombobox.tsx');
const { SystemSegmentedControl } = await server.ssrLoadModule('/src/foundations/SystemSegmentedControl.tsx');
const noop = () => {};
const options = [{ value: 'next', label: 'Next.js' }, { value: 'vite', label: 'Vite' }];

function attributes(markup: string, tag: string) {
  const found = markup.match(new RegExp(`<${tag}\\b[^>]*>`));
  assert.ok(found, `${tag} must exist`);
  return found[0];
}
function assertDescribed(markup: string, tag: string, text: string) {
  const target = attributes(markup, tag).match(/aria-describedby="([^"]+)"/);
  assert.ok(target, `${tag} needs a description`);
  assert.ok(markup.includes(`id="${target[1]}"`));
  assert.ok(markup.includes(text));
}

test('select never presents the first option as an unknown controlled value', () => {
  const html = renderToStaticMarkup(createElement(SystemSelect, { label: 'Target', value: 'missing', options, onChange: noop }));
  assert.match(html, />—<\/span>/);
  assert.doesNotMatch(html, />Next\.js<\/span>/);
  assert.doesNotMatch(html, /aria-activedescendant|aria-controls/);
  assert.match(html, /aria-expanded="false"/);
});

test('select readOnly stays focusable and labelled; empty select is disabled', () => {
  const readOnly = renderToStaticMarkup(createElement(SystemSelect, { label: 'Target', value: 'next', options, onChange: noop, readOnly: true, hint: 'Project target' }));
  assert.match(attributes(readOnly, 'button'), /aria-readonly="true"/);
  assert.doesNotMatch(attributes(readOnly, 'button'), / disabled/);
  assertDescribed(readOnly, 'button', 'Project target');
  const empty = renderToStaticMarkup(createElement(SystemSelect, { label: 'Target', value: '', options: [], onChange: noop }));
  assert.match(attributes(empty, 'button'), /disabled=""/);
});

test('readOnly search exposes text without offering a clear mutation', () => {
  const html = renderToStaticMarkup(createElement(SystemSearchCombobox, {
    label: 'Search', placeholder: 'Name', value: 'State Relay', options: [], onChange: noop,
    clearLabel: 'Clear search', listLabel: 'Suggestions', emptyText: 'No matches',
    readOnly: true, hint: 'Current query',
  }));
  assert.match(attributes(html, 'input'), /readOnly=""/);
  assert.match(attributes(html, 'input'), /aria-readonly="true"/);
  assert.match(attributes(html, 'input'), /aria-expanded="false"/);
  assert.doesNotMatch(html, /<button|role="listbox"|aria-activedescendant|aria-controls/);
  assertDescribed(html, 'input', 'Current query');
});

test('separate segmented instances have independent native radio groups and linked descriptions', () => {
  const html = renderToStaticMarkup(createElement('div', null,
    createElement(SystemSegmentedControl, { label: 'Target', value: 'next', options, onChange: noop, hint: 'Choose a target' }),
    createElement(SystemSegmentedControl, { label: 'Second target', value: 'vite', options: [{ ...options[0], disabled: true }, options[1]], onChange: noop, disabled: true }),
  ));
  const names = [...html.matchAll(/<input[^>]*name="([^"]+)"/g)].map(match => match[1]);
  assert.equal(names.length, 4);
  assert.equal(names[0], names[1]);
  assert.equal(names[2], names[3]);
  assert.notEqual(names[0], names[2]);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assertDescribed(html, 'fieldset', 'Choose a target');
  assert.match(html, /aria-disabled="true" disabled=""/);
});
