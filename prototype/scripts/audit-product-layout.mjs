/** Local visual/geometry regression checks. No Hallmark runtime or remote resources. */
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(resolve(process.env.HALLMARK_PUPPETEER||'.','layout-audit.cjs'));
const puppeteer=require('puppeteer-core');
const baseline=process.argv.includes('--baseline');
const siteOnly=process.argv.includes('--site-only');
const pageOnly=process.argv.find(arg=>arg.startsWith('--page='))?.slice(7);
if(pageOnly&&!['home','pricing','account'].includes(pageOnly))throw new Error('Unknown page filter');
const newPages=pageOnly?[pageOnly==='home'?'':`/${pageOnly}`]:['','/pricing','/account'];
const resultFile=baseline?'baseline.json':siteOnly?(pageOnly?`site-${pageOnly}-audit.json`:'site-audit.json'):'audit.json';
const catalog=JSON.parse(readFileSync(resolve(root,'prototype/src/data/catalog.json'),'utf8'));
const out=resolve(root,'docs/art-direction-2026/evidence/layout-audit-2026-11-05');
mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--disable-sync','--disable-component-update']});
const checks=[],failures=[],errors=[],blockedRequests=[];
let complete=false;
try {
 const page=await browser.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.origin==='http://127.0.0.1:4173'||['about:','data:','blob:'].includes(url.protocol))void request.continue();
  else {blockedRequests.push(request.url());void request.abort('blockedbyclient');}
 });
 async function inspect(path,width,tag='default') {
  await page.setViewport({width,height:900,deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:4173${path}`,{waitUntil:'load'});
  await page.waitForSelector('main h1');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const findings=await page.evaluate(()=>{
   const issues=[];
   if(document.documentElement.scrollWidth>innerWidth+1)issues.push('Document overflows horizontally');
   for(const el of document.querySelectorAll('.dl-preview')) {
    const b=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();
    if(Math.abs(b.width-el.parentElement.clientWidth)>2||b.left<p.left-1||b.right>p.right+1)issues.push(`Preview does not fill host: ${el.className}, preview=${b.width}, host=${el.parentElement.clientWidth}`);
    const sample=el.querySelector('[class$="-sample"]');
    if(sample){const s=sample.getBoundingClientRect();if(s.left<b.left-1||s.right>b.right+1||s.top<b.top-1||s.bottom>b.bottom+1)issues.push(`Preview sample clipped: ${sample.className}`);}
   }
   for(const el of document.querySelectorAll('.pc-material-content,.pc-material-footer,.pc-featured,.pc-filter-row,.tp-workbar,.tp-material-heading,.tp-settings,.tp-mobile-settings,.tp-kit-grid,.tp-planned,.hp-demo,.hp-hero,.hp-flow,.as-offer,.pp-summary,.pp-terms,.ap-panel')) {
    if(!el.getClientRects().length)continue;
    if(el.scrollWidth>el.clientWidth+2)issues.push(`Internal overflow: ${el.className} (${el.scrollWidth}/${el.clientWidth})`);
   }
   for(const el of document.querySelectorAll('button,a.tp-action-link,a.system-button')) {
    if(!el.getClientRects().length)continue;
    if(el.scrollWidth>el.clientWidth+2)issues.push(`Action label clipped: ${el.textContent?.trim()}`);
   }
   return issues;
  });
  checks.push({path,width,tag,previews:await page.$$eval('.dl-preview',els=>els.length),issues:findings});
  failures.push(...findings.map(issue=>({path,width,tag,issue})));
  if(checks.length%40===0)console.log(JSON.stringify({progress:checks.length,failures:failures.length}));
 }
 // Every card and all six preview types, including both sides of each layout breakpoint.
 if(!siteOnly)for(const locale of ['ru','en','vi'])for(const width of [320,360,390,560,561,767,768,1023,1024,1100,1280,1440,1920]) {
  await inspect(`/${locale}/library`,width);
  if(locale==='ru'&&width===1100) {
   await page.$eval('.pc-material-grid',el=>el.scrollIntoView({block:'start'}));
   await page.screenshot({path:resolve(out,`catalog-1100-${baseline?'before':'after'}.png`)});
   await (await page.$('.pc-material')).screenshot({path:resolve(out,`card-1100-${baseline?'before':'after'}.png`)});
  }
 }
 if(!baseline&&!siteOnly) {
  // Every planned-material route, not only the first representative card.
  for(const locale of ['ru','en','vi'])for(const width of [390,1280])for(const item of catalog.items)await inspect(`/${locale}/library/${item.slug}`,width,'all-materials');
  for(const locale of ['ru','en','vi'])for(const width of [320,768,1024,1440])for(const view of ['demo','code','prompt'])await inspect(`/${locale}/library/state-relay?view=${view}`,width,'workspace-tabs');
  for(const width of [320,768,1440])await inspect('/ru/library/not-a-material',width,'404');
  // Cold material CSS -> catalogue (different loading order), opened filters and navigation.
  await inspect('/ru/library/state-relay?view=code',1100,'navigation');
  await page.click('.tp-back');await page.waitForSelector('.pc-material-grid');
  await page.click('.pc-filter-disclosure > summary');
  await page.screenshot({path:resolve(out,'filters-1100.png')});
  for(const width of [320,390,768]) {
   await page.setViewport({width,height:900});
   const overflow=await page.$eval('.pc-filter-row',el=>el.scrollWidth>el.clientWidth+1);
   if(overflow)failures.push({width,issue:'Opened filters overflow'});
  }
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await inspect('/ru/library/state-relay',390,'reduced-motion');
  await page.screenshot({path:resolve(out,'state-relay-reduced-390.png')});
  await page.emulateMediaFeatures([]);
 }
 if(!baseline)for(const locale of ['ru','en','vi'])for(const width of [320,360,390,560,561,767,768,1023,1024,1100,1280,1440,1920])for(const path of newPages) {
  await inspect(`/${locale}${path}`,width,'new-pages');
  if(locale==='ru'&&[390,1440].includes(width))await page.screenshot({path:resolve(out,`${path.slice(1)||'home'}-${width}.png`),fullPage:true});
 }
 complete=true;
 writeFileSync(resolve(out,resultFile),JSON.stringify({complete,checks,failures,errors,blockedRequests,policy:'Local page resources only; external requests aborted'},null,2));
 console.log(JSON.stringify({checks:checks.length,failures:failures.length,samples:failures.slice(0,8),errors,blockedRequests,out}));
 process.exitCode=failures.length||errors.length||blockedRequests.length?1:0;
} finally {
 writeFileSync(resolve(out,resultFile),JSON.stringify({complete,checks,failures,errors,blockedRequests,policy:'Local page resources only; external requests aborted'},null,2));
 await browser.close();
}
