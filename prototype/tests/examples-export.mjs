import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, build } from 'vite';
import { strFromU8, unzipSync } from 'fflate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const temporary = await mkdtemp(resolve(tmpdir(), 'tallshift-examples-'));
let cases = 0;
const consumerBuilds = [];
try {
  const { materialRecipe } = await server.ssrLoadModule('/src/product/material-recipes.tsx');
  const { materials } = await server.ssrLoadModule('/src/product/catalog-data.ts');
  for (const material of materials) assert.equal(Boolean(materialRecipe(material.id)), material.available, `${material.id}: catalog readiness matches the connected demo and exporter`);
  for (const [id, slug] of [['C001', 'press-button'], ['C002', 'content-tabs'], ['E001', 'content-reveal'], ['S003', 'starter-action-band']]) {
    const { recipe } = await server.ssrLoadModule(`/src/recipes/${slug}/index.ts`);
    const { Demo } = await server.ssrLoadModule(`/src/recipes/${slug}/Demo.tsx`);
    assert.equal(typeof Demo, 'function');
    for (const locale of ['ru', 'en', 'vi']) for (const target of ['next', 'vite']) for (const mode of ['preserve', 'adapt']) {
      const config = { locale, target, mode, accent: '#C4DB9B', motion: 'expressive', duration: 210, context: 'Project data\n`test` ${notCode} </script>' };
      const bytes = await recipe.archive(config);
      assert.deepEqual(bytes, await recipe.archive(config), 'ZIP is deterministic for the same settings');
      const zipped = unzipSync(bytes);
      const text = path => strFromU8(zipped[path]);
      const json = path => JSON.parse(text(path));
      const sourceFiles = recipe.files(config).filter(file => /\.(tsx?|css)$/.test(file.path));
      for (const file of sourceFiles) {
        assert.equal(text(file.path), file.content, `${id}: code view and ZIP use the same source`);
        assert.ok(recipe.prompt(config).includes(file.content), `${id}: AI request includes ${file.path}`);
        if (file.path !== 'SelectedExample.tsx') {
          const sourcePath = id === 'S003' && file.path.startsWith('vendor/press-button/')
            ? resolve(root, 'src/recipes/press-button', file.path.slice('vendor/press-button/'.length))
            : resolve(root, 'src/recipes', slug, file.path);
          let expected = await readFile(sourcePath, 'utf8');
          if (id === 'S003' && file.path === 'press-button.ts') expected = expected.replaceAll('../press-button/', './vendor/press-button/');
          assert.equal(file.content, expected, `${id}: exact mounted source, with only the declared dependency facade relocation`);
        }
        assert.doesNotMatch(file.content, /@hugeicons-pro|<svg\b|<path\b|https?:\/\//i, 'no private icon paths or remote runtime assets');
        for (const match of file.content.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
          const base = resolve('/', dirname(file.path), match[1]).slice(1);
          assert.ok([base, `${base}.ts`, `${base}.tsx`].some(path => path in zipped), `${file.path}: includes local import ${match[1]}`);
        }
      }
      assert.deepEqual(json('config.json'), { locale, target, ...(id === 'E001' ? {} : { accent: '#C4DB9B' }), duration: 210, motion: 'expressive' });
      assert.equal(text('SelectedExample.tsx').includes('"accent": "#C4DB9B"'), id !== 'E001');
      assert.equal(json('manifest.json').itemId, id);
      if (id === 'E001') assert.ok(zipped[json('manifest.json').animationEntry], 'effect manifest identifies the included animation controller');
      if (id === 'S003') assert.deepEqual(json('manifest.json').bundledItemIds, ['C001']);
      assert.equal(json('manifest.json').target, target === 'next' ? 'next-app-router' : 'vite-react-ts');
      assert.deepEqual([...json('manifest.json').files].sort(), Object.keys(zipped).sort());
      const index = json('base-bundle.index.json');
      assert.deepEqual([...index.sourceFiles, ...index.generatedFiles, ...index.staticFiles].sort(), Object.keys(zipped).filter(path => !['INTEGRATION_PROMPT.txt', 'checksums.json'].includes(path)).sort());
      const checksums = json('checksums.json');
      assert.deepEqual(Object.keys(checksums.files).sort(), Object.keys(zipped).filter(path => path !== 'checksums.json').sort());
      for (const [path, digest] of Object.entries(checksums.files)) assert.equal(createHash('sha256').update(zipped[path]).digest('hex'), digest);
      assert.equal(text('INTEGRATION_PROMPT.txt'), recipe.prompt(config));
      assert.ok(text('INTEGRATION_PROMPT.txt').includes(`CONTEXT_JSON=${JSON.stringify(config.context)}`));
      assert.ok(!text('config.json').includes(config.context));
      for (const language of ['ru', 'en', 'vi']) for (const prefix of ['README', 'INSTALL', 'INTEGRATE']) assert.ok(text(`${prefix}.${language}.md`).length > 400);
      assert.ok(text('INTEGRATION_PROMPT.txt').endsWith(text(`INSTALL.${locale}.md`)));
      cases++;
    }
    for (const invalid of [{ accent: 'url(x)' }, { duration: -1 }, { duration: id === 'E001' ? 601 : 481 }, { duration: 1.5 }, { locale: 'de' }, { target: 'other' }, { motion: 'auto' }]) assert.throws(() => recipe.files(invalid));
    assert.throws(() => recipe.prompt({ mode: 'unknown' }));
    const maximum = id === 'E001' ? 600 : 480;
    assert.equal(JSON.parse(recipe.files({ duration: maximum }).find(file => file.path === 'config.json').content).duration, maximum);
    assert.equal(JSON.parse(recipe.files().find(file => file.path === 'config.schema.json').content).properties.duration.maximum, maximum);
    if (id === 'E001') assert.equal('accent' in JSON.parse(recipe.files().find(file => file.path === 'config.schema.json').content).properties, false);
    assert.equal(JSON.parse(recipe.files({ motion: 'off', duration: 480 }).find(file => file.path === 'config.json').content).duration, 0);
    for (const target of ['next', 'vite']) {
      const consumer = resolve(temporary, `${slug}-${target}`);
      await mkdir(consumer);
      await symlink(resolve(root, 'node_modules'), resolve(consumer, 'node_modules'), 'dir');
      for (const file of recipe.files({ locale: 'vi', target })) {
        await mkdir(dirname(resolve(consumer, file.path)), { recursive: true });
        await writeFile(resolve(consumer, file.path), file.content);
      }
      await writeFile(resolve(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
      await writeFile(resolve(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true, types: ['vite/client'] }, include: ['**/*.tsx', '**/*.ts'] }));
      execFileSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', resolve(consumer, 'tsconfig.json')], { encoding: 'utf8', timeout: 60000 });
      await writeFile(resolve(consumer, 'index.html'), '<html><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
      await writeFile(resolve(consumer, 'main.tsx'), "import React from 'react'; import {createRoot} from 'react-dom/client'; import SelectedExample from './SelectedExample'; createRoot(document.getElementById('root')!).render(<SelectedExample/>);");
      await build({ configFile: false, root: consumer, logLevel: 'error', esbuild: { jsx: 'automatic' }, build: { outDir: 'dist', emptyOutDir: true } });
      consumerBuilds.push({ id, targetConfiguration: target, typecheck: true, viteConsumerBuild: true, nextRuntimeBuild: false });
    }
  }
  console.log(JSON.stringify({ passed: true, cases, consumerBuilds, scope: 'Exact mounted source / AI request / ZIP and independent React consumers. Next configuration is typechecked and bundled with Vite; a real Next.js runtime build is not claimed.' }, null, 2));
} finally {
  await server.close();
  await rm(temporary, { recursive: true, force: true });
}
