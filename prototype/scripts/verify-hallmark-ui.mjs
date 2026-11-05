/** Browser regression checks for the 2026-11-05 Hallmark refinement.
 * HALLMARK_PUPPETEER=/path/containing/node_modules node prototype/scripts/verify-hallmark-ui.mjs
 * Uses an existing local standalone server; never contacts production services.
 */
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const from=createRequire(resolve(process.env.HALLMARK_PUPPETEER || '.', 'hallmark-qa.cjs'));
const {default:puppeteer}=await import(pathToFileURL(from.resolve('puppeteer-core')).href);
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const base=process.env.TALLSHIFT_REVIEW_URL || 'http://127.0.0.1:4181/foundations/review.html';
const out=resolve('docs/art-direction-2026/evidence/hallmark-2026-11-05');mkdirSync(out,{recursive:true});
const checks=[];
try {
 const page=await browser.newPage();
 for(const locale of ['en','ru','vi']) {
  for(const width of [320,375,768,1024,1440,1920]) {
   await page.setViewport({width,height:900});
   await page.goto(`${base}?lang=${locale}&view=source`,{waitUntil:'networkidle0'});
   await page.evaluate(()=>document.fonts.ready);
   const geometry=await page.evaluate(()=>{
    const root=document.querySelector('.system-study');
    const active=document.querySelector('#sy-panel-source');
    const other=document.querySelector('#sy-panel-demo');
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,accent:getComputedStyle(root).getPropertyValue('--f-accent').trim().toUpperCase(),font:getComputedStyle(root).fontFamily,hidden:getComputedStyle(other).display,activeHeight:active.getBoundingClientRect().height};
   });
   assert(geometry.scroll<=width+1,`${locale} ${width}: document overflow ${geometry.scroll}`);
   assert.equal(geometry.accent,'#EBD183');assert.match(geometry.font,/Manrope/);
   assert.equal(geometry.hidden,'none');
   if(width>=1024)assert.equal(geometry.activeHeight,740);
   checks.push({locale,width,...geometry,status:'passed'});
  }
 }
 await page.setViewport({width:1440,height:900});
 await page.goto(`${base}?lang=en&view=source`,{waitUntil:'networkidle0'});
 for(let n=0;n<20;n++) {
  await page.keyboard.press('Tab');
  if(await page.evaluate(()=>document.activeElement?.matches('.system-segmented-option input')))break;
 }
 const keyboard=await page.evaluate(()=>{
  const el=document.activeElement;const indicator=el?.nextElementSibling;
  return {input:el?.matches('.system-segmented-option input'),outline:indicator?getComputedStyle(indicator).outlineStyle:null,width:indicator?getComputedStyle(indicator).outlineWidth:null,mode:document.querySelector('.system-study').dataset.inputModality};
 });
 assert.equal(keyboard.input,true);assert.equal(keyboard.outline,'solid');assert.equal(keyboard.width,'2px');assert.equal(keyboard.mode,'keyboard');
 await page.click('.sys-select-trigger');
 await page.keyboard.press('Escape');
 // A pointer event, rather than keyboard Escape, must decide the final pointer state.
 await page.click('.sy-intro h1');
 const pointer=await page.evaluate(()=>document.querySelector('.system-study').dataset.inputModality);
 assert.equal(pointer,'pointer');
 const field=await page.$('.sc-hex-row input');
 if(field){await field.click();const p=await field.evaluate(el=>getComputedStyle(el).outlineStyle);assert.equal(p,'none');await page.keyboard.press('Tab');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');const k=await field.evaluate(el=>getComputedStyle(el).outlineStyle);assert.equal(k,'solid');}
 const shots=[['en','source','#workbench','workbench'],['ru','demo','#controls','controls'],['vi','source','.as-offers','pricing'],['en','demo','#actions','actions'],['en','demo','#roles','roles'],['en','demo','#handoff','handoff'],['ru','demo','.as-comparison','comparison']];
 for(const [locale,view,selector,name] of shots){
  for(const width of [1440,390]){
   await page.setViewport({width,height:900});await page.goto(`${base}?lang=${locale}&view=${view}`,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
   const element=await page.$(selector);assert(element,selector);
   await element.screenshot({path:resolve(out,`${name}-${locale}-${width}.png`)});
  }
 }
 writeFileSync(resolve(out,'browser-checks.json'),JSON.stringify({date:'2026-11-05',checks,keyboard,pointer,scope:'local review UI, no commerce/backend verification'},null,2)+'\n');
 console.log(JSON.stringify({viewports:checks.length,keyboard,pointer,status:'passed'}));
}finally{await browser.close();}
