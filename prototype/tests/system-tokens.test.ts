import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTokenGraph, systemTokenGraph, resolvedSystemTokens, systemCssVariables, systemCssText } from '../src/foundations/system-tokens.ts';

test('system aliases resolve to the approved color and consistent component roles', () => {
  assert.equal(resolvedSystemTokens['component.button.primary.background'].value, '#EBD183');
  assert.equal(resolvedSystemTokens['component.button.primary.foreground'].value, '#171C1A');
  assert.equal(resolvedSystemTokens['semantic.surface.canvas'].value, '#0D0C09');
  assert.equal(resolvedSystemTokens['component.input.height'].value, '52px');
  assert.equal(resolvedSystemTokens['semantic.control.height.mobile'].value, '48px');
  assert.equal(systemCssVariables['--sy-control-height-mobile'], '48px');
  assert.equal(Object.keys(systemTokenGraph).length, Object.keys(resolvedSystemTokens).length);
  assert.ok(Object.keys(systemTokenGraph).some(key => key.startsWith('primitive.')));
  assert.ok(Object.keys(systemTokenGraph).some(key => key.startsWith('semantic.')));
  assert.ok(Object.keys(systemTokenGraph).some(key => key.startsWith('component.')));
  assert.equal(systemCssVariables['--sy-action-primary-default'], '#EBD183');
  assert.equal(systemCssVariables['--sy-component-button-primary-background'], '#EBD183');
  assert.ok(systemCssText().includes('--f-accent: #EBD183;'));
  assert.ok(!systemCssText().includes('{primitive.'));
});

test('token handoff rejects missing references, cycles, mixed types and partial aliases', () => {
  const color = ($value: string) => ({ $type: 'color' as const, $value, $description: 'Test token' });
  assert.throws(() => resolveTokenGraph({ a: color('{missing}') }), /Unknown token/);
  assert.throws(() => resolveTokenGraph({ a: color('{b}'), b: color('{a}') }), /Token cycle/);
  assert.throws(() => resolveTokenGraph({ a: color('{b}'), b: { $type: 'dimension', $value: '12px', $description: 'Distance' } }), /type mismatch/);
  assert.throws(() => resolveTokenGraph({ a: color('prefix {b}') }), /Invalid token alias/);
  assert.throws(() => resolveTokenGraph({ a: { ...color('#FFFFFF'), $description: '' } }), /Missing token description/);
  assert.throws(() => resolveTokenGraph({ a: color('{__proto__}') }), /Unknown token/);
});
