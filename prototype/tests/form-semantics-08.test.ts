import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Emitted semantics only. DOM mixed state, keys and focus need browser verification.
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false } });
after(async () => { await server.close(); });
const { SystemTextInput, SystemTextarea } = await server.ssrLoadModule('/src/foundations/SystemTextField.tsx');
const { SystemCheckbox } = await server.ssrLoadModule('/src/foundations/SystemCheckbox.tsx');
const { SystemRadioGroup } = await server.ssrLoadModule('/src/foundations/SystemRadioGroup.tsx');
const { SystemSwitch } = await server.ssrLoadModule('/src/foundations/SystemSwitch.tsx');
const noop = () => {};
function tag(html: string, name: string) {
  const match = html.match(new RegExp(`<${name}\\b[^>]*>`)); assert.ok(match); return match[0];
}
function descriptionIds(html: string, controlTag: string) {
  const match = tag(html, controlTag).match(/aria-describedby="([^"]+)"/); assert.ok(match);
  return match[1].split(' ');
}

test('text input links label, helper and error while retaining external descriptions', () => {
  const html = renderToStaticMarkup(createElement('div', null,
    createElement('p', { id: 'privacy' }, 'Kept local'),
    createElement(SystemTextInput, { id: 'email', label: 'Work email', type: 'email', required: true, value: 'bad', onChange: noop, description: 'Receipt address', error: 'Enter a valid address', 'aria-describedby': 'privacy' }),
  ));
  assert.match(html, /<label for="email">Work email<\/label>/);
  assert.match(tag(html, 'input'), /required=""/);
  assert.match(tag(html, 'input'), /aria-invalid="true"/);
  assert.deepEqual(descriptionIds(html, 'input'), ['privacy', 'email-help', 'email-error']);
  for (const id of descriptionIds(html, 'input')) assert.ok(html.includes(`id="${id}"`));
  assert.doesNotMatch(html, /role="alert"/);
});

test('read-only input and disabled textarea keep native restrictions and accessible messages', () => {
  const locked = renderToStaticMarkup(createElement(SystemTextInput, { label: 'ID', value: 'A001', readOnly: true }));
  assert.match(tag(locked, 'input'), /readOnly=""/);
  assert.doesNotMatch(tag(locked, 'input'), / disabled/);
  const html = renderToStaticMarkup(createElement(SystemTextarea, { id: 'notes', label: 'Notes', disabled: true, required: true, defaultValue: 'Locked', maxLength: 160, counter: '6/160', error: 'Unavailable', announceError: true }));
  assert.match(tag(html, 'textarea'), /disabled=""/);
  assert.match(tag(html, 'textarea'), /required=""/);
  assert.match(tag(html, 'textarea'), /maxLength="160"/);
  assert.deepEqual(descriptionIds(html, 'textarea'), ['notes-error', 'notes-count']);
  assert.match(html, /role="alert"/);
});

test('checkbox carries native form attributes, error and read-only semantics', () => {
  const html = renderToStaticMarkup(createElement(SystemCheckbox, { label: 'Licence', description: 'Read the terms', error: 'Consent required', checked: false, onChange: noop, readOnly: true, required: true, name: 'consent', value: 'yes' }));
  const control = tag(html, 'input');
  assert.match(control, /type="checkbox"/); assert.match(control, /name="consent"/); assert.match(control, /value="yes"/);
  assert.match(control, /required=""/); assert.match(control, /aria-readonly="true"/); assert.match(control, /aria-invalid="true"/);
  assert.doesNotMatch(control, / disabled/);
  for (const id of descriptionIds(html, 'input')) assert.ok(html.includes(`id="${id}"`));
});

test('radio instances generate independent names and preserve disabled option semantics', () => {
  const options = [{ value: 'react', label: 'React' }, { value: 'html', label: 'HTML', disabled: true }];
  const html = renderToStaticMarkup(createElement('div', null,
    createElement(SystemRadioGroup, { label: 'First format', value: 'react', options, onChange: noop, required: true, description: 'Choose format' }),
    createElement(SystemRadioGroup, { label: 'Second format', value: 'react', options, onChange: noop, disabled: true }),
  ));
  const names = [...html.matchAll(/<input[^>]*name="([^"]+)"/g)].map(match => match[1]);
  assert.equal(names.length, 4); assert.equal(names[0], names[1]); assert.equal(names[2], names[3]); assert.notEqual(names[0], names[2]);
  assert.match(html, /<fieldset[^>]*disabled=""/);
  assert.match(html, /<input[^>]*disabled=""[^>]*value="html"/);
  assert.match(html, /<legend>First format<\/legend>/);
  for (const id of descriptionIds(html, 'fieldset')) assert.ok(html.includes(`id="${id}"`));
});

test('pending switch keeps the confirmed checked state and a focusable busy control', () => {
  const html = renderToStaticMarkup(createElement(SystemSwitch, { label: 'Sync', checked: false, onChange: noop, pending: true, pendingLabel: 'Waiting for confirmation', description: 'Server setting' }));
  const control = tag(html, 'button');
  assert.match(control, /type="button"/); assert.match(control, /role="switch"/); assert.match(control, /aria-checked="false"/);
  assert.match(control, /aria-busy="true"/); assert.match(control, /aria-disabled="true"/); assert.doesNotMatch(control, / disabled=/);
  assert.match(html, /role="status">Waiting for confirmation/);
  for (const id of descriptionIds(html, 'button')) assert.ok(html.includes(`id="${id}"`));
});

test('color apply is enabled only for a valid changed canonical color', async () => {
  const { SystemHexColorField } = await server.ssrLoadModule('/src/foundations/SystemColorControl.tsx');
  const render = (initialDraft: string) => renderToStaticMarkup(createElement(SystemHexColorField, { locale:'en', value:'#AABBCC', initialDraft, onChange:noop }));
  const same = render('#abc');
  assert.match(same, /data-dirty="false"/); assert.match(tag(same,'button'), /disabled=""/);
  const invalid = render('#ZZZZZZ');
  assert.match(tag(invalid,'input'), /aria-invalid="true"/); assert.match(tag(invalid,'button'), /disabled=""/);
  const changed = render('#778899');
  assert.match(changed, /data-dirty="true"/); assert.doesNotMatch(tag(changed,'button'), /disabled=""/);
  assert.match(tag(changed,'button'), /aria-label="[^"]+"/); assert.match(changed, /data-variant="primary"/);
});
