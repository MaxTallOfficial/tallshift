import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTabId, tabIdentity } from '../src/recipes/content-tabs/tabs-model.ts';

test('content tabs accept bounded unique sections and reject ambiguous or empty identities', () => {
  assert.deepEqual(tabIdentity([{ id: 'overview' }, { id: 'setup' }]), ['overview', 'setup']);
  assert.equal(tabIdentity(Array.from({ length: 6 }, (_, index) => ({ id: String(index) }))).length, 6);
  for (const tabs of [[], [{ id: 'one' }], Array.from({ length: 7 }, (_, index) => ({ id: String(index) }))]) assert.throws(() => tabIdentity(tabs), RangeError);
  for (const tabs of [[{ id: 'one' }, { id: 'one' }], [{ id: 'one' }, { id: ' ' }]]) assert.throws(() => tabIdentity(tabs), TypeError);
});

test('horizontal tabs wrap in either direction, honor boundaries and leave vertical/page navigation alone', () => {
  const ids = ['overview', 'setup', 'settings'];
  assert.equal(nextTabId(ids, 'settings', 'ArrowRight', 'horizontal'), 'overview');
  assert.equal(nextTabId(ids, 'overview', 'ArrowLeft', 'horizontal'), 'settings');
  assert.equal(nextTabId(ids, 'setup', 'Home', 'horizontal'), 'overview');
  assert.equal(nextTabId(ids, 'setup', 'End', 'horizontal'), 'settings');
  for (const key of ['ArrowUp', 'ArrowDown', 'Tab', 'Escape', 'PageDown', 'a']) assert.equal(nextTabId(ids, 'setup', key, 'horizontal'), undefined);
});

test('vertical tabs use up/down rather than hijacking left/right and tolerate a removed current section', () => {
  const ids = ['overview', 'setup'];
  assert.equal(nextTabId(ids, 'overview', 'ArrowUp', 'vertical'), 'setup');
  assert.equal(nextTabId(ids, 'setup', 'ArrowDown', 'vertical'), 'overview');
  assert.equal(nextTabId(ids, 'removed', 'Home', 'vertical'), 'overview');
  assert.equal(nextTabId(ids, 'overview', 'ArrowLeft', 'vertical'), undefined);
  assert.equal(nextTabId(ids, 'setup', 'ArrowRight', 'vertical'), undefined);
  assert.equal(nextTabId([], 'missing', 'ArrowDown', 'vertical'), undefined);
});
