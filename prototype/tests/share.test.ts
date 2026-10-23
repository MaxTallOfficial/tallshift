import assert from 'node:assert/strict';
import test from 'node:test';
import { parseShare, shareEnvelope } from '../src/share.ts';
const encode = (value: unknown) => '#' + new URLSearchParams({ share: JSON.stringify(value) });
test('appearance roundtrip fixes recipe version and excludes private context', () => {
  const appearance = { accent: '#7C3AED', motion: 'expressive' as const, duration: 180 };
  assert.deepEqual(parseShare(encode(shareEnvelope(appearance))), appearance);
});
test('unknown, runtime, invalid, oversized and mismatched-version shares are rejected', () => {
  for (const patch of [{ context: 'private' }, { state: 'success' }, { accent: 'url(https://example.invalid)' }, { duration: 481 }, { duration: 1.5 }, { motion: 'auto' }]) {
    assert.equal(parseShare(encode(shareEnvelope(patch))), null);
  }
  assert.equal(parseShare(encode({ ...shareEnvelope({}), itemVersion: '2.0.0' })), null);
  assert.equal(parseShare(encode({ ...shareEnvelope({}), extra: 'no' })), null);
  assert.equal(parseShare('#share=' + 'x'.repeat(4097)), null);
  assert.equal(parseShare('#share=%7B'), null);
});
