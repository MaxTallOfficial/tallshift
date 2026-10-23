import { readFile, writeFile } from 'node:fs/promises';

const kind = process.argv[2] === 'foundations' ? 'foundations' : 'afterlight';
const directory = new URL(`../../art-direction/${kind}/`, import.meta.url);
let html = await readFile(new URL(`${kind}.html`, directory), 'utf8');
const script = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
const sheet = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
if (!script || !sheet) throw new Error('Missing built study entry');
let css = await readFile(new URL(sheet[1], directory), 'utf8');
const fontPaths = [...css.matchAll(/url\(([^)]+\.ttf)\)/g)].map(match => match[1].replaceAll('"', '').replaceAll("'", ''));
for (const path of fontPaths) {
  const relative = path.startsWith('./') ? path.slice(2) : path;
  const font = await readFile(new URL(relative.startsWith('assets/') ? relative : `assets/${relative}`, directory));
  css = css.replaceAll(path, `data:font/ttf;base64,${font.toString('base64')}`);
}
const js = await readFile(new URL(script[1], directory), 'utf8');
// A data module keeps bundled source strings out of the HTML parser and avoids
// replacement-string expansion of JavaScript sequences such as $& and $`.
html = html.replace(script[0], () => `<script type="module" src="data:text/javascript;base64,${Buffer.from(js).toString('base64')}"></script>`)
  .replace(sheet[0], () => `<style>${css}</style>`);
const licenses = await Promise.all(['Manrope', 'GolosText'].map(name => readFile(new URL(`../../art-direction/assets/fonts/${name}-OFL.txt`, import.meta.url), 'utf8')));
html = html.replace('</head>', `<!-- Self-hosted fonts, OFL notices:\n${licenses.join('\n\n').replaceAll('--', '—')}\n--></head>`);
await writeFile(new URL('review.html', directory), html);
console.log(JSON.stringify({ artifact: `art-direction/${kind}/review.html`, bytes: Buffer.byteLength(html), status: 'unapproved-visual-study' }));
