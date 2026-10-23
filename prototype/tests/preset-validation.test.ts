import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePresetName, validatePresetName } from '../src/foundations/preset-validation.ts';

test('validation returns the NFC-normalized, trimmed name used for storage', () => {
  const result = validatePresetName('  Ca\u0300 phe\u0302  ');
  assert.equal(result.error, null);
  assert.equal(result.name, 'Cà phê');
  assert.equal(result.name.normalize('NFC'), result.name);
  assert.equal(normalizePresetName('  Ca\u0300 phe\u0302  '), result.name);
});

test('duplicate detection treats NFC, NFD and case variations as the same name', () => {
  assert.equal(validatePresetName('Ca\u0300 phe\u0302', ['Cà phê']).error, 'nameDuplicate');
  assert.equal(validatePresetName('CÀ PHÊ', ['  Ca\u0300 phe\u0302  ']).error, 'nameDuplicate');
  assert.equal(validatePresetName('Cà phê sáng', ['Cà phê']).error, null);
});

test('the minimum length counts visible graphemes, including stacked Vietnamese marks', () => {
  const letter = 'a\u0306\u0301';
  assert.equal(Array.from(letter).length, 3, 'the decomposed input contains three code points');
  assert.equal(validatePresetName(letter).error, 'nameShort');
  assert.equal(validatePresetName(letter.repeat(2)).error, 'nameShort');
  assert.equal(validatePresetName(letter.repeat(3)).error, null);
  assert.equal(validatePresetName(' \n\t ').error, 'nameRequired');
});

test('the 40-grapheme limit accepts combining marks and joined emoji without a UTF-16 cutoff', () => {
  for (const grapheme of ['a\u0306\u0301', '👩🏽‍💻']) {
    const forty = validatePresetName(grapheme.repeat(40));
    assert.equal(forty.error, null);
    assert.equal(validatePresetName(grapheme.repeat(41)).error, 'nameLong');
  }
});
