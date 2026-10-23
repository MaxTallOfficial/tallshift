import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateRelay } from '../recipe-exports/state-relay/src/createStateRelay.ts';
import '../recipe-exports/state-relay/controller.test.mjs';

test('synchronous host exceptions publish an error and allow retry', async () => {
  const relay = createStateRelay('Ready');
  const failure = new Error('Synchronous failure');
  const result = await relay.run(() => { throw failure; }, { error: 'Failed' });
  assert.deepEqual(result, { status: 'error', error: failure });
  assert.equal(relay.getSnapshot().state, 'error');
  assert.equal(relay.getSnapshot().statusMessage, 'Failed');
  assert.deepEqual(await relay.run(() => 'Saved', { success: 'Done' }), { status: 'success', value: 'Saved' });
  assert.equal(relay.getSnapshot().statusMessage, 'Done');
});

test('an abort handler cannot settle the replaced request', () => {
  const relay = createStateRelay();
  const first = relay.begin('First');
  let staleAccepted;
  first.signal.addEventListener('abort', () => {
    staleAccepted = relay.settle(first, 'success', 'Late first result');
  });
  const second = relay.begin('Second');
  assert.equal(staleAccepted, false);
  assert.equal(relay.getSnapshot().state, 'pending');
  assert.equal(relay.getSnapshot().statusMessage, 'Second');
  assert.equal(relay.settle(second, 'success', 'Current result'), true);
  assert.equal(relay.getSnapshot().statusMessage, 'Current result');
});
