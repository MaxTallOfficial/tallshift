import assert from 'node:assert/strict';
import test from 'node:test';
import { discoveryMaterials } from '../src/foundations/discovery-data.ts';
import { filterDiscoveryMaterials, type DiscoveryFilters } from '../src/foundations/discovery-filter.ts';

const allIds = ['A001', 'A003', 'S001', 'C001', 'A002', 'E004'];
const defaults: DiscoveryFilters = { query: '', category: 'all', access: [], availability: [] };

function ids(filters: Partial<DiscoveryFilters> = {}) {
  return filterDiscoveryMaterials(discoveryMaterials, { ...defaults, ...filters }).map(material => material.id);
}

test('empty filter groups preserve every sample in canonical order', () => {
  assert.deepEqual(ids(), allIds);
  assert.deepEqual(ids({ query: ' \t\n ' }), allIds);
  assert.deepEqual(filterDiscoveryMaterials([], defaults), []);
});

test('access choices use OR within their group', () => {
  assert.deepEqual(ids({ access: ['free'] }), ['A001', 'A003', 'S001', 'C001']);
  assert.deepEqual(ids({ access: ['pro'] }), ['A002', 'E004']);
  assert.deepEqual(ids({ access: ['pro', 'free'] }), allIds);
});

test('readiness is independent of free or paid access', () => {
  assert.deepEqual(ids({ availability: ['ready'] }), ['A001']);
  assert.deepEqual(ids({ availability: ['planned'] }), ['A003', 'S001', 'C001', 'A002', 'E004']);
  assert.deepEqual(ids({ availability: ['planned', 'ready'] }), allIds);
  assert.deepEqual(ids({ access: ['pro'], availability: ['ready'] }), []);
});

test('category and filter groups intersect without reordering matches', () => {
  assert.deepEqual(ids({ category: 'animation' }), ['A001', 'A003', 'A002']);
  assert.deepEqual(ids({ category: 'animation', access: ['pro'], availability: ['planned'] }), ['A002']);
  assert.deepEqual(ids({ category: 'animation', access: ['free'], availability: ['planned'] }), ['A003']);
});

test('query terms combine with AND and can match different fields', () => {
  assert.deepEqual(ids({ query: ' A001   pending\nretry ' }), ['A001']);
  assert.deepEqual(ids({ query: 'pending cursor' }), []);
  assert.deepEqual(ids({ query: 'a001 missing-term' }), []);
});

test('search covers canonical name, ID, category, pitch and description', () => {
  assert.deepEqual(ids({ query: 'line assemble' }), ['A003']);
  assert.deepEqual(ids({ query: 'e004' }), ['E004']);
  assert.deepEqual(ids({ query: 'effect' }), ['E004']);
  assert.deepEqual(ids({ query: 'headline entrance' }), ['A003']);
  assert.deepEqual(ids({ query: 'two-column' }), ['S001']);
  assert.deepEqual(ids({ query: 'сохраните контекст' }), ['A002']);
});

test('Vietnamese accented, unaccented and NFD queries find the same sample', () => {
  for (const query of ['sao chép', 'sao chep', 'SAO CHÉP'.normalize('NFD')]) {
    assert.deepEqual(ids({ query }), ['A001'], query);
  }
  for (const query of ['ĐẶT GIÁ TRỊ', 'dat gia tri', 'ĐẶT GIÁ TRỊ'.normalize('NFD')]) {
    assert.deepEqual(ids({ query }), ['S001'], query);
  }
});

test('Russian and Vietnamese aliases remain searchable across locale', () => {
  assert.deepEqual(ids({ query: 'КНОПКА' }), ['A001', 'C001']);
  assert.deepEqual(ids({ query: 'СВЯЗАННЫЙ ПЕРЕХОД' }), ['A002']);
  assert.deepEqual(ids({ query: 'trang dich' }), ['S001']);
});

test('query and cross-group filters intersect, including empty matches', () => {
  assert.deepEqual(ids({ query: 'pending', category: 'animation', access: ['free'], availability: ['ready'] }), ['A001']);
  assert.deepEqual(ids({ query: 'nút', category: 'component', access: ['free'], availability: ['planned'] }), ['C001']);
  assert.deepEqual(ids({ query: 'nút', category: 'component', access: ['free'], availability: ['ready'] }), []);
});

test('filtering preserves frozen inputs and returns a fresh array of original records', () => {
  const materials = Object.freeze(discoveryMaterials.map(material => Object.freeze({
    ...material,
    pitch: Object.freeze({ ...material.pitch }),
    description: Object.freeze({ ...material.description }),
    aliases: Object.freeze([...material.aliases]),
  })));
  const filters: DiscoveryFilters = Object.freeze({
    query: '', category: 'animation',
    access: Object.freeze(['free', 'pro'] as const),
    availability: Object.freeze(['ready', 'planned'] as const),
  });
  const snapshot = JSON.stringify({ materials, filters });
  const result = filterDiscoveryMaterials(materials, filters);
  assert.deepEqual(result.map(material => material.id), ['A001', 'A003', 'A002']);
  assert.notEqual(result, materials);
  assert.equal(result[0], materials[0]);
  assert.equal(result[1], materials[1]);
  assert.equal(result[2], materials[4]);
  assert.equal(JSON.stringify({ materials, filters }), snapshot);
});
