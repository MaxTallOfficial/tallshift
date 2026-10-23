import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { libraryStateCollections } from '../src/foundations/library-states-copy.ts';
import { accessProductOffer } from '../src/foundations/access-states-copy.ts';
import { discoveryMaterials } from '../src/foundations/discovery-data.ts';

const catalog = JSON.parse(readFileSync(new URL('../../docs/spec-v1.0/catalog.json', import.meta.url), 'utf8'));
type PlannedProduct = { id: string; title: { en: string }; access: string; item_ids: string[]; price_hypothesis_usd: number };
type PlannedItem = { id: string; access: string; implementation_status: string };

test('collection specimens preserve canonical membership, access and titles', () => {
  for (const collection of libraryStateCollections) {
    const product = catalog.products.find((entry: PlannedProduct) => entry.id === collection.id) as PlannedProduct;
    assert.ok(product, collection.id);
    assert.equal(collection.name, product.title.en);
    assert.equal(collection.access, product.access);
    assert.deepEqual([...collection.ids], product.item_ids);
    assert.equal(new Set(collection.ids).size, collection.ids.length);
  }
});

test('the paid specimen matches the planned offer and cannot advertise live delivery', () => {
  const product = catalog.products.find((entry: PlannedProduct) => entry.id === accessProductOffer.offerId) as PlannedProduct;
  assert.deepEqual([...accessProductOffer.itemIds], product.item_ids);
  assert.equal(accessProductOffer.hypothesisPriceMinor, product.price_hypothesis_usd * 100);
  assert.equal(accessProductOffer.priceStatus, 'planning-hypothesis');
  assert.equal(accessProductOffer.paymentEnabled, false);
  assert.equal(accessProductOffer.sourceAvailable, false);
  for (const id of accessProductOffer.itemIds) {
    const item = catalog.items.find((entry: PlannedItem) => entry.id === id) as PlannedItem;
    assert.equal(item.access, 'pro');
    assert.equal(item.implementation_status, 'not_started');
  }
});

test('sample availability is derived from canonical implementation status', () => {
  for (const material of discoveryMaterials) {
    const item = catalog.items.find((entry: PlannedItem) => entry.id === material.id) as PlannedItem;
    assert.ok(item, material.id);
    assert.equal(material.access, item.access);
    assert.equal(material.available, item.implementation_status === 'local_prototype_verified', material.id);
  }
});
