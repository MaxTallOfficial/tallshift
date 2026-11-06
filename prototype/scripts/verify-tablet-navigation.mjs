/** Tablet navigation: local-only layout and keyboard/route regression evidence. */
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {productCopy} from '../src/product/product-copy.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(resolve(process.env.HALLMARK_PUPPETEER||'.','header-qa.cjs'));
const puppeteer=require('puppeteer-core');
const out=resolve(root,'docs/art-direction-2026/evidence/tablet-navigation-2026-11-06');mkdirSync(out,{recursive:true});
for(const width of [390,1440]) {
 const before=resolve(root,`docs/art-direction-2026/evidence/header-2026-11-05/home-${width}.png`),target=resolve(out,`before-home-${width}.png`);
 if(existsSync(before))copyFileSync(before,target);
}
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--disable-sync','--disable-component-update']});
const checks=[],flows=[],errors=[],blockedRequests=[];let passed=false;
const flowsOnly=process.argv.includes('--flows-only');
try {
 async function newLocalPage() {
  const next=await browser.newPage();next.on('pageerror',error=>errors.push(error.message));
  await next.setRequestInterception(true);next.on('request',request=>{const url=new URL(request.url());if(url.origin==='http://127.0.0.1:4173'||['data:','about:','blob:'].includes(url.protocol))void request.continue();else{blockedRequests.push(request.url());void request.abort('blockedbyclient');}});return next;
 }
 let page=await newLocalPage();
 async function open(path,width=1440) {if(path.startsWith('/foundations.html')){await page.close();page=await newLocalPage();}await page.setViewport({width,height:900});await page.goto(`http://127.0.0.1:4173${path}`,{waitUntil:'load'});await page.waitForSelector('main h1');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
 if(!flowsOnly)for(const locale of ['ru','en','vi'])for(const width of [320,390,600,767,768,834,1023,1024,1280,1440])for(const path of ['', '/library','/library/state-relay','/library/starter-split-hero','/pricing','/account?tab=orders']) {
  await open(`/${locale}${path}`,width);
  const state=await page.evaluate(()=>{
   const visible=el=>!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
   const shell=document.querySelector('.tp-product-shell'),header=shell.getBoundingClientRect(),children=[...shell.querySelector('.system-shell-main').children].filter(visible);
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,headerHeight:header.height,centers:children.map(el=>({class:el.className,center:el.getBoundingClientRect().top+el.getBoundingClientRect().height/2})),overflow:children.filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.className),mainLinks:[...shell.querySelectorAll('nav a')].filter(visible).length,menu:visible(shell.querySelector('.system-shell-toggle')),primary:visible(shell.querySelector('.system-shell-primary')),brand:shell.querySelector('.system-brand').getAttribute('aria-label')};
  });
  assert(state.scroll<=width+1,JSON.stringify({locale,path,...state}));
  assert(state.headerHeight<=100,JSON.stringify({locale,path,...state}));
  assert.equal(state.overflow.length,0,JSON.stringify({locale,path,...state}));
  assert(Math.max(...state.centers.map(item=>item.center))-Math.min(...state.centers.map(item=>item.center))<=2,JSON.stringify(state));
  assert.equal(state.mainLinks,width>=768?2:0);assert.equal(state.menu,width<768);assert.equal(state.primary,width>=768);assert(state.brand);
  checks.push({locale,path,...state});
  if(locale==='ru'&&[320,768,834,1023,1440].includes(width)&&path==='')await page.screenshot({path:resolve(out,`home-${width}.png`)});
  if(checks.length%30===0)console.log(JSON.stringify({progress:checks.length}));
 }
 await open('/ru',390);await page.click('.tp-shell .system-shell-toggle');
 assert.equal(await page.$$eval('.tp-shell nav a',els=>els.filter(el=>el.getClientRects().length).length),3);
 await page.screenshot({path:resolve(out,'menu-390.png')});
 await page.keyboard.press('Escape');assert.equal(await page.$eval('.system-shell-toggle',el=>el===document.activeElement),true);
 assert.equal(await page.$eval('.tp-shell',el=>el.dataset.mobileOpen),'false');
 flows.push('Mobile menu: all destinations and demo available, Escape closes and restores focus');
 await page.click('.system-shell-toggle');await page.click('.tp-shell .system-shell-primary a');await page.waitForSelector('.tp-material');
 assert.equal(await page.$eval('.tp-shell',el=>el.dataset.mobileOpen),'false');assert(!page.url().includes('?view='));
 assert.equal(await page.$eval('main h1',el=>el.textContent),productCopy.ru.buttonTitle);
 flows.push('Demo CTA describes function, opens actual material and closes menu');
 await page.click('.tp-language-trigger');await page.keyboard.press('ArrowDown');await page.keyboard.press('Home');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>location.pathname==='/en/library/state-relay');
 assert(await page.$eval('.tp-language-trigger',el=>el===document.activeElement));
 assert.equal(await page.$eval('main h1',el=>el.textContent),productCopy.en.buttonTitle);
 flows.push('Language menu: native names, keyboard choice, route and focus preserved');
 await open('/ru/library/state-relay?view=code&target=vite#share=test',1440);
 await page.click('.tp-language-trigger');await page.click('[role=menuitemradio]:last-child');
 await page.waitForFunction(()=>location.pathname==='/vi/library/state-relay');assert.equal(new URL(page.url()).search,'?view=code&target=vite');assert.equal(new URL(page.url()).hash,'#share=test');
 flows.push('Language switching preserves material, view, target and hash');
 await open('/ru/library?type=component&q=button',1440);await page.click('.tp-saved-link');await page.waitForSelector('.ap-page');
 await page.click('.tp-shell nav a[href*="/library"]');await page.waitForSelector('.pc-page');assert.equal(new URL(page.url()).search,'?type=component&q=button');
 flows.push('Catalogue criteria survive header navigation through saved materials');
 await open('/ru/account?tab=orders',1440);assert.equal(await page.$eval('.tp-saved-link',el=>el.hasAttribute('aria-current')),false);
 await open('/ru/account?tab=saved',1440);assert.equal(await page.$eval('.tp-saved-link',el=>el.getAttribute('aria-current')),'location');
 flows.push('Saved current location is not falsely applied to orders or purchases');
 await open('/ru',390);await page.click('.system-shell-toggle');await page.click('main h1');assert.equal(await page.$eval('.tp-shell',el=>el.dataset.mobileOpen),'false');
 await page.click('.system-shell-toggle');await page.focus('.tp-shell nav a[data-mobile-only]');await page.setViewport({width:1280,height:900});await page.waitForFunction(()=>document.querySelector('.tp-shell').dataset.mobileOpen==='false');
 assert(await page.$eval('.tp-saved-link',el=>el===document.activeElement));
 flows.push('Outside dismissal and responsive switch keep focus visible');
 await page.focus('.tp-shell nav a:first-child');await page.setViewport({width:390,height:900});
 await page.waitForFunction(()=>document.activeElement===document.querySelector('.system-shell-toggle'));
 flows.push('Shrinking to phone moves focus from a hidden destination to the visible menu control');
 await open('/ru',1440);await page.keyboard.press('Tab');assert.equal(await page.$eval('.system-shell-skip',el=>el===document.activeElement),true);await page.keyboard.press('Enter');
 assert.equal(await page.$eval('main',el=>el===document.activeElement),true);
 await page.click('.tp-shell nav a');await page.waitForSelector('.pc-page');
 assert.equal(await page.$eval('main',el=>getComputedStyle(el).outlineStyle),'none');
 flows.push('Skip link works; pointer route navigation leaves no focus halo');
 const session=await page.createCDPSession();await session.send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
 await open('/ru',390);await page.click('.tp-language-trigger');await page.waitForFunction(()=>document.querySelector('[role=menu]')?.style.visibility==='visible');
 assert.notEqual(await page.$eval('[role=menu]',el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
 await page.screenshot({path:resolve(out,'language-forced-390.png')});await page.keyboard.press('Escape');
 assert(await page.$eval('.tp-language-trigger',el=>el===document.activeElement));
 flows.push('Forced colors: language text and selected option visible; Escape recovery');
 await session.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await open('/ru',1440);assert.equal(await page.$eval('.tp-demo-icon .system-icon',el=>getComputedStyle(el).transitionDuration),'0s');
 flows.push('Reduced motion: creative demo affordance remains still');
 await session.send('Emulation.setEmulatedMedia',{features:[]});
 for(const locale of ['en','ru','vi'])for(const width of [320,390,1024]) {
  await open(`/${locale}`,width);await page.click('.tp-language-trigger');await page.waitForFunction(()=>document.querySelector('[role=menu]')?.style.visibility==='visible');
  const menu=await page.$eval('[role=menu]',el=>{const r=el.getBoundingClientRect();return{background:getComputedStyle(el).backgroundColor,left:r.left,right:r.right,top:r.top,bottom:r.bottom,above:el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};});
  assert.notEqual(menu.background,'rgba(0, 0, 0, 0)');assert(menu.left>=0&&menu.right<=width&&menu.top>=0&&menu.bottom<=900&&menu.above,JSON.stringify(menu));
  if(locale==='ru'&&width===390)await page.screenshot({path:resolve(out,'language-390.png')});await page.keyboard.press('Escape');
 }
 flows.push('Language popup: opaque surface above content, clamped within viewport in 9 cases');
 // The larger design-system index collapses at its own content-driven breakpoint.
 for(const locale of ['ru','en','vi'])for(const width of [320,390,600,767,768,834,1023,1024,1280]) {
  await open(`/foundations.html?lang=${locale}`,width);
  const state=await page.evaluate(()=>{
   const shell=document.querySelector('.system-shell[data-layout=stacked]'),row=shell.querySelector('.system-shell-main');
   const visible=el=>!!el.getClientRects().length;
   const children=[...row.children].filter(visible).map(el=>{const r=el.getBoundingClientRect();return {class:el.className,left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:el.scrollWidth>el.clientWidth+2};});
   const brand=shell.querySelector('.system-brand'),range=document.createRange();range.selectNodeContents(brand.querySelector('span'));
   return {rowHeight:row.getBoundingClientRect().height,children,brandLines:range.getClientRects().length,brandHeight:brand.querySelector('span').getBoundingClientRect().height,menu:visible(shell.querySelector('.system-shell-toggle')),label:shell.querySelector('.system-shell-toggle').textContent.trim(),links:[...shell.querySelectorAll('nav a')].filter(visible).length};
  });
  assert.equal(state.menu,width<1024,JSON.stringify({locale,width,state}));
  assert(state.rowHeight<=100,JSON.stringify({locale,width,state}));
  assert(state.brandHeight<35,JSON.stringify({locale,width,state}));
  for(let i=0;i<state.children.length;i++) {
   const child=state.children[i];assert(child.left>=0&&child.right<=width&&!child.overflow,JSON.stringify({locale,width,state}));
   if(i)assert(child.left>=state.children[i-1].right-1,JSON.stringify({locale,width,state}));
  }
  if(width<1024) {
   await page.click('.system-shell-toggle');
   const panel=await page.$eval('.system-shell nav',el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height,cols:getComputedStyle(el).gridTemplateColumns,links:el.querySelectorAll('a').length};});
   assert(panel.left>=0&&panel.right<=width&&panel.height<=630,JSON.stringify(panel));assert(panel.links>=10);
   assert.equal(await page.$eval('.system-shell-toggle',el=>el.getAttribute('aria-expanded')),'true');
   await page.focus('.system-shell nav a:last-child');
   assert(await page.$eval('.system-shell nav a:last-child',el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1;}));
   await page.keyboard.press('Escape');assert(await page.$eval('.system-shell-toggle',el=>el===document.activeElement));
   await page.click('.system-shell-toggle');
   await page.$eval('.system-shell nav',el=>{el.scrollTop=0;});
   if(locale==='ru'&&[320,768,834,1023].includes(width))await page.screenshot({path:resolve(out,`system-menu-${width}.png`)});
   await page.click('.system-shell nav a:first-child');assert.equal(await page.$eval('.system-shell',el=>el.dataset.mobileOpen),'false');
   assert(await page.evaluate(()=>document.activeElement?.matches('h1,h2,h3')));
   await page.evaluate(()=>scrollTo(0,0));
   await page.click('.system-shell-toggle');await page.click('.sy-intro h1');assert.equal(await page.$eval('.system-shell',el=>el.dataset.mobileOpen),'false');
   await page.click('.system-shell-toggle');await page.focus('.system-shell-toggle');await page.setViewport({width:1280,height:900});
   await page.waitForFunction(()=>document.querySelector('.system-shell').dataset.mobileOpen==='false');assert(await page.$eval('.system-brand',el=>el===document.activeElement));
   await page.focus('.system-shell nav a:first-child');await page.setViewport({width,height:900});
   await page.waitForFunction(()=>document.activeElement===document.querySelector('.system-shell-toggle'));
  }
  checks.push({surface:'design-system',locale,width,...state});
 }
 flows.push('Design-system: 27 layout cases; shared labelled menu, scrollable links, anchor focus, Escape/outside/resize recovery');
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(blockedRequests.length,0);passed=true;
 console.log(JSON.stringify({passed,cases:checks.length,flows:flows.length,errors,blockedRequests}));
} finally {writeFileSync(resolve(out,flowsOnly?'flows.json':'checks.json'),JSON.stringify({passed,checks,flows,errors,blockedRequests},null,2));await browser.close();}
