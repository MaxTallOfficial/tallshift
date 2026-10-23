import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const prototype=fileURLToPath(new URL('..',import.meta.url));
const root=path.resolve(prototype,'..'),fixture=path.join(prototype,'.qa/system-consumer');
const evidence=path.join(root,'docs/art-direction-2026/evidence/foundations-10');
const results=[];
async function run(command,args,cwd=prototype) {
 const started=Date.now();await new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${command} ${args.join(' ')} exited ${code}`)));});
 results.push({command,args,cwd:path.relative(root,cwd),passed:true,durationMs:Date.now()-started});
}
await run('npm',['run','build:system']);
await run('npm',['pack',path.join(root,'packages/tallshift-ui'),'--pack-destination',path.join(root,'packages/tallshift-ui')]);
await mkdir(fixture,{recursive:true});
await cp(path.join(prototype,'fixtures/system-consumer'),fixture,{recursive:true,force:true});
await run('npm',['install','--no-audit','--no-fund','--force',path.join(root,'packages/tallshift-ui/tallshift-ui-0.1.0.tgz')],fixture);
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const bundleHash=await hash(path.join(root,'packages/tallshift-ui/dist/index.js'));
if(bundleHash!==await hash(path.join(fixture,'node_modules/@tallshift/ui/dist/index.js')))throw new Error('Installed package differs from current library bundle');
await run(path.join(fixture,'node_modules/.bin/next'),['build','--webpack'],fixture);
await run(path.join(prototype,'node_modules/.bin/vite'),['build',fixture,'--outDir','dist-vite','--emptyOutDir']);
await mkdir(evidence,{recursive:true});
await writeFile(path.join(evidence,'consumer-builds.json'),JSON.stringify({scope:'Installed local tgz in independent Next.js and Vite consumer, type checking and production builds; runtime browser checks recorded separately',node:process.version,next:'16.4.3',react:'19.3.1',bundleHash,tarballHash:await hash(path.join(root,'packages/tallshift-ui/tallshift-ui-0.1.0.tgz')),results},null,2)+'\n');
