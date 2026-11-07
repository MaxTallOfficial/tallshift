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


test('appearance links remain bound to each example and preserve the existing A001 format', () => {
  const appearance = { accent: '#EBD183', motion: 'subtle' as const, duration: 160 };
  for (const id of ['A001', 'C001', 'C002'] as const) {
    const hash = encode(shareEnvelope(appearance, id));
    assert.deepEqual(parseShare(hash, id), appearance);
    for (const other of ['A001', 'C001', 'C002'] as const) if (other !== id) assert.equal(parseShare(hash, other), null);
  }
  assert.deepEqual(shareEnvelope(appearance), shareEnvelope(appearance, 'A001'));
});


test('reveal shares use only motion and their own duration limit; section shares keep button limits', () => {
  const appearance = { motion: 'expressive' as const, duration: 600 };
  assert.deepEqual(parseShare(encode(shareEnvelope(appearance, 'E001')), 'E001'), appearance);
  assert.equal(parseShare(encode(shareEnvelope({ duration: 601 }, 'E001')), 'E001'), null);
  assert.equal(parseShare(encode(shareEnvelope({ duration: 600 }, 'S003')), 'S003'), null);
  assert.deepEqual(parseShare(encode(shareEnvelope({ accent: '#EBD183', duration: 480 }, 'S003')), 'S003'), { accent: '#EBD183', duration: 480 });
  const invalid = shareEnvelope({}, 'E001');
  assert.equal(parseShare(encode({ ...invalid, configProjection: { accent: '#EBD183' } }), 'E001'), null);
  assert.equal(parseShare(encode(shareEnvelope(appearance, 'E001')), 'A001'), null);
  assert.equal('accent' in shareEnvelope({ accent: '#EBD183' }, 'E001').configProjection, false);
});
