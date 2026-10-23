import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// SSR coverage only: emitted roles, state attributes, labels and ID relationships.
// These tests do not exercise focus, keyboard activation, click guards, layout or AT.
const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(async () => { await server.close(); });
const { SystemButton } = await server.ssrLoadModule('/src/foundations/SystemButton.tsx');
const { SystemIconButton } = await server.ssrLoadModule('/src/foundations/SystemIconButton.tsx');
const { SystemTabList, SystemTabs } = await server.ssrLoadModule('/src/foundations/SystemTabs.tsx');
const noop = () => {};
function tags(html: string, name: string) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'g')) ?? [];
}
function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
}

test('button defaults to a non-submitting native button and permits explicit submit', () => {
  const defaultButton = renderToStaticMarkup(createElement(SystemButton, null, 'Use component'));
  assert.equal(attribute(tags(defaultButton, 'button')[0], 'type'), 'button');
  assert.match(defaultButton, />Use component<\/span>/);
  assert.doesNotMatch(defaultButton, /aria-busy|aria-disabled| disabled=/);
  const submit = renderToStaticMarkup(createElement(SystemButton, { type: 'submit', disabled: true, 'aria-describedby': 'reason' }, 'Submit'));
  assert.equal(attribute(tags(submit, 'button')[0], 'type'), 'submit');
  assert.equal(attribute(tags(submit, 'button')[0], 'aria-describedby'), 'reason');
  assert.match(tags(submit, 'button')[0], /\sdisabled=""/);
});

test('busy button emits busy and unavailable state while retaining the original label', () => {
  const html = renderToStaticMarkup(createElement(SystemButton, { loading: true }, 'Build package'));
  const button = tags(html, 'button')[0];
  assert.equal(attribute(button, 'aria-busy'), 'true');
  assert.equal(attribute(button, 'aria-disabled'), 'true');
  assert.doesNotMatch(button, /\sdisabled=/);
  const label = html.match(/<span class="system-button-label"[^>]*>/)?.[0];
  assert.ok(label);
  assert.doesNotMatch(label, /aria-hidden/);
  assert.match(html, />Build package<\/span>/);
  assert.match(html, /class="system-button-busy" aria-hidden="true"/);
});

test('icon action has an explicit accessible name and exposes toggle state', () => {
  const html = renderToStaticMarkup(createElement(SystemIconButton, { icon: 'plus', label: 'Save example', 'aria-pressed': true }));
  const button = tags(html, 'button')[0];
  assert.equal(attribute(button, 'aria-label'), 'Save example');
  assert.equal(attribute(button, 'aria-pressed'), 'true');
  assert.equal(attribute(tags(html, 'svg')[0], 'aria-hidden'), 'true');
});

const listOptions = [
  { value: 'preview', label: 'Preview', tabId: 'tab-preview', panelId: 'panel-preview' },
  { value: 'source', label: 'Code', tabId: 'tab-source', panelId: 'panel-source' },
  { value: 'later', label: 'Coming later', tabId: 'tab-later', panelId: 'panel-later', disabled: true },
];

test('tablist emits one tab stop, unique IDs and links to caller-owned panels', () => {
  const html = renderToStaticMarkup(createElement(SystemTabList, { label: 'Resources', value: 'source', onChange: noop, options: listOptions, activation: 'manual', orientation: 'vertical' }));
  const list = tags(html, 'div').find(tag => attribute(tag, 'role') === 'tablist');
  assert.ok(list);
  assert.equal(attribute(list, 'aria-label'), 'Resources');
  assert.equal(attribute(list, 'aria-orientation'), 'vertical');
  assert.equal(attribute(list, 'data-activation'), 'manual');
  const buttons = tags(html, 'button');
  assert.equal(buttons.length, listOptions.length);
  assert.equal(buttons.filter(tag => attribute(tag, 'tabindex') === '0').length, 1);
  buttons.forEach((button, index) => {
    const option = listOptions[index];
    assert.equal(attribute(button, 'role'), 'tab');
    assert.equal(attribute(button, 'id'), option.tabId);
    assert.equal(attribute(button, 'aria-controls'), option.panelId);
    assert.equal(attribute(button, 'aria-selected'), String(option.value === 'source'));
    assert.equal(attribute(button, 'tabindex'), option.value === 'source' ? '0' : '-1');
  });
  assert.match(buttons[2], /\sdisabled=""/);
});

test('tablist fallback never selects a disabled option and empty groups have no tab stops', () => {
  const html = renderToStaticMarkup(createElement(SystemTabList, { label: 'Resources', value: 'later', onChange: noop, options: listOptions }));
  const buttons = tags(html, 'button');
  assert.equal(attribute(buttons[0], 'aria-selected'), 'true');
  assert.equal(attribute(buttons[0], 'tabindex'), '0');
  assert.equal(attribute(buttons[2], 'aria-selected'), 'false');
  const empty = renderToStaticMarkup(createElement(SystemTabList, { label: 'No resources', value: '', onChange: noop, options: [] }));
  assert.equal(tags(empty, 'button').length, 0);
});

test('composed tabs retain all panels and hide inactive panels from interaction semantics', () => {
  const html = renderToStaticMarkup(createElement(SystemTabs, {
    label: 'Resources', value: 'source', onChange: noop,
    options: [{ value: 'preview', label: 'Preview', content: 'Preview content' }, { value: 'source', label: 'Code', content: 'Source content' }],
  }));
  const buttons = tags(html, 'button');
  const panels = tags(html, 'div').filter(tag => attribute(tag, 'role') === 'tabpanel');
  assert.equal(panels.length, 2);
  panels.forEach((panel, index) => {
    assert.equal(attribute(panel, 'id'), attribute(buttons[index], 'aria-controls'));
    assert.equal(attribute(panel, 'aria-labelledby'), attribute(buttons[index], 'id'));
  });
  assert.equal(attribute(panels[0], 'aria-hidden'), 'true');
  assert.equal(attribute(panels[0], 'tabindex'), '-1');
  assert.match(panels[0], /\sinert=""/);
  assert.equal(attribute(panels[1], 'aria-hidden'), undefined);
  assert.equal(attribute(panels[1], 'tabindex'), '0');
  assert.doesNotMatch(panels[1], /\sinert=/);
  assert.match(html, /Preview content/);
  assert.match(html, /Source content/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
