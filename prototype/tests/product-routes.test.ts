import test from 'node:test';
import assert from 'node:assert/strict';
import { localizedProductHref, productRoute } from '../src/product/routes.ts';

const origin = 'https://tallshift.example';
const route = (path: string) => productRoute(new URL(path, origin));

test('entry URLs default to English and can be canonicalized to the material catalog', () => {
  for (const path of ['/', '/en']) {
    assert.deepEqual(route(path), { locale: 'en', slug: undefined, search: '', hash: '', notFound: false });
    assert.equal(localizedProductHref(path, 'en'), '/en/library');
  }
});

test('localized catalog and material routes retain filter, view and appearance parameters', () => {
  assert.deepEqual(route('/ru/library?type=animation&availability=ready&q=State+Relay'), {
    locale: 'ru', slug: undefined,
    search: '?type=animation&availability=ready&q=State+Relay', hash: '', notFound: false,
  });
  assert.deepEqual(route('/vi/library/state-relay?view=prompt&target=vite#share=appearance'), {
    locale: 'vi', slug: 'state-relay',
    search: '?view=prompt&target=vite', hash: '#share=appearance', notFound: false,
  });
});

test('malformed encodings, unsupported route structures and escaping traversal are rejected', () => {
  for (const path of [
    '/en/library/%',
    '/ru/library/%ZZ',
    '/vi/library/%E0%A4%A',
    '/de/library/state-relay',
    '/en/checkout/state-relay',
    '/vi/library/state-relay/source',
    '/en/library/../../outside',
    '/ru/library/%2e%2e/%2e%2e/outside',
  ]) {
    assert.equal(route(path).notFound, true, path);
  }
});

test('switching languages preserves catalog criteria and complete material links, including planned material', () => {
  const catalog = '/en/library?type=animation&pack=FREE-STARTER&saved=1&q=State+Relay#catalog-results';
  assert.equal(localizedProductHref(catalog, 'ru'), catalog.replace('/en/', '/ru/'));

  for (const slug of ['state-relay', 'starter-split-hero']) {
    const original = `${origin}/ru/library/${slug}?view=code&target=vite#share=%7B%22accent%22%3A%22%23EBD183%22%7D`;
    const translated = localizedProductHref(original, 'vi');
    assert.equal(translated, `/vi/library/${slug}?view=code&target=vite#share=%7B%22accent%22%3A%22%23EBD183%22%7D`);
    const before = new URL(original);
    const after = new URL(translated, origin);
    assert.equal(after.search, before.search);
    assert.equal(after.hash, before.hash);
    assert.equal(productRoute(after).slug, slug);
    assert.equal(localizedProductHref(translated, 'ru'), before.pathname + before.search + before.hash);
  }
});
