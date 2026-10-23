import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PALETTE_ID,
  DEFAULT_SAFFRON_SHADE_ID,
  APPROVED_SAFFRON_SHADE_ID,
  baseTokens,
  contrastChecks,
  contrastRatio,
  getTheme,
  getSaffronShade,
  getSaffronTheme,
  palettes,
  saffronContrastChecks,
  saffronShades,
} from '../src/foundations/tokens.ts';
import type { PaletteId, SaffronShadeId } from '../src/foundations/tokens.ts';

test('candidate palettes have the requested accents; the default is Berry', () => {
  assert.deepEqual(palettes.map(({ id, accent }) => ({ id, accent })), [
    { id: 'berry', accent: '#DCA5BC' },
    { id: 'acacia', accent: '#CFD98B' },
    { id: 'clay', accent: '#D9A38A' },
    { id: 'saffron', accent: '#E4C56A' },
  ]);
  assert.equal(DEFAULT_PALETTE_ID, 'berry');
  assert.deepEqual(getTheme(), getTheme('berry'));
});

test('every intended text, control and focus pairing meets its actual contrast threshold', () => {
  for (const { id } of palettes) {
    const theme = getTheme(id);
    assert.ok(Object.values(theme).every((color) => /^#[\da-f]{6}$/i.test(color)), `${id}: opaque hex colors only`);
    const checks = contrastChecks(id);
    assert.equal(checks.length, 49, `${id}: the complete intended pairing set is audited`);
    assert.ok(checks.some(({ minimum }) => minimum === 4.5), 'body text checks exist');
    assert.ok(checks.some(({ minimum }) => minimum === 3), 'control/large-text checks exist');
    for (const check of checks) {
      const measured = contrastRatio(check.foreground, check.background);
      assert.equal(check.ratio, measured, `${id}: ${check.label} reports the measured ratio`);
      assert.equal(check.passes, measured >= check.minimum);
      assert.ok(check.passes, `${id}: ${check.label}: ${measured.toFixed(3)} < ${check.minimum}`);
    }
  }
});

test('each palette changes the whole neutral base while keeping the surface hierarchy', () => {
  const neutralRoles = [
    '--f-canvas', '--f-surface', '--f-raised', '--f-inset',
    '--f-text', '--f-secondary', '--f-muted', '--f-line',
    '--f-control-border', '--f-code-bg', '--f-code-text',
  ];
  for (const role of neutralRoles) {
    assert.equal(new Set(palettes.map(({ id }) => getTheme(id)[role])).size, palettes.length, `${role}: every palette has its own color`);
    assert.equal(baseTokens[role], undefined, `${role}: neutral values do not live in the shared semantic base`);
  }
  for (const palette of palettes) {
    const theme = getTheme(palette.id);
    assert.ok(Object.isFrozen(palette.neutrals), `${palette.id}: palette foundations cannot be mutated`);
    const orderedSurfaces = ['--f-inset', '--f-canvas', '--f-surface', '--f-raised'];
    for (let index = 1; index < orderedSurfaces.length; index++) {
      const previousLuminance = contrastRatio(theme[orderedSurfaces[index - 1]], '#000000');
      const nextLuminance = contrastRatio(theme[orderedSurfaces[index]], '#000000');
      assert.ok(nextLuminance > previousLuminance, `${palette.id}: ${orderedSurfaces[index]} is brighter than ${orderedSurfaces[index - 1]}`);
    }
  }
});

test('palette choice keeps status, focus, syntax and on-accent semantics stable', () => {
  const reference = getTheme('berry');
  for (const { id } of palettes) {
    const theme = getTheme(id);
    assert.deepEqual(Object.keys(theme).sort(), Object.keys(reference).sort());
    for (const [token, value] of Object.entries(baseTokens)) {
      assert.equal(theme[token], value, `${id}: ${token} is independent of palette`);
    }
    assert.ok(contrastRatio(theme['--f-on-accent'], theme['--f-accent']) >= 4.5);
    assert.equal(theme['--f-on-accent'], '#171C1A');
  }
});

test('theme objects are independent and unknown/prototype-like palette IDs are rejected', () => {
  const originalCanvas = getTheme('berry')['--f-canvas'];
  const first = getTheme();
  first['--f-canvas'] = '#FFFFFF';
  assert.equal(getTheme()['--f-canvas'], originalCanvas);
  assert.equal(palettes.find(({ id }) => id === 'berry')?.neutrals['--f-canvas'], originalCanvas);
  assert.equal(Object.getPrototypeOf(getTheme()), Object.prototype);
  for (const value of ['unknown', '__proto__', 'constructor', 'toString', 'Berry', '', 'waterfall']) {
    assert.throws(() => getTheme(value as PaletteId), TypeError);
    assert.throws(() => contrastChecks(value as PaletteId), TypeError);
  }
});

test('contrast uses linearized sRGB and rejects colors needing compositing or guessing', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  assert.equal(contrastRatio('#181F20', '#181f20'), 1);
  assert.equal(contrastRatio('#DCA5BC', '#171C1A'), contrastRatio('#171C1A', '#DCA5BC'));
  // This standard gray is below AA for normal text; do not round 4.478 to 4.5.
  assert.ok(contrastRatio('#777777', '#FFFFFF') < 4.5);
  assert.ok(contrastRatio('#767676', '#FFFFFF') >= 4.5);
  for (const value of ['#FFF', '#FFFFFFFF', 'rgba(0,0,0,.8)', 'transparent', 'red', '#GGGGGG', '111617']) {
    assert.throws(() => contrastRatio(value, '#111617'), TypeError);
    assert.throws(() => contrastRatio('#111617', value), TypeError);
  }
});

test('Saffron shades preserve the original and provide immutable localized comparison choices', () => {
  assert.equal(APPROVED_SAFFRON_SHADE_ID, 'light');
  assert.equal(DEFAULT_SAFFRON_SHADE_ID, APPROVED_SAFFRON_SHADE_ID);
  assert.deepEqual(saffronShades.map(({ id }) => id), ['original', 'light', 'muted', 'gold', 'amber']);
  assert.deepEqual(getSaffronTheme(), getSaffronTheme('light'));
  assert.deepEqual(getSaffronTheme('original'), getTheme('saffron'));
  assert.equal(getSaffronShade().id, 'light');
  assert.ok(Object.isFrozen(saffronShades));
  for (const shade of saffronShades) {
    assert.ok(Object.isFrozen(shade));
    assert.ok(Object.isFrozen(shade.name));
    assert.ok(Object.isFrozen(shade.note));
    for (const locale of ['en', 'ru', 'vi'] as const) {
      assert.ok(shade.name[locale].trim().length > 0, `${shade.id}: ${locale} name exists`);
      assert.ok(shade.note[locale].trim().length > 0, `${shade.id}: ${locale} note exists`);
    }
  }
});

test('every Saffron shade passes the same 49 contrast pairings', () => {
  const originalChecks = contrastChecks('saffron');
  for (const { id } of saffronShades) {
    const theme = getSaffronTheme(id);
    assert.ok(Object.values(theme).every((color) => /^#[\da-f]{6}$/i.test(color)), `${id}: opaque hex colors only`);
    const checks = saffronContrastChecks(id);
    assert.equal(checks.length, 49);
    assert.deepEqual(checks.map(({ label, minimum }) => ({ label, minimum })), originalChecks.map(({ label, minimum }) => ({ label, minimum })));
    for (const check of checks) {
      const ratio = contrastRatio(check.foreground, check.background);
      assert.equal(check.ratio, ratio, `${id}: ${check.label} reports the measured contrast`);
      assert.equal(check.passes, ratio >= check.minimum);
      assert.ok(check.passes, `${id}: ${check.label}: ${ratio.toFixed(3)} < ${check.minimum}`);
    }
  }
});

test('Saffron shade changes keep a single neutral base, semantic colors and syntax', () => {
  const reference = getTheme('saffron');
  const shadeRoles = new Set([
    '--f-accent', '--f-accent-hover', '--f-accent-pressed',
    '--f-selected-bg', '--f-selected-border', '--f-selected-text',
  ]);
  assert.equal(new Set(saffronShades.map(({ accent }) => accent)).size, saffronShades.length, 'every shade has a distinct default accent');
  for (const { id } of saffronShades) {
    const theme = getSaffronTheme(id);
    assert.deepEqual(Object.keys(theme).sort(), Object.keys(reference).sort());
    for (const [token, value] of Object.entries(reference)) {
      if (!shadeRoles.has(token)) assert.equal(theme[token], value, `${id}: ${token} stays on the Saffron base`);
    }
    theme['--f-canvas'] = '#FFFFFF';
    theme['--f-accent'] = '#000000';
    assert.equal(getSaffronTheme(id)['--f-canvas'], reference['--f-canvas'], `${id}: themes are independent objects`);
    assert.notEqual(getSaffronTheme(id)['--f-accent'], '#000000');
  }
});

test('Saffron shade lookup, themes and checks reject unknown and prototype-like IDs', () => {
  for (const value of ['unknown', '__proto__', 'constructor', 'toString', 'Original', '', 'saffron', 'waterfall']) {
    const id = value as SaffronShadeId;
    assert.throws(() => getSaffronShade(id), TypeError);
    assert.throws(() => getSaffronTheme(id), TypeError);
    assert.throws(() => saffronContrastChecks(id), TypeError);
  }
});
