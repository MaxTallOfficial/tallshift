import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { unzipSync, strFromU8 } from 'fflate';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createRecipeArchive } = await server.ssrLoadModule('/src/export.ts');
  const { validateRecipeConfig } = await server.ssrLoadModule('/src/recipes/state-relay/index.ts');
  let cases = 0;
  for (const locale of ['en', 'ru', 'vi']) for (const target of ['next', 'vite']) for (const mode of ['preserve', 'adapt']) {
    const options = { locale, target, mode, accent: '#254EDB', motion: 'subtle', duration: 120 };
    const bytes = await createRecipeArchive(options);
    assert.deepEqual(bytes, await createRecipeArchive(options), 'identical inputs must produce identical ZIP bytes');
    const files = unzipSync(bytes);
    const json = path => JSON.parse(strFromU8(files[path]));
    assert.equal(Object.keys(files).length, 23);
    assert.deepEqual(json('config.json'), { locale, accent: '#254EDB', motion: 'subtle', duration: 120 });
    assert.equal(json('manifest.json').target, target === 'next' ? 'next-app-router' : 'vite-react-ts');
    assert.deepEqual([...json('manifest.json').files].sort(), Object.keys(files).sort());
    const checksums = json('checksums.json').files;
    assert.equal(Object.keys(checksums).length, 22);
    for (const [path, digest] of Object.entries(checksums)) assert.equal(createHash('sha256').update(files[path]).digest('hex'), digest);
    for (const path of ['Example.tsx', 'src/createStateRelay.ts', 'src/useStateRelay.ts', 'src/StateRelay.module.css']) {
      assert.deepEqual(Buffer.from(files[path]), await readFile(new URL(`../recipe-exports/state-relay/${path}`, import.meta.url)));
    }
    const prompt = strFromU8(files['INTEGRATION_PROMPT.txt']);
    assert.ok(prompt.includes(`"locale": "${locale}"`));
    assert.ok(prompt.includes(`"target": "${target}"`));
    assert.ok(prompt.includes(mode));
    assert.ok(prompt.includes(strFromU8(files['SelectedExample.tsx'])));
    assert.ok(strFromU8(files[`INSTALL.${locale}.md`]).length);
    if (locale === 'ru' && target === 'vite' && mode === 'preserve') {
      await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
      await writeFile(new URL('../artifacts/A001-state-relay-vite-ru.zip', import.meta.url), bytes);
    }
    cases += 1;
  }
  for (const invalid of [{ accent: '#bad' }, { duration: -1 }, { duration: 481 }, { motion: 'auto' }]) assert.throws(() => validateRecipeConfig(invalid));
  console.log(JSON.stringify({ scope: 'A001 export/prompt roundtrip; not target builds', cases, filesPerZip: 23, hashesPerZip: 22, deterministic: true, result: 'passed' }, null, 2));
} finally {
  await server.close();
}
