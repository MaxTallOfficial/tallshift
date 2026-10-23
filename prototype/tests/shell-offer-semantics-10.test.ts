import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false } });
after(async () => { await server.close(); });
const { SystemBrandMark } = await server.ssrLoadModule('/src/foundations/SystemBrandMark.tsx');
const { SystemNavigationShell } = await server.ssrLoadModule('/src/foundations/SystemNavigationShell.tsx');
const { SystemLocaleControl } = await server.ssrLoadModule('/src/foundations/SystemLocaleControl.tsx');
const { SystemTypography } = await server.ssrLoadModule('/src/foundations/SystemTypography.tsx');
const { SystemOffer } = await server.ssrLoadModule('/src/foundations/SystemOffer.tsx');
const { SystemEntitlementState } = await server.ssrLoadModule('/src/foundations/SystemEntitlementState.tsx');
const render = (Component: Parameters<typeof createElement>[0], props: object) => renderToStaticMarkup(createElement(Component, props));
const noop = () => {};

test('wordmark and compact mark remain named native home links', () => {
  for (const compact of [false,true]) { const html = render(SystemBrandMark, { compact, href: '/', 'aria-label': 'Tallshift home' }); assert.match(html, /<a[^>]+href="\/"/); assert.match(html, /aria-label="Tallshift home"/); assert.match(html, /aria-hidden="true"/); }
});
test('navigation keeps current location and skip destination distinct from its disclosure state', () => {
  const html = render(SystemNavigationShell, { label: 'Foundation navigation', activeId: 'type', items: [{ id: 'type', href: '#type', label: 'Type' },{ id: 'actions', href: '#actions', label: 'Actions' }], skipLink: { href: '#main', label: 'Skip to content' }, mobileOpen: true });
  assert.match(html, /class="system-shell-skip" href="#main"/); assert.match(html, /<nav[^>]+aria-label="Foundation navigation"/); assert.match(html, /href="#type" aria-current="location"/); assert.doesNotMatch(html, /href="#actions" aria-current/); assert.match(html, /aria-expanded="true"/);
  const control = html.match(/aria-controls="([^"]+)"/)?.[1]; assert.ok(control); assert.ok(html.includes(`id="${control}"`));
});
test('locale choice has three language names, language hints and exactly one current native radio', () => {
  const html = render(SystemLocaleControl, { locale: 'vi', onChange: noop });
  assert.match(html, /Ngôn ngữ giao diện/); for (const name of ['English','Русский','Tiếng Việt']) assert.ok(html.includes(`aria-label="${name}"`));
  assert.equal((html.match(/ checked=""/g) ?? []).length, 1); assert.match(html, /<input(?=[^>]*value="vi")(?=[^>]*checked="")[^>]*>/); assert.match(html, /lang="vi"/);
});
test('visual type role does not override requested semantic heading level', () => {
  const html = render(SystemTypography, { as: 'h2', textRole: 'display', children: 'Build faster', lang: 'vi', numeric: true });
  assert.match(html, /^<h2/); assert.match(html, /data-role="display"/); assert.match(html, /data-numeric="true"/); assert.match(html, /lang="vi"/);
});
const offer = { id: 'PACK', name: 'Product', availability: 'planned', badge: 'Planned', headline: 'Build your product', description: 'Scope is planned.', benefits: ['Source and guide'], priceLabel: 'Not on sale', priceNote: 'Planning hypothesis only.' };
test('planned offers cannot expose enabled purchase actions even if a callback was supplied', () => {
  const html = render(SystemOffer, { offer, action: { label: 'Buy', onAction: noop, reason: 'Not released' } });
  assert.match(html, /data-availability="planned"/); assert.match(html, /<button[^>]+disabled=""/); assert.match(html, /Not on sale/); assert.match(html, /Planning hypothesis only\./); assert.doesNotMatch(html, /href=.*checkout/);
  const reason = html.match(/aria-describedby="([^"]+)"/)?.[1]; assert.ok(reason); assert.ok(html.includes(`id="${reason}"`));
});
test('available offers can invoke a real action and retain an accessible article title', () => {
  const html = render(SystemOffer, { offer: { ...offer, availability: 'available' }, action: { label: 'Open source', onAction: noop } });
  assert.doesNotMatch(html, / disabled=""/); const title = html.match(/aria-labelledby="([^"]+)"/)?.[1]; assert.ok(title); assert.ok(html.includes(`<h3 id="${title}"`));
});
const state = { kind: 'owner', itemLabel: 'Product', status: 'Access confirmed', title: 'Your source', body: 'Files are ready.', action: { label: 'Download', reason: 'Verified on server', onAction: noop } };
test('pending/error/no-access states cannot enable file actions; owner needs a callback and file readiness', () => {
  for (const kind of ['pending','error','no-access','closed']) assert.match(render(SystemEntitlementState,{ state: { ...state, kind } }), /<button[^>]+disabled=""/);
  assert.doesNotMatch(render(SystemEntitlementState, { state }), / disabled=""/);
  assert.match(render(SystemEntitlementState, { state: { ...state, action: { ...state.action, disabled: true } } }), / disabled=""/);
  assert.match(render(SystemEntitlementState, { state: { ...state, action: { ...state.action, onAction: undefined } } }), / disabled=""/);
});
test('inactive stable-height state is inert and hidden; announcements are explicitly opt-in', () => {
  const html = render(SystemEntitlementState, { state, active: false, announce: true });
  assert.match(html, /inert=""/); assert.match(html, /aria-hidden="true"/); assert.doesNotMatch(html, /role="status"/);
  assert.doesNotMatch(render(SystemEntitlementState, { state }), /role="status"/); assert.match(render(SystemEntitlementState, { state, announce: true }), /role="status"/);
});
