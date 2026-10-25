import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { systemCoverage } from '../src/foundations/system-registry.ts';

test('coverage tracks specimens separately from shared APIs and release approval', () => {
  assert.equal(systemCoverage.length, 45);
  assert.equal(new Set(systemCoverage.map(item => item.id)).size, 45);
  const directory = new URL('../src/foundations/', import.meta.url);
  const entry = readFileSync(new URL('index.ts',directory),'utf8');
  const sources = readdirSync(directory).filter(name => name.endsWith('.tsx'))
    .map(name => readFileSync(new URL(name, directory), 'utf8')).join('\n');
  for (const item of systemCoverage) {
    assert.equal(item.status, 'review-specimen');
    assert.equal(item.visualApproval, 'pending');
    assert.equal(item.releaseVerification, 'pending');
    if (item.api) {
      assert.match(entry,new RegExp(`export\\s*\\{[^}]*\\b${item.api}\\b`), `${item.api} missing from library entry`);
      assert.match(sources, new RegExp(`export (?:function|const) ${item.api}(?:[<(\\s=:])`), item.name);
    } else {
      assert.equal(item.implementation, 'local-specimen', item.name);
    }
  }
  assert.ok(systemCoverage.every(item => item.implementation === 'shared-api'));
  assert.equal(new Set(systemCoverage.map(item=>item.api)).size,45);
});
