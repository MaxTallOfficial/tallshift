import assert from 'node:assert/strict';
import { test } from 'node:test';
import { heightReporter, previewHeight } from '../preview/preview-height.ts';
import { parsePreviewMessage, previewMessage } from '../src/platform/preview-protocol.ts';

test('preview heights are whole pixels inside the protocol range', () => {
  assert.equal(previewHeight(861), 861);
  assert.equal(previewHeight(120.2), 121);
  assert.equal(previewHeight(12), 120);
  assert.equal(previewHeight(9000), 2400);
  for (const missing of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(previewHeight(missing), 440);
  for (const value of [0, 12, 120.2, 440, 861, 2399.5, 9000, undefined]) {
    const message = previewMessage('RESIZE', 'A006', 'channel-0123456789abcdef', '1', { height: previewHeight(value) });
    assert.ok(parsePreviewMessage(message), `height from ${value} must pass the bridge validation`);
  }
});

test('the reporter sends a synchronous reading once per new height', () => {
  const readings = [440.4, 441, 441, 861, 861, 0];
  const sent: number[] = [];
  const report = heightReporter(() => readings.shift(), height => sent.push(height));
  for (let call = 0; call < 6; call++) report();
  // 440.4 and 441 round to the same whole pixel; repeated readings are not resent.
  assert.deepEqual(sent, [441, 861, 120]);
});

test('the first reading is sent even before any animation frame or resize callback', () => {
  const sent: number[] = [];
  const report = heightReporter(() => 861, height => sent.push(height));
  report();
  assert.deepEqual(sent, [861]);
});
