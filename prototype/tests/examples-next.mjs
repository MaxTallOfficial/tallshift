/** One real Next production consumer built exclusively from the nine downloadable ZIPs. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer as netServer } from 'node:net';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { strFromU8, unzipSync } from 'fflate';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(resolve(tmpdir(), 'tallshift-next-consumer-'));
const ids = ['A001', 'C001', 'C002', 'E001', 'S003', 'S001', 'S002', 'A003', 'A006'];
const results = [];
let vite, next, browser;
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
const write = async (path, content) => { await mkdir(dirname(resolve(temporary, path)), { recursive: true }); await writeFile(resolve(temporary, path), content); };
function launch(args) {
  const child = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), ...args], { cwd: temporary, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
  return { child, output: () => output, completed: new Promise((done, fail) => { child.once('error', fail); child.once('exit', code => code === 0 ? done() : fail(new Error(`Next exited ${code}\n${output}`))); }) };
}
try {
  vite = await createServer({ root, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  const { materialRecipe } = await vite.ssrLoadModule('/src/product/material-recipes.tsx');
  for (const id of ids) {
    const recipe = materialRecipe(id); assert.ok(recipe, `${id}: connected recipe`);
    const files = unzipSync(await recipe.archive({ locale: 'en', target: 'next', accent: '#C4DB9B', duration: 210, motion: 'subtle' }));
    assert.ok(files['SelectedExample.tsx']);
    for (const [path, bytes] of Object.entries(files)) {
      assert.ok(!path.split('/').includes('..') && !path.startsWith('/'));
      if (/\.(?:tsx?|css)$/.test(path)) assert.doesNotMatch(strFromU8(bytes), /@hugeicons-pro|\?raw|\.\.\/\.\.\/prototype/);
      await write(`recipes/${id}/${path}`, bytes);
    }
    results.push({ id, extractedFromZip: true, nextTarget: true });
  }
  await vite.close(); vite = undefined;
  await symlink(resolve(root, 'node_modules'), resolve(temporary, 'node_modules'), 'dir');
  const installed = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  await write('package.json', JSON.stringify({ private: true, dependencies: Object.fromEntries(['next', 'react', 'react-dom'].map(name => [name, installed.dependencies[name]])) }, null, 2));
  await write('next.config.mjs', 'export default { experimental: { cpus: 1 }, poweredByHeader: false };\n');
  await write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['dom', 'dom.iterable', 'esnext'], strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'preserve', plugins: [{ name: 'next' }] }, include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules'] }));
  await write('app/layout.tsx', "import './host.css'; export default function Layout({children}:{children:React.ReactNode}){return <html lang=\"en\"><head><link rel=\"icon\" href=\"data:,\"/></head><body>{children}</body></html>;}\n");
  await write('app/host.css', 'body{margin:0;padding:24px;background:#151410;color:#edece8;font-family:Arial,sans-serif}main{max-width:1100px;margin:auto;min-width:0}button,input{font:inherit}*{box-sizing:border-box}');
  await write('app/Probe.tsx', "'use client';\nimport {useState} from 'react';\nexport function Probe(){const [count,setCount]=useState(0);return <button id=\"hydration-probe\" type=\"button\" onClick={()=>setCount(x=>x+1)}>Hydrated {count}</button>;}\n");
  await write('app/[id]/page.tsx', ids.map(id => `import ${id} from '../../recipes/${id}/SelectedExample';`).join('\n') + `\nimport {Probe} from '../Probe';\nconst examples={${ids.join(',')}};\nexport function generateStaticParams(){return ${JSON.stringify(ids)}.map(id=>({id}));}\nexport const dynamicParams=false;\nexport default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const Example=examples[id as keyof typeof examples];return <main data-example-id={id}><Probe/><Example/></main>;}\n`);
  console.log('Building one clean Next production consumer with nine ZIP-derived routes…');
  const build = launch(['build', '--webpack']);
  const timer = setTimeout(() => build.child.kill('SIGTERM'), 180000);
  try { await build.completed; } finally { clearTimeout(timer); }
  const port = await new Promise(done => { const socket = netServer(); socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => done(port)); }); });
  const origin = `http://127.0.0.1:${port}`;
  next = launch(['start', '--hostname', '127.0.0.1', '--port', String(port)]);
  next.completed.catch(() => {});
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) { try { if ((await fetch(`${origin}/A001`)).ok) { ready = true; break; } } catch {} await new Promise(done => setTimeout(done, 100)); }
  assert.ok(ready, next.output());
  const require = createRequire(resolve(process.env.HALLMARK_PUPPETEER ?? '/tmp/tallshift-hallmark-runtime', 'next-consumer-qa.cjs'));
  const puppeteer = require('puppeteer-core');
  browser = await puppeteer.launch({ executablePath: process.env.TALLSHIFT_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-background-networking', '--disable-component-update', '--no-first-run', '--disable-sync'] });
  for (const result of results) {
    const response = await fetch(`${origin}/${result.id}`); const html = await response.text();
    assert.equal(response.status, 200); assert.ok(html.includes(`data-example-id="${result.id}"`)); assert.ok(html.replace(/<!--[\s\S]*?-->/g, '').includes('Hydrated 0'));
    assert.ok(/<h[1-4]\b|<button\b/.test(html), `${result.id}: real content in HTTP SSR`);
    const page = await browser.newPage(); const errors = []; const blocked = [];
    await page.setRequestInterception(true);
    page.on('request', request => { const url = request.url(); if (url.startsWith(`${origin}/`) || /^(data:|blob:|about:)/.test(url)) request.continue(); else { blocked.push(url); request.abort(); } });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${origin}/${result.id}`, { waitUntil: 'networkidle0' });
    await page.click('#hydration-probe');
    await page.waitForFunction(() => document.getElementById('hydration-probe')?.textContent === 'Hydrated 1');
    assert.deepEqual(errors, [], `${result.id}: no runtime/hydration errors`); assert.deepEqual(blocked, [], `${result.id}: no remote requests`);
    Object.assign(result, { nextProductionBuild: true, httpSsr: true, hydration: true, runtimeErrors: errors.length, blockedRequests: blocked.length });
    await page.close();
  }
  const report = { passed: true, next: installed.dependencies.next, react: installed.dependencies.react, productionBuilds: 1, cases: results, scope: 'Nine ZIP-only Next App Router pages, real production build, HTTP SSR and browser hydration probe. Detailed item interactions, layout/locales and all framework versions are separate checks.' };
  const out = resolve(root, process.env.TALLSHIFT_NEXT_QA_OUT ?? '../docs/art-direction-2026/evidence/free-stage3-2026-11-07/next-consumer.json');
  await mkdir(dirname(out), { recursive: true }); await writeFile(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  if (next) { next.child.kill('SIGTERM'); await next.completed.catch(() => {}); }
  if (vite) await vite.close();
  await rm(temporary, { recursive: true, force: true });
}
