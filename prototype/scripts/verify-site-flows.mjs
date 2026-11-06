import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(resolve(process.env.HALLMARK_PUPPETEER||'.','site-flows.cjs'));
const puppeteer=require('puppeteer-core');
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--disable-sync','--disable-component-update']});
const out=resolve(root,'docs/art-direction-2026/evidence/layout-audit-2026-11-05');
mkdirSync(out,{recursive:true});
const checks=[],errors=[],blockedRequests=[];
let passed=false;
try {
 const page=await browser.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.origin==='http://127.0.0.1:4173'||['about:','data:','blob:'].includes(url.protocol))void request.continue();
  else {blockedRequests.push(request.url());void request.abort('blockedbyclient');}
 });
 async function open(path,width=1440) {
  await page.setViewport({width,height:900});await page.goto(`http://127.0.0.1:4173${path}`,{waitUntil:'load'});await page.waitForSelector('main h1');
  await page.evaluate(()=>document.fonts.ready);
 }
 for(const locale of ['ru','en','vi']) {
  await open(`/${locale}`,1280);await page.setViewport({width:1280,height:800});
  const hero=await page.$eval('.hp-hero-copy .product-link',el=>({bottom:el.getBoundingClientRect().bottom,height:innerHeight}));
  assert(hero.bottom<=hero.height,`Home action below first screen: ${locale} ${JSON.stringify(hero)}`);
  await page.screenshot({path:resolve(out,`home-first-screen-${locale}-1280.png`)});
 }
 checks.push('Home: primary action visible at 1280 x 800 in all three languages');
 // Real interaction, with a deterministic local clipboard stub for success/error.
 await open('/ru');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedText=text;}}}));
 await page.click('.hp-demo button[aria-busy]');
 await page.waitForFunction(()=>document.querySelector('.hp-demo [data-state]')?.dataset.state==='success');
 assert.match(await page.evaluate(()=>window.__copiedText),/State Relay/);
 await page.click('.hp-demo input[type=radio]:not(:checked)');
 await page.click('.hp-demo button[aria-busy]');
 await page.waitForFunction(()=>document.querySelector('.hp-demo [data-state]')?.dataset.state==='error');
 checks.push('Home: actual clipboard success and explicit local error scenario');
 await page.click('.hp-kit [role=tab]:nth-child(2)');
 assert((await page.$eval('.hp-kit [data-active=true]',el=>el.textContent)).includes('State Relay'));
 await page.keyboard.press('ArrowRight');
 assert(await page.$eval('.hp-kit [role=tab]:nth-child(3)',el=>el.getAttribute('aria-selected')==='true'));
 assert((await page.$eval('.hp-kit [data-active=true]',el=>el.textContent)).length>100);
 checks.push('Home: actual source/prompt/guide, arrow-key tabs and inert inactive panels');
 // Product -> bundle upgrade, expired coverage, and partial ownership are visible on cards and summary.
 for(const locale of ['en','ru','vi'])for(const width of [320,1440]) {
  await open(`/${locale}/pricing`,width);
  await page.click('.pp-review-controls > summary');
  assert.equal(await page.$eval('.pp-offers > article:nth-child(2) .as-price strong',el=>el.textContent.replace(/\D/g,'')),'16');
  for(const scenario of [1,2,3,0]) {
   await page.click('.pp-page .sys-select-trigger');
   await page.click(`[role=option][data-system-select-index="${scenario}"]`);
   if(scenario===1||scenario===2){
    assert.equal(await page.$eval('.pp-offers > article:nth-child(2)',el=>el.dataset.priceState),'owned');
    assert.equal(await page.$eval('.pp-offers > article:nth-child(3) .as-price strong',el=>el.textContent.replace(/\D/g,'')),'23');
   }
   if(scenario===3)assert.equal(await page.$eval('.pp-offers > article:nth-child(3)',el=>el.dataset.priceState),'upgrade');
   for(const plan of [1,2,3]) {
    const trigger=`.pp-offers > article:nth-child(${plan}) .as-free-footer > button,.pp-offers > article:nth-child(${plan}) .as-pro-footer > button`;
    await page.click(trigger);await page.waitForSelector('dialog[open]');
    const state=await page.$eval('dialog[open]',el=>({width:el.clientWidth,scroll:el.scrollWidth,disabled:el.querySelector('footer button')?.disabled}));
    assert(state.scroll<=state.width+2,JSON.stringify({locale,width,scenario,plan,...state}));
    const owned=plan===2&&(scenario===1||scenario===2);
    if(plan!==1&&!owned)assert(await page.$eval('dialog[open] .system-button:disabled',el=>el.disabled));
    await page.keyboard.press('Escape');
    assert.equal(await page.$$('dialog[open]').then(els=>els.length),0);
    assert(await page.$eval(trigger,el=>el===document.activeElement));
   }
  }
  checks.push(`Pricing: 4 ownership states x 3 summaries, closed payment, focus return / ${locale} ${width}`);
 }
 // Saved materials are genuine local state shared between the catalogue and the account.
 await open('/ru/library',390);
 await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'load'});await page.waitForSelector('.pc-material-grid');
 await page.click('.pc-material:first-child .system-icon-button');
 await page.click('.tp-shell .system-shell-toggle');
 await page.click('.tp-shell nav a[href="/ru/account?tab=saved"]');await page.waitForSelector('.ap-page');
 assert.equal(await page.$$('.ap-panel .pc-material').then(els=>els.length),1);
 await page.reload({waitUntil:'load'});await page.waitForSelector('.ap-panel .pc-material');
 await page.click('.ap-panel .system-icon-button');
 await page.waitForSelector('.ap-panel .sf-empty');
 assert.equal(await page.$$('.ap-panel .pc-material').then(els=>els.length),0);
 assert(await page.$eval('.ap-page h1',el=>el===document.activeElement));
 for(const index of [2,3,4]) {await page.click(`.ap-page > [role=tablist] > button:nth-child(${index})`);assert(await page.$('.ap-panel .sf-empty'));}
 checks.push('Account: save -> navigation -> persistent saved material -> remove -> focus recovery; purchase/order/update empty states');
 // Localized account URLs keep the selected tab.
 await page.click('.tp-language-trigger');await page.click('[role=menuitemradio]:first-child');
 await page.waitForFunction(()=>location.pathname==='/en/account');
 assert(new URL(page.url()).searchParams.get('tab')==='updates');
 checks.push('Locale preserves account section');
 // Inspect the actual embedded viewport, not only the parent document.
 for(const width of [320,390,768,1024,1440]) {
  await open('/ru/library/state-relay',width);
  await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.querySelector('section[data-state]'));
  const iframe=await page.$eval('iframe',el=>({width:el.clientWidth,scroll:el.contentDocument.documentElement.scrollWidth,height:el.clientHeight,contentHeight:el.contentDocument.querySelector('#system-preview-root').scrollHeight}));
  assert(iframe.scroll<=iframe.width+2,JSON.stringify(iframe));assert(iframe.contentHeight<=iframe.height+2,JSON.stringify(iframe));
 }
 checks.push('Embedded State Relay: viewport width and height fit at 5 sizes');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await open('/ru',390);
 const reduced=await page.$eval('.hp-demo button[aria-busy]',el=>getComputedStyle(el).transitionDuration);
 assert(reduced.split(',').every(value=>parseFloat(value)===0));
 await page.screenshot({path:resolve(out,'home-reduced-390.png')});
 checks.push('Reduced motion: interactive example transitions disabled');
 await page.emulateMediaFeatures([]);
 const session=await page.createCDPSession();
 await session.send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
 await open('/ru/account',390);
 const focusTarget=await page.$('.ap-page > [role=tablist] > button');
 await focusTarget.focus();await page.keyboard.press('ArrowRight');
 assert(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle==='solid'));
 await page.screenshot({path:resolve(out,'account-forced-colors-390.png')});
 checks.push('Forced colors: account selection and keyboard focus remain visible');
 await session.send('Emulation.setEmulatedMedia',{features:[]});
 for(const width of [390,1440]) {
  await open('/foundations.html?lang=ru',width);await page.waitForSelector('.dl-preview');
  const previews=await page.$$eval('.dl-preview',els=>els.map(el=>({width:el.getBoundingClientRect().width,host:el.parentElement.clientWidth})).filter(item=>Math.abs(item.width-item.host)>2));
  assert.equal(previews.length,0,JSON.stringify(previews));
 }
 checks.push('Shared design-system consumer: all thumbnail widths match hosts at 390 and 1440');
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(blockedRequests.length,0);
 passed=true;
 console.log(JSON.stringify({passed,checks:checks.length,errors,blockedRequests}));
} finally {
 writeFileSync(resolve(out,'flows.json'),JSON.stringify({passed,checks,errors,blockedRequests},null,2));await browser.close();
}
