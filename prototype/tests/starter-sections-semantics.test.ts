import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { contrastRatio } from '../src/foundations/tokens.ts';
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => server.close());
const { SplitHero, safeHeroHref } = await server.ssrLoadModule('/src/recipes/starter-split-hero/SplitHero.tsx');
const { FeatureGrid } = await server.ssrLoadModule('/src/recipes/starter-feature-grid/FeatureGrid.tsx');
const { Demo: HeroDemo } = await server.ssrLoadModule('/src/recipes/starter-split-hero/Demo.tsx');
const { Demo: GridDemo } = await server.ssrLoadModule('/src/recipes/starter-feature-grid/Demo.tsx');
const features = Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, title: `Feature ${i}`, description: `Full description ${i}.` }));
const hero = { title: 'A useful heading', description: 'A useful explanation.', primaryAction: { label: 'Features', href: '#features' }, secondaryAction: { label: 'Setup', href: '/setup?from=hero&lang=en' }, panelTitle: 'What you get', panelItems: features.slice(0, 3) };
const render = (component: Parameters<typeof createElement>[0], props: Record<string, unknown>) => renderToStaticMarkup(createElement(component, props));
test('split introduction has two real native links and all three visible supporting points', () => {
  const html = render(SplitHero, { ...hero, motion: 'off' });
  assert.equal((html.match(/<a\b/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<button\b|hidden=|aria-hidden="true"|opacity:0/);
  assert.match(html, /href="#features"/);
  assert.match(html, /href="\/setup\?from=hero&amp;lang=en"/);
  assert.match(html, /aria-labelledby="[^"]+-title"/);
  for (const item of hero.panelItems) assert.ok(html.includes(item.description));
});
test('hero link guard rejects executable, ambiguous and empty destinations', () => {
  for (const href of ['', ' ', 'javascript:alert(1)', 'data:text/html,x', '//evil.example', '\\evil.example', 'https://x.example\n', 'java\tscript:x', '/path%0aheader']) assert.throws(() => safeHeroHref(href), TypeError, href);
  for (const href of ['/catalog', '#details', './next', '../next', 'guide?q=two%20words', 'https://example.com/path?x=1', 'http://localhost:3000/']) assert.equal(safeHeroHref(href), href);
});
test('three and six feature variants retain full text without phantom actions', () => {
  for (const count of [3, 6]) {
    const html = render(FeatureGrid, { title: 'Benefits', features: features.slice(0, count), motion: 'off' });
    assert.equal((html.match(/<li\b/g) ?? []).length, count);
    assert.doesNotMatch(html, /<a\b|<button\b|hidden=|aria-hidden="true"/);
    for (const feature of features.slice(0, count)) assert.ok(html.includes(feature.description));
  }
});
test('invalid feature counts and duplicate IDs fail without silently dropping content', () => {
  for (const entries of [features.slice(0, 2), [...features, { ...features[0], id: 'f7' }], [features[0], features[0], features[2]]]) assert.throws(() => render(FeatureGrid, { title: 'Benefits', features: entries }), RangeError);
  for (const entries of [features.slice(0, 2), [features[0], features[0], features[2]]]) assert.throws(() => render(SplitHero, { ...hero, panelItems: entries }), RangeError);
});
test('text stays escaped and long content remains complete in server HTML', () => {
  const long = '<script>alert(1)</script>' + 'Длинное описание '.repeat(70);
  const html = render(FeatureGrid, { title: long, description: long, features: features.slice(0, 3).map(feature => ({ ...feature, description: long })) });
  assert.doesNotMatch(html, /<script>/);
  assert.equal((html.match(/&lt;script&gt;/g) ?? []).length, 5);
  assert.ok(html.includes('Длинное описание '.repeat(70)));
});
test('arbitrary section surfaces receive readable text in both components', () => {
  for (const surface of ['#FFFFFF', '#777777', '#EBD183', '#101713', '#000000']) for (const [component, props] of [[SplitHero, hero], [FeatureGrid, { title: 'Features', features: features.slice(0, 3) }]]) {
    const html = render(component, { ...props, surface, radius: 100 });
    const foreground = html.match(/--section-text:(#[\da-f]{6})/i)?.[1];
    assert.ok(foreground);
    assert.ok(contrastRatio(foreground, surface) >= 4.5);
    assert.match(html, /--section-radius:48px/);
  }
});
test('optional host icon never replaces readable feature title', () => {
  const html = render(FeatureGrid, { title: 'Benefits', features: features.slice(0, 3).map(feature => ({ ...feature, icon: createElement('span', null, 'host decoration') })) });
  assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 3);
  for (const feature of features.slice(0, 3)) assert.ok(html.includes(feature.title));
});
test('three locales render and hero links match unique real local targets', () => {
  for (const locale of ['ru', 'en', 'vi']) {
    const html = render(HeroDemo, { locale });
    const links = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
    assert.equal(links.length, 2);
    for (const target of links) assert.ok(html.includes(`id="${target}"`));
    assert.match(html, /SelectedExample\.tsx/);
    assert.equal((render(GridDemo, { locale }).match(/<li\b/g) ?? []).length, 3);
  }
  const double = renderToStaticMarkup(createElement('div', null, createElement(HeroDemo), createElement(HeroDemo)));
  const hrefs = [...double.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(hrefs).size, 4);
});
