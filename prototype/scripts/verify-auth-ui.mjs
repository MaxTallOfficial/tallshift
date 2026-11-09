import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(resolve(process.env.HALLMARK_PUPPETEER??'/tmp/tallshift-hallmark-runtime','auth-qa.cjs'));
const puppeteer=require('puppeteer-core');
const origin='http://127.0.0.1:4173',out=resolve('../docs/art-direction-2026/evidence/auth-migration-2026-11-10');
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run','--disable-sync']});
const results=[],errors=[];let emailReady=true;const readinessOnly=process.env.AUTH_QA_READINESS_ONLY==='1';
try{
 const page=await browser.newPage();await page.setRequestInterception(true);
 page.on('request',r=>{
  const url=new URL(r.url());
  if(url.origin===origin&&url.pathname.startsWith('/api/auth/')){
   const path=url.pathname.slice('/api/auth/'.length);
   const data=path==='get-session'?null:path==='readiness'?{enabled:true,emailReady}:path==='csrf'?{csrfToken:'synthetic-ui-token'}:path==='sign-in/email'?{code:'INVALID_CREDENTIALS'}:{ok:true};
   return r.respond({status:path==='sign-in/email'?401:200,contentType:'application/json',body:JSON.stringify(data)});
  }
  if(url.origin===origin||/^(data:|blob:|about:)/.test(url.protocol))r.continue();else r.abort();
 });
 page.on('pageerror',e=>errors.push(String(e)));
 if(!readinessOnly)for(const locale of ['en','ru','vi'])for(const width of [320,768,1440])for(const view of ['login','register','forgot-password','reset-password','verify-email']){
  await page.setViewport({width,height:1000});
  await page.goto(`${origin}/${locale}/auth/${view}${view==='reset-password'||view==='verify-email'?'?token='+'a'.repeat(64):''}`,{waitUntil:'networkidle0'});
  await page.waitForSelector('.au-page');
  const geometry=await page.evaluate(()=>({h1:document.querySelector('h1')?.textContent,lang:document.documentElement.lang,overflow:[...document.querySelectorAll('main input,main button,.system-shell-main a,.system-shell-main button')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&r.top>=0&&s.visibility!=='hidden'&&s.display!=='none'&&(r.left< -1||r.right>innerWidth+1);}).map(e=>e.textContent?.trim()||e.id)}));
  assert.ok(geometry.h1);assert.equal(geometry.lang,locale);assert.deepEqual(geometry.overflow,[],`${locale}/${view}/${width} overflow`);
  if(view==='reset-password'||view==='verify-email')assert.equal(new URL(page.url()).searchParams.has('token'),false,'action token removed from address bar');
  if(view==='login'){
   await page.type('#auth-email','fixture@example.invalid');await page.type('#auth-password','Not a real password 2026');await page.click('form button[type=submit]');await page.waitForSelector('.au-error[role=alert]');
  }
  if((width===320&&(view==='register'||view==='login'))||(width===1440&&view==='login'))await page.screenshot({path:resolve(out,`${locale}-${view}-${width}.png`),fullPage:true});
  results.push({locale,view,width,passed:true});
 }
 emailReady=false;
 for(const view of ['login','register','forgot-password','reset-password','verify-email']){
  await page.setViewport({width:390,height:900});
  await page.goto(`${origin}/ru/auth/${view}${view==='reset-password'||view==='verify-email'?'?token='+'a'.repeat(64):''}`,{waitUntil:'networkidle0'});
  await page.waitForSelector('.au-page');
  assert.equal(await page.$eval('form button[type=submit]',e=>e.disabled),view==='register'||view==='forgot-password',`mail unavailable: ${view}`);
  results.push({locale:'ru',view,width:390,emailReady:false,passed:true});
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,readinessOnly?'readiness.json':'ui.json'),JSON.stringify({passed:true,cases:results,runtimeErrors:errors,scope:'Real Vite browser rendering; auth HTTP responses intercepted with synthetic local fixtures. Not real auth/Workers/email/payment evidence.'},null,2)+'\n');
 console.log(`PASS ${results.length} auth cases. Synthetic HTTP fixtures; no real email sent.`);
}finally{await browser.close();}
