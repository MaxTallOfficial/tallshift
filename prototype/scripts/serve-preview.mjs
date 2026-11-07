import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {deploymentPolicy} from './deployment-policy.mjs';
const policy=deploymentPolicy(process.env.PREVIEW_PARENT_ORIGIN??'',process.env.PREVIEW_ORIGIN??'',{local:process.env.PREVIEW_LOCAL==='1'});
const root=resolve('dist-preview');
// The parent origin is compiled into the immutable preview build; a different server setting is unsafe.
const html=await readFile(resolve(root,'index.html'),'utf8');
const script=html.match(/src="([^"]+\.js)"/);
if(!script||!(await readFile(resolve(root,script[1].replace(/^\//,'')),'utf8')).includes(policy.main))throw new Error('Rebuild preview with matching VITE_PREVIEW_PARENT_ORIGIN');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf','.woff2':'font/woff2','.json':'application/json'};
createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; frame-ancestors ${policy.main}; base-uri 'none'; form-action 'none'; object-src 'none'`);
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=(self)');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(pathname.includes('\0')||pathname.includes('\\'))throw new Error('path');
    const file=resolve(root,pathname==='/'?'index.html':pathname.slice(1));
    if(!file.startsWith(root+sep))throw new Error('path');
    if(!(await stat(file)).isFile())throw new Error('file');
    const bytes=await readFile(file);
    res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');
    res.setHeader('Cache-Control',file.endsWith('index.html')?'no-cache':'public, max-age=31536000, immutable');
    res.writeHead(200);res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PREVIEW_PORT??4175),'127.0.0.1',()=>console.log(`Preview listening locally on ${process.env.PREVIEW_PORT??4175}; parent ${policy.main}`));
