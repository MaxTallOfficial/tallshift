import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { APPROVED_SAFFRON_SHADE_ID, getSaffronTheme } from '../src/foundations/tokens.ts';
import { classifyTokenFinding, parseSloplintReport } from '../scripts/hallmark-token-blocks.mjs';

const theme = getSaffronTheme(APPROVED_SAFFRON_SHADE_ID);
const file = 'prototype/src/recipes/example/Example.module.css';
const finding = (value: string, property: string, line = 3, path = file) => ({ file: path, grade: 'FAIL', gate: '48', line, evidence: `colour literal ${value} outside tokens (${property} on :root .root)` });
const module = (block: string, rest = '') => `/* stamp */\n/* critique */\n:root .root { ${block} }\n.root { ${rest} }\n`;

test('report parser keeps the checker counts and fails closed on drift', () => {
  const report = [
    'prototype/src/recipes/a/A.module.css',
    '  FAIL 48 :3 colour literal #EDECE8 outside tokens (--a-default-text on :root .a) | fix: Lift the value into the token block',
    '  FAIL 48 :3 colour literal #C4C3BF outside tokens (--a-default-secondary on :root .a)',
    'prototype/src/recipes/b/B.module.css',
    '  REFLEX 24b :8 padding: 10px 14px (off the 4px scale) on .demo button | fix: Use the 4px spacing scale',
    '  WARN F3 :5 no text-wrap: balance on any display head',
    'sloplint: 2 FAIL, 1 REFLEX, 1 WARN across 2 file(s).',
  ].join('\n');
  const parsed = parseSloplintReport(report);
  assert.equal(parsed.findings.length, 4);
  assert.deepEqual(parsed.findings.map(item => [item.file, item.grade, item.gate, item.line]), [
    ['prototype/src/recipes/a/A.module.css', 'FAIL', '48', 3],
    ['prototype/src/recipes/a/A.module.css', 'FAIL', '48', 3],
    ['prototype/src/recipes/b/B.module.css', 'REFLEX', '24b', 8],
    ['prototype/src/recipes/b/B.module.css', 'WARN', 'F3', 5],
  ]);
  assert.equal(parsed.findings[0].evidence, 'colour literal #EDECE8 outside tokens (--a-default-text on :root .a)');
  assert.throws(() => parseSloplintReport(report.replace('2 FAIL', '3 FAIL')), /Parsed 2 FAIL/);
  assert.throws(() => parseSloplintReport(report.split('\n').slice(0, -1).join('\n')), /summary line not found/);
  assert.throws(() => parseSloplintReport('  FAIL 48 :1 colour literal #FFFFFF outside tokens (--x on :root .x)\nsloplint: 1 FAIL across 1 file(s).'), /without a file header/);
});

test('a scoped default equal to the approved host role is a token declaration', () => {
  const css = module('--x-default-text: #EDECE8; --x-default-line: #3E3D39;', '--x-text: var(--f-text, var(--x-default-text)); --x-line: var(--f-line, var(--x-default-line)); color: var(--x-text);');
  assert.deepEqual(classifyTokenFinding(finding('#EDECE8', '--x-default-text'), css, theme), { verified: true, reason: 'default of --f-text', role: '--f-text', value: '#EDECE8' });
  const multiline = '/* a */\n/* b */\n:root .root {\n  --x-default-accent: #EBD183;\n}\n.root { --x-accent: var(--x-custom, var(--x-default-accent)); }\n';
  assert.equal(classifyTokenFinding(finding('#EBD183', '--x-default-accent', 4), multiline, theme).verified, true, 'plain var() needs an approved palette value');
});

