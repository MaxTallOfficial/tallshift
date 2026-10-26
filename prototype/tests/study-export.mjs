import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { strFromU8, unzipSync } from 'fflate';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { studyArchive, studyFiles, studyPrompt } = await server.ssrLoadModule('/src/study/recipe.ts');
  const mounted = await readFile(new URL('../src/study/AfterlightExample.tsx', import.meta.url), 'utf8');
  const relocated = mounted
    .replace("'../../recipe-exports/state-relay/src/useStateRelay'", "'./src/useStateRelay'")
    .replace("'../../recipe-exports/state-relay/src/createStateRelay'", "'./src/createStateRelay'");
  assert.equal(JSON.parse(studyFiles().find(file => file.path === 'config.json').content).locale, 'en', 'English is the default export language');
  let cases = 0;
  for (const locale of ['en', 'ru', 'vi']) for (const target of ['next', 'vite']) for (const mode of ['preserve', 'adapt']) {
    const config = { locale, target, mode, accent: '#C4DB9B', motion: 'expressive', duration: 210 };
    const archive = await studyArchive(config);
    assert.deepEqual(archive, await studyArchive(config), 'the same selection produces identical ZIP bytes');
    const files = unzipSync(archive);
    const text = path => strFromU8(files[path]);
    const json = path => JSON.parse(text(path));
    assert.equal(text('AfterlightExample.tsx'), relocated, 'exported source is the mounted source with relocated helper imports');
    assert.equal(text('AfterlightExample.module.css'), await readFile(new URL('../src/study/AfterlightExample.module.css', import.meta.url), 'utf8'));
    for (const path of ['src/createStateRelay.ts', 'src/useStateRelay.ts']) {
      assert.equal(text(path), await readFile(new URL(`../recipe-exports/state-relay/${path}`, import.meta.url), 'utf8'));
    }
    assert.equal(files['Example.tsx'], undefined, 'no conflicting alternate UI is exported');
    assert.equal(files['src/StateRelay.module.css'], undefined);
    assert.match(text('SelectedExample.tsx'), /from '\.\/AfterlightExample'/);
    assert.deepEqual(json('config.json'), { locale, motion: 'expressive', accent: '#C4DB9B', duration: 210 });
    assert.equal(json('manifest.json').target, target === 'next' ? 'next-app-router' : 'vite-react-ts');
    assert.equal(json('manifest.json').presentation.status, 'unapproved-visual-study');
    assert.deepEqual([...json('manifest.json').files].sort(), Object.keys(files).sort());
    const index = json('base-bundle.index.json');
    const indexedFiles = [...index.sourceFiles, ...index.generatedFiles, ...index.staticFiles];
    assert.deepEqual(indexedFiles.sort(), Object.keys(files).filter(path => !['INTEGRATION_PROMPT.txt', 'checksums.json'].includes(path)).sort());
    const checksums = json('checksums.json');
    assert.equal(checksums.algorithm, 'SHA-256');
    assert.deepEqual(Object.keys(checksums.files).sort(), Object.keys(files).filter(path => path !== 'checksums.json').sort());
    for (const [path, digest] of Object.entries(checksums.files)) assert.equal(createHash('sha256').update(files[path]).digest('hex'), digest);
    for (const language of ['en', 'ru', 'vi']) for (const prefix of ['INSTALL', 'INTEGRATE', 'README']) {
      assert.ok(files[`${prefix}.${language}.md`], `bundle includes ${prefix}.${language}.md`);
      assert.ok(text(`${prefix}.${language}.md`).length > 200, 'documentation is complete');
    }
    assert.ok(json('config.schema.json').properties.locale.enum.includes('vi'));
    const prompt = text('INTEGRATION_PROMPT.txt');
    assert.equal(prompt, studyPrompt(config));
    assert.ok(prompt.includes(`"locale": "${locale}"`));
    assert.ok(prompt.includes(`"target": "${target}"`));
    const modeLabels = {en:{preserve:'Keep the design',adapt:'Adapt to my project'},ru:{preserve:'Сохранить дизайн',adapt:'Адаптировать под проект'},vi:{preserve:'Giữ nguyên thiết kế',adapt:'Điều chỉnh cho dự án'}};
    assert.ok(prompt.includes(modeLabels[locale][mode]), 'prompt names the selected mode in its language');
    for (const source of studyFiles(config).filter(file => /\.(tsx?|css)$/.test(file.path))) assert.ok(prompt.includes(source.content), `prompt includes ${source.path}`);
    assert.ok(!prompt.includes('FILE: Example.tsx'));
    assert.ok(prompt.includes(text(`INTEGRATE.${locale}.md`)), 'prompt includes the guide in the selected language');
    if (locale === 'vi') {
      assert.match(text('INTEGRATE.vi.md'), /[ạảấầẩẫậắằẳẵặếềểễệỉọốồổỗộớờởỡợứừửữựỳỷỹỵ]/u);
      assert.notEqual(text('INTEGRATE.vi.md'), text('INTEGRATE.en.md'), 'Vietnamese is translated, not an English fallback');
    }
    cases += 1;
  }
  for (const duration of [35,470,480]) {
    const files=studyFiles({locale:'vi',duration});
    assert.equal(JSON.parse(files.find(file=>file.path==='config.json').content).duration,duration);
  }
  const offFiles = studyFiles({ motion: 'off', duration: 200 });
  assert.equal(JSON.parse(offFiles.find(file => file.path === 'config.json').content).duration, 0);
  for (const invalid of [{ accent: '#bad' }, { duration: 481 }, { duration: 2.4 }, { motion: 'auto' }, { locale: 'de' }]) assert.throws(() => studyFiles(invalid));
  assert.throws(() => studyPrompt({ mode: 'unknown' }));
  console.log(JSON.stringify({ scope: 'Afterlight exact preview/source/prompt/ZIP fidelity; not target builds or browser QA', cases, deterministic: true, hashes: 'all files except checksum file itself', result: 'passed' }, null, 2));
} finally {
  await server.close();
}
