/**
 * `npm run check:design:recipes` — the protected Hallmark check of prototype/src/recipes plus
 * the project review of CSS Modules token blocks (see hallmark-token-blocks.mjs).
 *
 * The pinned checker runs only through the unchanged wrapper scripts/hallmark-offline.mjs
 * (SHA-256 manifest, no network, no inherited secrets). Its raw report is printed first and
 * its own counts are kept in the result. This script never edits sources, the manifest or the skill.
 * TALLSHIFT_QA_OUT=<repo-relative dir> stores the JSON evidence.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPROVED_SAFFRON_SHADE_ID, getSaffronTheme } from '../src/foundations/tokens.ts';
import { classifyTokenFinding, parseSloplintReport } from './hallmark-token-blocks.mjs';

const prototype = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = resolve(prototype, '..');
const target = 'prototype/src/recipes';
const run = spawnSync(process.execPath, [resolve(prototype, 'scripts/hallmark-offline.mjs'), target], { cwd: prototype, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
if (run.error) throw run.error;
process.stdout.write(run.stdout);
process.stderr.write(run.stderr);
if (!/sloplint: /.test(run.stdout)) throw new Error(`The protected checker did not produce a report (exit ${run.status})`);

const { findings, summary } = parseSloplintReport(run.stdout);
const theme = getSaffronTheme(APPROVED_SAFFRON_SHADE_ID);
const sources = new Map();
const reviewed = findings.map(finding => {
  if (finding.grade !== 'FAIL' || finding.gate !== '48') return { ...finding, verified: false, reason: 'outside the token-block review' };
  if (!sources.has(finding.file)) sources.set(finding.file, readFileSync(resolve(repository, finding.file), 'utf8'));
  return { ...finding, ...classifyTokenFinding(finding, sources.get(finding.file), theme) };
});
const declarations = reviewed.filter(item => item.verified);
const open = reviewed.filter(item => !item.verified && ['FAIL', 'REFLEX', 'WAIVER', 'REJECTED'].includes(item.grade));
const warnings = reviewed.filter(item => item.grade === 'WARN');
const result = {
  checker: { skill: 'Hallmark 2.0.0 (pinned by .hallmark/security.json)', entry: 'scripts/hallmark-offline.mjs', target, exitCode: run.status, summary: summary.line, counts: summary.counts, files: summary.files },
  review: {
    rule: 'Rule 48 findings inside CSS Modules token blocks `:root .<root>` (a bare :root is rejected by CSS Modules). Verified per declaration: block-only custom properties, exact literal, consumed by the same module, value equals the approved Saffron value of the --f-* role it replaces or an approved palette value.',
    tokenDeclarations: declarations.length,
    byFile: Object.fromEntries([...new Set(declarations.map(item => item.file))].map(file => [file, declarations.filter(item => item.file === file).length])),
  },
  open: open.map(({ file, grade, gate, line, evidence, reason }) => ({ file, grade, gate, line, evidence, reason })),
  warnings: warnings.map(({ file, gate, line, evidence }) => ({ file, gate, line, evidence })),
  passed: open.length === 0,
};
console.log('\nProject review (scripts/hallmark-token-blocks.mjs):');
console.log(`  Pinned checker, unchanged: ${summary.line}`);
console.log(`  Rule 48 token declarations in CSS Modules blocks, verified: ${declarations.length}`);
for (const item of open) console.log(`  OPEN ${item.grade} ${item.gate} ${item.file}:${item.line} ${item.evidence} — ${item.reason}`);
for (const item of warnings) console.log(`  WARN ${item.gate} ${item.file}:${item.line} ${item.evidence}`);
console.log(`  Open findings: ${open.length} (FAIL ${open.filter(item => item.grade === 'FAIL').length}, REFLEX ${open.filter(item => item.grade === 'REFLEX').length}), WARN ${warnings.length}.`);
if (process.env.TALLSHIFT_QA_OUT) {
  const out = resolve(repository, process.env.TALLSHIFT_QA_OUT);
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'check-design-recipes.json'), JSON.stringify({ generatedAt: new Date().toISOString(), ...result, declarations: declarations.map(({ file, line, evidence, reason }) => ({ file, line, evidence, reason })) }, null, 2) + '\n');
}
process.exitCode = result.passed ? 0 : 1;
