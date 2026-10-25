import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
// Structural SSR checks only; keyboard, focus and collision require browser checks.
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false } });
after(async () => { await server.close(); });
const { SystemMultiSelect } = await server.ssrLoadModule('/src/foundations/SystemMultiSelect.tsx');
const { SystemButton } = await server.ssrLoadModule('/src/foundations/SystemButton.tsx');
const { SystemMenu } = await server.ssrLoadModule('/src/foundations/SystemMenu.tsx');
const { SystemPopover } = await server.ssrLoadModule('/src/foundations/SystemPopover.tsx');
const { SystemTooltip } = await server.ssrLoadModule('/src/foundations/SystemTooltip.tsx');
const { FloatingSpecimen } = await server.ssrLoadModule('/src/foundations/FloatingSpecimen.tsx');
const trigger = (props: object) => createElement('button', { ...props, type: 'button' }, 'Open');
function attribute(tag: string, name: string) { return tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1]; }
const items = [{ id: 'copy', label: 'Copy', onSelect() {} }, { id: 'locked', label: 'Locked', disabled: true, onSelect() {} }, { id: 'delete', label: 'Delete', destructive: true, onSelect() {} }];
test('closed menu keeps a named trigger and omits hidden menu relationships', () => {
  const html = renderToStaticMarkup(createElement(SystemMenu, { label: 'Actions', items, trigger }));
  assert.match(html, /aria-haspopup="menu"/); assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /role="menu"|aria-controls=/);
});
test('open menu links trigger to menu and exposes disabled and destructive item states', () => {
  const html = renderToStaticMarkup(createElement(SystemMenu, { label: 'Actions', items, trigger, defaultOpen: true }));
  const buttons = html.match(/<button\b[^>]*>/g) ?? [], menu = html.match(/<div\b[^>]*role="menu"[^>]*>/)?.[0] ?? '';
  assert.equal(attribute(buttons[0], 'aria-controls'), attribute(menu, 'id'));
  assert.equal(attribute(menu, 'aria-label'), 'Actions');
  assert.equal(buttons.filter(button => attribute(button, 'role') === 'menuitem').length, 3);
  assert.match(buttons[2], /disabled=""/); assert.match(buttons[3], /data-destructive="true"/);
  assert.ok(buttons.slice(1).every(button => attribute(button, 'tabindex') === '-1'));
});
test('controlled closed overrides defaultOpen', () => {
  const html = renderToStaticMarkup(createElement(SystemMenu, { label: 'Actions', items, trigger, defaultOpen: true, open: false }));
  assert.doesNotMatch(html, /role="menu"/);
});
test('popover is explicitly nonmodal, named by heading and contains named close action', () => {
  const html = renderToStaticMarkup(createElement(SystemPopover, { title: 'File information', closeLabel: 'Close information', trigger, defaultOpen: true }, createElement('p', null, 'Local file')));
  const dialog = html.match(/<div\b[^>]*role="dialog"[^>]*>/)?.[0] ?? '', heading = html.match(/<h4\b[^>]*>/)?.[0] ?? '';
  assert.equal(attribute(dialog, 'aria-modal'), 'false');
  assert.equal(attribute(dialog, 'aria-labelledby'), attribute(heading, 'id'));
  assert.match(html, /aria-label="Close information"/); assert.match(html, /Local file/);
});
test('tooltip has no dangling description or essential content in initial closed markup', () => {
  const html = renderToStaticMarkup(createElement(SystemTooltip, { content: 'Supplemental explanation', trigger }));
  assert.match(html, />Open<\/button>/); assert.doesNotMatch(html, /aria-describedby|role="tooltip"|Supplemental explanation/);
});
test('floating specimen renders all three locales without duplicate IDs or unavailable action execution claims', () => {
  for (const locale of ['en', 'ru', 'vi']) {
    const html = renderToStaticMarkup(createElement(FloatingSpecimen, { locale }));
    assert.match(html, /id="floating"/); assert.match(html, /role="status"/); assert.match(html, /AfterlightExample\.tsx/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size);
  }
});

test('dropdown buttons provide a decorative state-aware chevron without duplicating explicit icons', () => {
  for (const popup of ['menu', 'listbox', 'dialog']) for (const expanded of [false, true]) {
    const html = renderToStaticMarkup(createElement(SystemButton, {'aria-haspopup':popup,'aria-expanded':expanded}, 'Options'));
    assert.match(html, new RegExp(`data-icon="chevron-${expanded?'up':'down'}"`));
    assert.equal((html.match(/data-icon="chevron-/g)??[]).length,1);
    assert.match(html,/aria-hidden="true"/);
  }
  const html = renderToStaticMarkup(createElement(SystemButton, {'aria-haspopup':'menu',trailingIcon:createElement('svg',{'data-custom-icon':true})}, 'Options'));
  assert.doesNotMatch(html,/data-icon="chevron-/);
  assert.match(html,/data-custom-icon="true"/);
});

test('multi-select renders selected labels and independent removal controls in its trigger field', () => {
 const html=renderToStaticMarkup(createElement(SystemMultiSelect,{label:'Display options',placeholder:'Choose options',value:['wrap','numbers'],onChange(){},options:[{value:'wrap',label:'Wrap lines'},{value:'numbers',label:'Line numbers'}]}));
 const button=html.match(/<button[^>]*aria-haspopup="listbox"[\s\S]*?<\/button>/)?.[0]??'';
 assert.match(button,/aria-haspopup="listbox"/);assert.match(button,/aria-expanded="false"/);
 assert.match(html,/Wrap lines/);assert.match(html,/Line numbers/);assert.doesNotMatch(html,/role="listbox"/);assert.match(html,/aria-label="Remove Wrap lines"/);
 assert.equal((html.match(/class="sm-chip"/g)??[]).length,2);
});
test('empty multi-select uses a placeholder and supports a disabled trigger', () => {
 const html=renderToStaticMarkup(createElement(SystemMultiSelect,{label:'Options',placeholder:'Choose options',value:[],onChange(){},disabled:true,options:[{value:'wrap',label:'Wrap lines'}]}));
 assert.match(html,/Choose options/);assert.match(html,/disabled=""/);assert.doesNotMatch(html,/class="sm-chip"/);
});
