import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// BETA-19: without host icons the A001 label used to fall into the 37 px icon column and
// split into syllables ("C/op/y/te/xt"). The downloaded SelectedExample.tsx and the isolated
// site preview both render without icons. These are markup and stylesheet checks; the actual
// line wrapping was measured in a real browser (docs/knowledge-base/a001-label-wrap-2026-11-26.ru.md).
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false } });
after(async () => { await server.close(); });
const { AfterlightExample } = await server.ssrLoadModule('/src/study/AfterlightExample.tsx');
const styles: Record<string, string> = (await server.ssrLoadModule('/src/study/AfterlightExample.module.css')).default;
const { studyFiles } = await server.ssrLoadModule('/src/study/recipe.ts');
const stylesheet = await readFile(new URL('../src/study/AfterlightExample.module.css', import.meta.url), 'utf8');

const labels = {
  en: ['Copy text', 'Copying…', 'Text copied', 'Try again'],
  ru: ['Скопировать текст', 'Копируем…', 'Текст скопирован', 'Повторить'],
  vi: ['Sao chép văn bản', 'Đang sao chép…', 'Đã sao chép', 'Thử lại'],
} as const;
const locales = Object.keys(labels) as (keyof typeof labels)[];

/** Declarations of every rule (also inside media and container queries) whose selector list includes `selector`. */
function declarations(selector: string) {
  const source = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').map(item => item.trim()).includes(selector))
    .map(([, , body]) => body.replace(/\s+/g, ' ').trim());
}

test('without host icons the label is the only item in the label row', () => {
  for (const locale of locales) {
    const html = renderToStaticMarkup(createElement(AfterlightExample, { locale }));
    assert.ok(html.includes(`<span class="${styles.buttonContent}" aria-hidden="true"><span class="${styles.labelStack}">`), `${locale}: label stack opens the row`);
    assert.ok(!html.includes(styles.iconStack), `${locale}: no empty icon slot is rendered`);
    for (const label of labels[locale]) assert.ok(html.includes(`>${label}</span>`), `${locale}: state label ${label}`);
  }
});

test('host icons keep their own slot before the label', () => {
  const renderStateIcon = (state: string) => createElement('i', { 'data-state-icon': state });
  for (const locale of locales) {
    const html = renderToStaticMarkup(createElement(AfterlightExample, { locale, renderStateIcon }));
    assert.ok(html.includes(`<span class="${styles.buttonContent}" aria-hidden="true"><span class="${styles.iconStack}">`), `${locale}: icon slot opens the row`);
    assert.equal(html.match(/data-state-icon=/g)?.length, 4, `${locale}: one host icon per state`);
    assert.ok(html.indexOf(styles.iconStack) < html.indexOf(styles.labelStack), `${locale}: label follows the icons`);
  }
});

test('the label row reserves no fixed icon column and never splits words', () => {
  const row = declarations('.buttonContent');
  assert.ok(row.length >= 3, 'base rule plus the narrow media and container rules');
  assert.match(row[0], /display: flex;/, 'icons are optional flex items, not a fixed grid column');
  for (const body of row) assert.doesNotMatch(body, /grid-template-columns/, 'a fixed first column would capture the label when icons are absent');
  assert.match(declarations('.iconStack')[0], /flex: none;/, 'the icon slot keeps its own width only when it is rendered');
  const label = declarations('.labelStack')[0];
  for (const rule of [/flex: 1 1 0;/, /min-width: 0;/, /grid-template-columns: minmax\(0, 1fr\);/]) assert.match(label, rule, 'the label takes the remaining width and may shrink');
  assert.match(declarations('.labelStack > span')[0], /overflow-wrap: break-word;/, 'only a word wider than the whole row may break');
  assert.doesNotMatch(stylesheet, /overflow-wrap:\s*anywhere|word-break:\s*break-(?:all|word)/, 'no rule may split words into syllables');
});

test('at 288 px the hint line plus the label fit two lines (script measures the whole button)', () => {
  // verify-example-labels.mjs counts every text row of the button: the hint line above the label counts too.
  // The label alone wrapping to two lines (BETA-19 check) still made RU 3 lines in total at 288 px.
  for (const body of [...declarations('.labelStack')].slice(1)) assert.match(body, /font-size: (?:2[01]|1\d)px;|font-size: 24px;/);
  const narrow = stylesheet.match(/@media \(max-width: 340px\) \{([^}]*\{[^}]*\}[^}]*)\}/)?.[1] ?? '';
  const container = stylesheet.match(/@container state-relay \(max-width: 300px\) \{([^}]*\{[^}]*\}[^}]*)\}/)?.[1] ?? '';
  for (const rule of [narrow, container]) assert.match(rule, /\.labelStack \{ font-size: 21px;/, 'label drops to 21px on the narrowest widths');
});

test('the downloaded example renders the checked no-icon case with the checked stylesheet', () => {
  for (const locale of locales) {
    const files: { path: string; content: string }[] = studyFiles({ locale });
    const selected = files.find(file => file.path === 'SelectedExample.tsx')!.content;
    assert.match(selected, /<AfterlightExample \{\.\.\.selectedConfig\} \/>/, `${locale}: entry renders the component`);
    assert.doesNotMatch(selected, /renderStateIcon/, `${locale}: the download ships without icons`);
    assert.equal(files.find(file => file.path === 'AfterlightExample.module.css')!.content, stylesheet, `${locale}: shipped stylesheet is the checked one`);
  }
});