test('defaults that would make the bundle differ from the hosted demo stay FAIL', () => {
  // The three real defects found on 26.11.2026 before the fix.
  const surface = module('--x-default-surface: #1E1D19;', '--x-surface: var(--f-surface, var(--x-default-surface));');
  assert.match(classifyTokenFinding(finding('#1E1D19', '--x-default-surface'), surface, theme).reason, /differs from the approved --f-surface #161512/);
  const onAccent = module('--x-default-on-accent: #17150F;', '--x-on-accent: var(--f-on-accent, var(--x-default-on-accent));');
  assert.match(classifyTokenFinding(finding('#17150F', '--x-default-on-accent'), onAccent, theme).reason, /differs from the approved --f-on-accent #171C1A/);
  const focusFromAccent = module('--x-default-accent: #EBD183;', '--x-accent: var(--x-custom, var(--x-default-accent)); --x-focus: var(--f-focus, var(--x-default-accent));');
  assert.match(classifyTokenFinding(finding('#EBD183', '--x-default-accent'), focusFromAccent, theme).reason, /differs from the approved --f-focus/);
  const offPalette = module('--x-default-accent: #FF00AA;', '--x-accent: var(--x-default-accent);');
  assert.match(classifyTokenFinding(finding('#FF00AA', '--x-default-accent'), offPalette, theme).reason, /not an approved palette value/);
});

test('only the exact scoped token-block shape is reviewed', () => {
  const consumed = '--x-text: var(--f-text, var(--x-default-text));';
  const cases: Array<[string, ReturnType<typeof finding>, RegExp]> = [
    [module('--x-default-text: #EDECE8; color: #EDECE8;', consumed), finding('#EDECE8', '--x-default-text'), /non-token declaration: color/],
    [module('--x-default-text: #EDECE8;'), finding('#EDECE8', '--x-default-text'), /never consumed/],
    [module('--x-default-text: #C4C3BF;', consumed), finding('#EDECE8', '--x-default-text'), /not exactly #EDECE8/],
    [module('--x-default-other: #EDECE8;', consumed), finding('#EDECE8', '--x-default-text'), /not declared in the block/],
    ['/* a */\n/* b */\n.root { --x-default-text: #EDECE8; }\n.root { --x-text: var(--x-default-text); }\n', finding('#EDECE8', '--x-default-text'), /not a scoped token block: \.root/],
    ['/* a */\n/* b */\n:root .root, .other { --x-default-text: #EDECE8; }\n.root { --x-text: var(--x-default-text); }\n', finding('#EDECE8', '--x-default-text'), /not a scoped token block/],
    ['/* a */\n/* b */\n@media (min-width: 1px) { :root .root { --x-default-text: #EDECE8; } }\n.root { --x-text: var(--x-default-text); }\n', finding('#EDECE8', '--x-default-text'), /not a scoped token block: @media/],
    ['/* a */\n/* b */\n:root .root { --x-default-text: #EDECE8; }\n.other { --x-text: var(--x-default-text); }\n', finding('#EDECE8', '--x-default-text'), /no top-level \.root rule/],
    [module('--x-default-text: #EDECE8;', consumed), finding('#EDECE8', '--x-default-text', 3, 'prototype/src/product/Example.module.css'), /not a recipe CSS Module/],
    [module('--x-default-text: #EDECE8;', consumed), finding('#EDECE8', '--x-default-text', 3, 'prototype/src/recipes/example/tokens.css'), /not a recipe CSS Module/],
    [module('--x-default-text: #EDECE8;', consumed), finding('#EDECE8', '--x-default-text', 4), /not a scoped token block: \.root/],
    [module('--x-default-text: #EDECE8;', '--x-text: var(--f-unknown, var(--x-default-text));'), finding('#EDECE8', '--x-default-text'), /not an approved host role/],
  ];
  for (const [css, item, reason] of cases) {
    const result = classifyTokenFinding(item, css, theme);
    assert.equal(result.verified, false, String(reason));
    assert.match(result.reason, reason);
  }
  assert.match(classifyTokenFinding({ ...finding('#EDECE8', '--x-default-text'), grade: 'REFLEX' }, module('--x-default-text: #EDECE8;', consumed), theme).reason, /not a rule 48 FAIL/);
  assert.match(classifyTokenFinding({ ...finding('#EDECE8', '--x-default-text'), evidence: 'font-family literal "Inter" on .root' }, module('--x-default-text: #EDECE8;', consumed), theme).reason, /not a colour literal finding/);
});

test('every shipped recipe default reproduces the approved colours of the hosted demo', () => {
  const recipes = resolve(dirname(fileURLToPath(import.meta.url)), '../src/recipes');
  let declarations = 0;
  for (const folder of readdirSync(recipes)) {
    let names: string[];
    try { names = readdirSync(resolve(recipes, folder)).filter(name => name.endsWith('.module.css')); } catch { continue; }
    for (const name of names) {
      const css = readFileSync(resolve(recipes, folder, name), 'utf8');
      assert.doesNotMatch(css, /(^|\n)\s*:root\s*\{/, `${folder}/${name}: CSS Modules cannot use a bare :root`);
      const lines = css.split('\n');
      for (const [index, line] of lines.entries()) {
        for (const match of line.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
          if (!/^:root\s+\./.test(lines.slice(0, index + 1).reverse().find(text => /\{/.test(text))?.trim() ?? '')) continue;
          const result = classifyTokenFinding({ file: `prototype/src/recipes/${folder}/${name}`, grade: 'FAIL', gate: '48', line: index + 1, evidence: `colour literal ${match[2]} outside tokens (${match[1]} on :root)` }, css, theme);
          assert.equal(result.verified, true, `${folder}/${name}:${index + 1} ${match[1]} — ${result.reason}`);
          declarations++;
        }
      }
    }
  }
  assert.ok(declarations >= 50, `reviewed ${declarations} shipped token declarations`);
});
