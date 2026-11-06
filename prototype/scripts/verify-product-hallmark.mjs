import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(resolve(process.env.HALLMARK_PUPPETEER || '.', 'product-qa.cjs'));
const puppeteer=require('puppeteer-core');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--disable-sync','--disable-component-update']});
const out=resolve('../docs/art-direction-2026/evidence/product-hallmark-2026-11-05');
mkdirSync(out,{recursive:true});
const checks=[];
try {
 const page=await browser.newPage();
 // Product content stays local. Remote redirects, images, fonts and API calls are denied.
 const blockedRequests=[];
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.origin==='http://127.0.0.1:4173'||['data:','blob:','about:'].includes(url.protocol))void request.continue();
  else {blockedRequests.push(request.url());void request.abort('blockedbyclient');}
 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const locale of ['en','ru','vi']) for(const width of [320,390,768,1440]) for(const slug of ['', '/state-relay','/starter-split-hero']) {
  await page.setViewport({width,height:900});
  await page.goto(`http://127.0.0.1:4173/${locale}/library${slug}`,{waitUntil:'networkidle0'});
  await page.evaluate(()=>document.fonts.ready);
  const state=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,lang:document.documentElement.lang,accent:getComputedStyle(document.querySelector('[data-tallshift-theme]')).getPropertyValue('--f-accent').trim(),tabs:document.querySelectorAll('[role=tab]').length}));
  assert(state.scroll<=width+1,JSON.stringify({locale,slug,...state}));
  assert.equal(state.lang,locale);assert.equal(state.accent,'#EBD183');
  assert.equal(state.tabs,slug==='/state-relay'?3:0);
  checks.push({locale,slug,...state});
  if(locale==='ru'&&[390,1440].includes(width)) {
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:resolve(out,`${slug.slice(1)||'catalog'}-${width}.png`)});
  }
 }
 await page.setViewport({width:1440,height:900});
 await page.goto('http://127.0.0.1:4173/ru/library',{waitUntil:'networkidle0'});
 for(let i=0;i<15;i++) {await page.keyboard.press('Tab');if(await page.evaluate(()=>document.activeElement?.matches('.tp-language-trigger')))break;}
 const keyboard=await page.evaluate(()=>({mode:document.querySelector('[data-input-modality]').dataset.inputModality,languageControl:document.activeElement?.matches('.tp-language-trigger'),ring:getComputedStyle(document.activeElement).outlineStyle}));
 assert.equal(keyboard.languageControl,true);assert.equal(keyboard.mode,'keyboard');assert.equal(keyboard.ring,'solid');
 await page.keyboard.press('ArrowDown');await page.waitForSelector('[role=menu]');await page.keyboard.press('Escape');
 await page.click('.pc-filter-disclosure > summary');
 assert(await page.$eval('.pc-filter-disclosure',el=>el.open));
 await page.click('.system-checkbox');
 assert.equal((await page.$$('.pc-material')).length,0);
 const checkboxRing=await page.$eval('.system-checkbox-box',el=>getComputedStyle(el).outlineStyle);
 assert.equal(checkboxRing,'none');
 await page.keyboard.press('Tab');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
 assert.equal(await page.$eval('.system-checkbox-box',el=>getComputedStyle(el).outlineStyle),'solid');
 await page.goto('http://127.0.0.1:4173/ru/library/state-relay',{waitUntil:'networkidle0'});
 await page.type('.sc-hex-row input','x');
 assert(await page.$eval('.tp-settings .system-download-action button',el=>el.disabled));
 await page.setViewport({width:390,height:900});
 await page.click('.tp-mobile-settings > button');
 assert(await page.$eval('dialog[open] .sc-hex-row input',el=>el.value.endsWith('x')));
 await page.keyboard.press('Escape');assert.equal(await page.$$('dialog[open]').then(x=>x.length),0);
 assert.equal(errors.length,0,errors.join('\n'));
 assert.equal(blockedRequests.length,0,'Unexpected external resource requested');
 writeFileSync(resolve(out,'checks.json'),JSON.stringify({checks,keyboard,checkboxRing,errors,blockedRequests,requestPolicy:'Only http://127.0.0.1:4173, data, blob and about; remote requests aborted',interactionChecks:'filter disclosure, empty favorites, pointer/keyboard rings, draft blocking and responsive persistence, Escape'},null,2));
 console.log(JSON.stringify({responsive:checks.length,keyboard,errors,output:out}));
} finally {await browser.close();}
