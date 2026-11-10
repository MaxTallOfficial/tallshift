import {writeFile,readFile} from 'node:fs/promises';
import {deploymentPolicy} from './deployment-policy.mjs';
const policy=deploymentPolicy(process.env.PREVIEW_PARENT_ORIGIN??'',process.env.PREVIEW_ORIGIN??'');
const name=process.env.PREVIEW_WORKER_NAME;
if(!name||!/^tallshift-demo(?:-staging)?$/.test(name))throw new Error('Set PREVIEW_WORKER_NAME to tallshift-demo or tallshift-demo-staging');
const html=await readFile('dist-preview/index.html','utf8');
const script=html.match(/src="([^"]+\.js)"/);
if(!script||!(await readFile(`dist-preview/${script[1].replace(/^\//,'')}`,'utf8')).includes(policy.main))throw new Error('Build with matching VITE_PREVIEW_PARENT_ORIGIN first');
await writeFile('dist-preview/_headers',`/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; frame-ancestors ${policy.main}; base-uri 'none'; form-action 'none'; object-src 'none'
  Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=(self)
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow
`);
await writeFile('wrangler.preview.generated.json',JSON.stringify({name,compatibility_date:'2026-11-10',workers_dev:true,preview_urls:false,assets:{directory:'./dist-preview',not_found_handling:'none'}},null,2)+'\n');
console.log(`Prepared ${name}; parent ${policy.main}; preview ${policy.preview}`);
