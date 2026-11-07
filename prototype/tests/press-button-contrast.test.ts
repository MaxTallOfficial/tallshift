import assert from 'node:assert/strict';
import test from 'node:test';
import { pressButtonTextColor } from '../src/recipes/press-button/contrast.ts';
import { contrastRatio } from '../src/foundations/tokens.ts';
import { previewColorContrast } from '../src/foundations/config-control-validation.ts';

test('Press Button pairs actual text colors with arbitrary accents at normal-text contrast', () => {
  const channels = [0, 32, 64, 96, 128, 160, 192, 224, 255];
  for (const red of channels) for (const green of channels) for (const blue of channels) {
    const background = `#${[red, green, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
    const foreground = pressButtonTextColor(background);
    assert.ok(contrastRatio(foreground, background) >= 4.5, `${foreground} on ${background}`);
    assert.equal(foreground, previewColorContrast(background).foreground, background);
  }
  for (const background of ['#EBD183', '#777777', '#808000', '#000000', '#FFFFFF']) {
    const foreground = pressButtonTextColor(background);
    assert.ok(contrastRatio(foreground, background) >= 4.5, `${foreground} on ${background}`);
  }
});

test('Press Button contrast helper rejects non-opaque or incomplete colors', () => {
  for (const value of ['#777', '#12345678', 'transparent', 'var(--accent)', '#gggggg', '']) {
    assert.throws(() => pressButtonTextColor(value), TypeError, value);
  }
});
