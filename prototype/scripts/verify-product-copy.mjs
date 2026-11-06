/** Product copy, localized headings and post-edit layout. Isolated local browser only. */
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {materials} from '../src/product/catalog-data.ts';
import {materialDisplayName} from '../src/product/material-presentation.ts';
import {quotePricingPlan} from '../src/foundations/pricing-quote.ts';
import {buyerScenarioOwnership} from '../src/foundations/buyer-scenario.ts';
import {productCopy} from '../src/product/product-copy.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(resolve(process.env.HALLMARK_PUPPETEER||'.','product-copy-qa.cjs'));
const puppeteer=require('puppeteer-core');
const out=resolve(root,'docs/art-direction-2026/evidence/copy-and-checkout-2026-11-06');mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,protocolTimeout:60000,args:['--disable-background-networking','--disable-sync','--disable-component-update']});
const checks=[],flows=[],inventory=[],errors=[],blockedRequests=[];let passed=false;
const settingsOnly=process.argv.includes('--settings-only');
try {
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());if(u.origin==='http://127.0.0.1:4173'||['data:','blob:','about:'].includes(u.protocol))void r.continue();else{blockedRequests.push(r.url());void r.abort('blockedbyclient');}});
 async function layout(tag) {
  const issues=await page.evaluate(()=>{
   const result=[];if(document.documentElement.scrollWidth>innerWidth+1)result.push('Document overflow');
   for(const el of document.querySelectorAll('.system-shell-main,.pc-material-content,.pc-material-footer,.pc-featured,.pc-filter-row,.tp-workbar,.tp-material-heading,.tp-settings,.tp-mobile-settings,.tp-kit-grid,.tp-planned,.hp-demo,.hp-hero,.hp-flow,.as-offer,.pp-summary,.pp-terms,.ap-panel,.cp-page,.cp-order,.cp-counts,.cp-material-list,button,a.system-button')){
    if(!el.getClientRects().length)continue;if(el.scrollWidth>el.clientWidth+2)result.push(`${el.className}: ${el.scrollWidth}/${el.clientWidth} ${el.textContent?.trim().slice(0,100)}`);
   }
   for(const preview of document.querySelectorAll('.dl-preview'))if(Math.abs(preview.getBoundingClientRect().width-preview.parentElement.clientWidth)>2)result.push('Preview does not fill card');
   return result;
  });
  checks.push({url:page.url(),width:await page.evaluate(()=>innerWidth),tag,issues});assert.equal(issues.length,0,JSON.stringify(checks.at(-1)));
 }
 async function open(path,width=1440,tag='page') {
  await page.setViewport({width,height:900});await page.goto(`http://127.0.0.1:4173${path}`,{waitUntil:'load'});await page.waitForSelector('main h1');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});await layout(tag);
 }
 if(settingsOnly){
  for(const locale of ['ru','en','vi'])for(const width of [320,1440]){
   await open(`/${locale}/library/state-relay`,width,'color-description');
   if(width===320){await page.click('.tp-mobile-settings > button');await page.waitForSelector('dialog[open]');}
   const prefix=width===320?'dialog[open]':'.tp-settings';
   assert.equal(await page.$eval(`${prefix} .sc-field-label`,el=>el.textContent),productCopy[locale].accent);
   assert.equal(await page.$eval(`${prefix} .sc-color-description`,el=>el.textContent),productCopy[locale].accentHelp);
   assert(await page.$eval(`${prefix} .sc-hex-row input`,el=>el.getAttribute('aria-describedby').split(' ').every(id=>!!document.getElementById(id))));
   await page.$eval(`${prefix} .sc-hex-row input`,el=>el.select());await page.type(`${prefix} .sc-hex-row input`,'#D8AAE0');await page.click(`${prefix} .sc-color-apply`);
   await layout('color-description-applied');
   if(width===320)await page.keyboard.press('Escape');
   await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.querySelector('[data-state]'));
   assert.equal(await page.$eval('iframe',el=>getComputedStyle(el.contentDocument.querySelector('[data-state]')).getPropertyValue('--relay-accent').trim()),'#D8AAE0');
  }
  flows.push('Color field: accurate role label, linked explanation and applied indicator color, RU/EN/VI at 320 and 1440');
 }else{
 const paths=['','/library','/library/state-relay','/pricing','/account?tab=saved','/account?tab=purchases','/account?tab=orders','/account?tab=updates','/checkout?plan=product','/checkout?plan=bundle','/missing-page'];
 for(const locale of ['ru','en','vi'])for(const width of [320,390,768,1024,1440])for(const path of paths){
  await open(`/${locale}${path}`,width);
  assert.equal(await page.evaluate(()=>document.documentElement.lang),locale);
  if(path==='/library') {
   const labels=await page.$$eval('.pc-material',els=>els.map(el=>({id:el.dataset.materialId,title:el.querySelector('h2').textContent,lang:el.querySelector('h2').lang})));
   assert.equal(labels.length,32);for(const label of labels){assert.equal(label.title,materialDisplayName(materials.find(m=>m.id===label.id),locale));assert.equal(label.lang,locale);}
   if(width===320){await page.click('.pc-filter-disclosure > summary');await layout('expanded-filters');}
  }
  if(width===1440)inventory.push({locale,path,...await page.$eval('main',el=>({headings:[...el.querySelectorAll('h1,h2,h3')].map(n=>n.textContent),text:el.innerText}))});
  if(locale==='ru'&&[390,1440].includes(width)&&['','/library','/pricing','/checkout?plan=product','/account?tab=purchases'].includes(path))await page.screenshot({path:resolve(out,`${path.split('?')[0].slice(1)||'home'}-${width}.png`)});
  if(checks.length%30===0)console.log(JSON.stringify({progress:checks.length}));
 }
 // Every new public title, including long planned entries, on narrow material pages.
 for(const locale of ['ru','en','vi'])for(const material of materials){
  await open(`/${locale}/library/${material.slug}`,320,'every-title');
  assert.equal(await page.$eval('main h1',el=>el.textContent),materialDisplayName(material,locale));
 }
 for(const locale of ['ru','en','vi'])for(const width of [320,1440]){
  await open(`/${locale}/library/state-relay?view=prompt`,width,'AI-request');
  assert((await page.$eval('.tp-prompt-help',el=>el.textContent)).length>50);
  await page.click('.tp-prompt .system-checkbox');await layout('project-context');
  await page.click('.tp-workbar > button');await page.waitForSelector('dialog[open]');await layout('installation-guide');
  const headings=await page.$$eval('dialog[open] .sy-integration-guide h3',els=>els.map(el=>el.textContent));assert(headings.length>=8);
  await page.keyboard.press('Escape');
  await open(`/${locale}/library/state-relay?view=code`,width,'source');
  if(width===320){await page.click('.tp-mobile-settings > button');await page.waitForSelector('dialog[open]');await layout('settings-sheet');await page.keyboard.press('Escape');}
 }
 flows.push('All 32 functional titles, complete catalogue and every material route in RU/EN/VI; old canonical identities preserved');
 flows.push('AI explanation, optional project context, step-by-step guide and responsive settings available in all locales');
 for(const locale of ['ru','en','vi'])for(const width of [320,1440])for(const buyer of ['new','product','expired','partial'])for(const plan of ['product','bundle']){
  await open(`/${locale}/checkout?plan=${plan}&example=${buyer}`,width,'checkout-examples');
  const quote=quotePricingPlan(plan,buyerScenarioOwnership(buyer));
  const expected=new Intl.NumberFormat(locale,{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(quote.amountMinor/100);
  assert.equal(await page.$eval('.cp-amount',el=>el.textContent),expected);
  assert.equal(Number(await page.$eval('.cp-counts > div:nth-child(2) dd',el=>el.textContent)),quote.missingItemIds.length);
  assert.equal(await page.$$eval('.cp-items li',els=>els.length),quote.kind==='owned'?0:quote.missingItemIds.length);
  if(quote.kind==='owned')assert.equal(await page.$$('.cp-order button').then(els=>els.length),0);else assert(await page.$eval('.cp-order button',el=>el.disabled));
  if(width===320)assert(await page.evaluate(()=>document.querySelector('.cp-order').getBoundingClientRect().top<document.querySelector('.cp-details').getBoundingClientRect().top));
 }
 for(const plan of ['starter','unknown','']) {await open(`/ru/checkout?plan=${plan}`,390,'invalid-selection');assert.equal(await page.$$('.cp-amount').then(els=>els.length),0);}
 await open('/ru/pricing?example=product',390);await page.click('.pp-offers > article:nth-child(3) .as-pro-footer > button');await page.waitForSelector('dialog[open]');
 await page.click('dialog[open] footer a');await page.waitForSelector('.cp-page');assert.equal(new URL(page.url()).search,'?plan=bundle&example=product');
 await page.click('.cp-back');await page.waitForSelector('.pp-page');assert.equal(new URL(page.url()).search,'?example=product');
 flows.push('Checkout: 48 canonical price/ownership examples, repeat payment guard, mobile summary order, invalid selections and pricing roundtrip');
 }
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(blockedRequests.length,0);passed=true;
 console.log(JSON.stringify({passed,cases:checks.length,flows,errors,blockedRequests}));
} finally {writeFileSync(resolve(out,settingsOnly?'settings.json':'checks.json'),JSON.stringify({passed,checks,flows,errors,blockedRequests},null,2));if(!settingsOnly)writeFileSync(resolve(out,'page-text.json'),JSON.stringify(inventory,null,2));await browser.close();}
