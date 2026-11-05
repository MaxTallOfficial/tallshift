import test from 'node:test';
import assert from 'node:assert/strict';
import canonical from '../src/data/catalog.json' with { type: 'json' };
import { catalogPacks, materials } from '../src/product/catalog-data.ts';
import { catalogDefaults, filterCatalog, readCatalogFilters, writeCatalogFilters } from '../src/product/catalog-model.ts';

test('product catalog preserves every canonical identity and accurately exposes one working material', () => {
  assert.equal(materials.length, 32);
  assert.deepEqual(materials.map(material => material.id), canonical.items.map(material => material.id));
  assert.equal(new Set(materials.map(material => material.slug)).size, 32);
  assert.deepEqual(materials.filter(material => material.available).map(material => material.id), ['A001']);
  assert.equal(materials.filter(material => material.access === 'free').length, 9);
  for (const material of materials) {
    const original = canonical.items.find(entry => entry.id === material.id)!;
    assert.equal(material.slug, original.slug);
    for (const locale of ['en', 'ru', 'vi'] as const) {
      assert.ok(material.title[locale].trim(), `${material.id} title ${locale}`);
      assert.ok(material.description[locale].trim(), `${material.id} description ${locale}`);
    }
  }
});

test('catalog URL roundtrip preserves combined criteria and removes default noise', () => {
  const filters = { ...catalogDefaults, q: 'Nhấn & phản hồi', type: 'animation' as const, pack: 'FREE-STARTER', access: 'free' as const, availability: 'ready' as const, saved: true, sort: 'name' as const };
  assert.deepEqual(readCatalogFilters(writeCatalogFilters(filters)), filters);
  assert.equal(writeCatalogFilters(catalogDefaults), '');
  assert.deepEqual(readCatalogFilters('?type=arbitrary&pack=unknown&saved=true&sort=bad&availability=no&access=bad'), catalogDefaults);
  assert.equal(readCatalogFilters(`?q=${'a'.repeat(300)}`).q.length, 200);
});

test('combined filters handle ready, planned, free and empty saved states without granting access', () => {
  assert.equal(filterCatalog(catalogDefaults, [], 'en')[0].id, 'A001');
  assert.deepEqual(filterCatalog({ ...catalogDefaults, availability: 'ready' }, [], 'ru').map(material => material.id), ['A001']);
  assert.equal(filterCatalog({ ...catalogDefaults, availability: 'planned' }, [], 'vi').length, 31);
  assert.equal(filterCatalog({ ...catalogDefaults, availability: 'ready', access: 'pro' }, [], 'en').length, 0);
  assert.equal(filterCatalog({ ...catalogDefaults, saved: true }, [], 'en').length, 0);
  assert.deepEqual(filterCatalog({ ...catalogDefaults, saved: true }, ['A001', 'unknown'], 'en').map(material => material.id), ['A001']);
});

test('collection filters honor overlapping grants and accent-insensitive multilingual search', () => {
  for (const pack of catalogPacks) {
    const original = canonical.products.find(entry => entry.id === pack.id)!;
    assert.deepEqual(filterCatalog({ ...catalogDefaults, pack: pack.id }, [], 'en').map(material => material.id).sort(), [...original.item_ids].sort());
  }
  assert.ok(filterCatalog({ ...catalogDefaults, q: 'phan hoi trang thai' }, [], 'vi').some(material => material.id === 'A001'));
  assert.deepEqual(filterCatalog({ ...catalogDefaults, q: 'A001' }, [], 'en').map(material => material.id), ['A001']);
  assert.deepEqual(filterCatalog({ ...catalogDefaults, q: 'контентные вкладки' }, [], 'ru').map(material => material.id), ['C002']);
});

test('the animation category combines motion recipes and effects without losing any material', () => {
  const result = filterCatalog({ ...catalogDefaults, type: 'animation' }, [], 'en');
  assert.equal(result.length, 12);
  assert.equal(result.filter(material => material.type === 'animation').length, 8);
  assert.equal(result.filter(material => material.type === 'effect').length, 4);
  assert.deepEqual(result.map(material => material.id).sort(), [...canonical.animation_item_ids].sort());
});
