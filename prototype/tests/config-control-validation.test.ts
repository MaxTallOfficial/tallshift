import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPROVED_PREVIEW_ACCENT,
  normalizeHexColor,
  previewColorContrast,
  resolveMotionState,
  validateDurationDraft,
} from '../src/foundations/config-control-validation.ts';
import { contrastRatio } from '../src/foundations/tokens.ts';

test('duration accepts both endpoints and every supported step without clamping', () => {
  for (let duration = 0; duration <= 480; duration += 1) {
    assert.deepEqual(validateDurationDraft(String(duration)), { value: duration, error: null });
  }
  assert.deepEqual(validateDurationDraft(' 160 '), { value: 160, error: null });
  assert.deepEqual(validateDurationDraft('-0'), { value: 0, error: null });
});

test('invalid number drafts never yield an applied value', () => {
  for (const [draft, error] of [
    ['', 'required'], ['   ', 'required'], ['oops', 'number'], ['Infinity', 'number'], ['NaN', 'number'],
    ['0x14', 'number'], ['-20', 'range'], ['481', 'range'], ['35.5', 'step'], ['160.5', 'step'], ['0.1', 'step'],
  ] as const) assert.deepEqual(validateDurationDraft(draft), { value: null, error }, draft);
});

test('motion Off takes precedence, then system reduction, without discarding duration', () => {
  assert.deepEqual(resolveMotionState(240, false, false), { reason: 'active', effectiveDuration: 240, controlsDisabled: false });
  assert.deepEqual(resolveMotionState(240, true, false), { reason: 'off', effectiveDuration: 0, controlsDisabled: true });
  assert.deepEqual(resolveMotionState(240, false, true), { reason: 'reduced', effectiveDuration: 0, controlsDisabled: true });
  assert.deepEqual(resolveMotionState(240, true, true), { reason: 'off', effectiveDuration: 0, controlsDisabled: true });
  assert.deepEqual(resolveMotionState(0, false, false), { reason: 'instant', effectiveDuration: 0, controlsDisabled: false });
  assert.throws(() => resolveMotionState(480.5, false, false), RangeError);
  assert.throws(() => resolveMotionState(Number.NaN, true, true), RangeError);
});

test('HEX accepts opaque six- or three-digit colors and returns canonical uppercase', () => {
  assert.equal(normalizeHexColor('  #ebd183  '), APPROVED_PREVIEW_ACCENT);
  assert.equal(normalizeHexColor('#aB3'), '#AABB33');
  assert.equal(normalizeHexColor('#000'), '#000000');
  assert.equal(normalizeHexColor('#fff'), '#FFFFFF');
});

test('HEX rejects incomplete colors, alpha, names and CSS expressions', () => {
  for (const draft of ['', '#', '#EB', '#12345', '#1234567', '#12345678', '#ABCD', 'EBD183', 'gold', 'rgb(0,0,0)', 'var(--f-accent)', '#gggggg', '#fff;background:red']) {
    assert.equal(normalizeHexColor(draft), null, draft);
  }
});

test('preview label mirrors the material foreground and reports its actual ratio', () => {
  for (const color of [APPROVED_PREVIEW_ACCENT, '#777777', '#808000', '#000000', '#FFFFFF', '#121212', '#BB2233']) {
    const preview = previewColorContrast(color);
    const darkRatio = contrastRatio('#101713', color);
    const whiteRatio = contrastRatio('#FFFFFF', color);
    const expected = darkRatio >= 4.5 ? '#101713' : whiteRatio >= 4.5 ? '#FFFFFF' : '#000000';
    assert.equal(preview.foreground, expected, color);
    assert.equal(preview.ratio, contrastRatio(expected, color));
    assert.ok(preview.passes, `${color} must have a normal-text pairing`);
  }
  assert.equal(previewColorContrast('#000000').foreground, '#FFFFFF');
  assert.equal(previewColorContrast('#FFFFFF').foreground, '#101713');
  assert.throws(() => previewColorContrast('transparent'), TypeError);
});

test('normal-text contrast remains valid throughout a representative RGB lattice', () => {
  const channels = [0, 32, 64, 96, 128, 160, 192, 224, 255];
  for (const red of channels) for (const green of channels) for (const blue of channels) {
    const hex = `#${[red, green, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
    assert.ok(previewColorContrast(hex).ratio >= 4.5, hex);
  }
});


test('effect-specific duration limit supports 600 ms while existing controls retain 480 ms', () => {
  assert.deepEqual(validateDurationDraft('600', 600), { value: 600, error: null });
  assert.deepEqual(validateDurationDraft('481', 600), { value: 481, error: null });
  assert.deepEqual(validateDurationDraft('600'), { value: null, error: 'range' });
  assert.deepEqual(validateDurationDraft('601', 600), { value: null, error: 'range' });
  assert.deepEqual(validateDurationDraft('599.5', 600), { value: null, error: 'step' });
});
