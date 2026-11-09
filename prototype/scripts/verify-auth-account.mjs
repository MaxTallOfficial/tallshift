import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(resolve(process.env.HALLMARK_PUPPETEER??'/tmp/tallshift-hallmark-runtime','account-qa.cjs'));
const p=require('puppeteer-core'),origin='http://127.0.0.1:4173',out=resolve('../docs/art-direction-2026/evidence/auth-migration-2026-11-10');
await mkdir(out,{recursive:true});const browser=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run','--disable-sync']});
const cases=[];
try{
 for(const locale of ['en','ru','vi'])for(const width of [390,1440]){
  let signedIn=true;const page=await browser.newPage();await page.setViewport({width,height:1000});await page.setRequestInterception(true);
  page.on('request',r=>{const url=new URL(r.url());if(url.origin===origin&&url.pathname.startsWith('/api/auth/')){const path=url.pathname.slice(10);if(path==='sign-out'||path==='revoke-sessions')signedIn=false;return r.respond({status:200,contentType:'application/json',body:JSON.stringify(path==='get-session'?(signedIn?{user:{id:'fixture-user',email:'fixture@example.invalid',emailVerified:true}}:null):path==='csrf'?{csrfToken:'fixture-token'}:{ok:true})});}if(url.origin===origin||/^(data:|blob:|about:)/.test(url.protocol))r.continue();else r.abort();});
  await page.goto(`${origin}/${locale}/account`,{waitUntil:'networkidle0'});await page.waitForSelector('.au-profile strong');
  assert.equal(await page.$eval('.au-profile strong',e=>e.textContent),'fixture@example.invalid');
  assert.equal(await page.evaluate(()=>document.querySelector('.au-profile-actions').getBoundingClientRect().right<=innerWidth),true);
  if(width===390)await page.screenshot({path:resolve(out,`${locale}-account-${width}.png`),fullPage:true});
  await page.click('.au-profile-actions button:last-child');await page.waitForSelector('.au-profile-actions a[href$="/auth/login"]');
  assert.equal(await page.$('.au-profile strong'),null);
  cases.push({locale,width,logoutAll:true,passed:true});await page.close();
 }
 await writeFile(resolve(out,'account.json'),JSON.stringify({passed:true,cases,scope:'Browser UI with synthetic auth session responses, not real login or revocation evidence.'},null,2)+'\n');console.log(`PASS ${cases.length} account/logout UI cases.`);
}finally{await browser.close();}
