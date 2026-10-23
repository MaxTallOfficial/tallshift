import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateRelay } from './src/createStateRelay.ts';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('pending is synchronous; success follows the real Promise, without timers', async () => {
  const controller = createStateRelay('Ready');
  const operation = deferred();
  let called = false;
  const result = controller.run(() => { called = true; return operation.promise; }, { pending: 'Writing', success: 'Written' });
  assert.equal(called, true);
  assert.equal(controller.getSnapshot().state, 'pending');
  await Promise.resolve();
  assert.equal(controller.getSnapshot().state, 'pending');
  operation.resolve(42);
  assert.deepEqual(await result, { status: 'success', value: 42 });
  assert.equal(controller.getSnapshot().statusMessage, 'Written');
});

test('a late success cannot overwrite a newer host error', async () => {
  const controller = createStateRelay();
  const oldOperation = deferred();
  let oldSignal;
  const oldResult = controller.run(signal => { oldSignal = signal; return oldOperation.promise; });
  const current = controller.begin();
  assert.equal(oldSignal.aborted, true);
  assert.equal(controller.settle(current, 'error', 'Current failure'), true);
  oldOperation.resolve('Old success');
  assert.deepEqual(await oldResult, { status: 'stale' });
  assert.equal(controller.getSnapshot().state, 'error');
  assert.equal(controller.getSnapshot().statusMessage, 'Current failure');
  assert.equal(controller.settle(current, 'success'), false);
});

test('operation rejection is handled and cleanup invalidates pending work', async () => {
  const controller = createStateRelay();
  const error = new Error('Denied');
  assert.deepEqual(await controller.run(() => Promise.reject(error), { error: 'Not permitted' }), { status: 'error', error });
  assert.equal(controller.getSnapshot().statusMessage, 'Not permitted');
  const work = deferred();
  const result = controller.run(() => work.promise);
  controller.cancel('Ready again');
  work.reject(error);
  assert.deepEqual(await result, { status: 'stale' });
  assert.equal(controller.getSnapshot().state, 'idle');
  assert.equal(controller.getSnapshot().statusMessage, 'Ready again');
  // Models reusable Strict Mode cleanup followed by the next setup.
  assert.equal((await controller.run(() => 'Next mount')).status, 'success');
});

test('subscribers are removed, instances are isolated, destroy is final', () => {
  const a = createStateRelay();
  const b = createStateRelay();
  let updates = 0;
  const unsubscribe = a.subscribe(() => { updates += 1; });
  const ticket = a.begin();
  assert.equal(updates, 1);
  assert.equal(b.getSnapshot().state, 'idle');
  unsubscribe();
  a.destroy();
  assert.equal(ticket.signal.aborted, true);
  assert.equal(a.settle(ticket, 'success'), false);
  assert.equal(updates, 1);
  assert.throws(() => a.begin(), /destroyed/);
});
