import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false } });
after(() => server.close());
const { materials } = await server.ssrLoadModule('/src/product/catalog-data.ts');
const { materialDisplayName } = await server.ssrLoadModule('/src/product/material-presentation.ts');
const { materialRecipe } = await server.ssrLoadModule('/src/product/material-recipes.tsx');
const generated = ['C001', 'C002', 'E001', 'S003', 'S001', 'S002', 'A003', 'A006'];

test('the AI request names each example exactly as its page does, in every language', () => {
  for (const id of generated) for (const locale of ['en', 'ru', 'vi'] as const) {
    const material = materials.find((item: { id: string }) => item.id === id);
    const name = materialDisplayName(material, locale);
    const firstLine = materialRecipe(id).prompt({ locale }).split('\n')[0];
    assert.ok(firstLine.includes(`${name} (${material.name}, ${id})`), `${id} ${locale}: “${name}” in “${firstLine.slice(0, 120)}”`);
  }
});

test('each new Free guide starts with the same public name, canonical name and ID', () => {
  for (const id of ['S001', 'S002', 'A003', 'A006']) for (const locale of ['en', 'ru', 'vi'] as const) {
    const material = materials.find((item: { id: string }) => item.id === id);
    const guide = materialRecipe(id).files({ locale }).find((file: { path: string }) => file.path === `INSTALL.${locale}.md`).content;
    assert.ok(guide.startsWith(`# ${materialDisplayName(material, locale)} (${material.name}, ${id}) — `), `${id} ${locale}: ${guide.split('\n')[0]}`);
  }
});
