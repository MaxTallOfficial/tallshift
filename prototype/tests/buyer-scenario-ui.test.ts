import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {buyerScenarioOwnership} from '../src/foundations/buyer-scenario.ts';
const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false,ws:false}});
after(()=>server.close());
const {AccessStatesLab}=await server.ssrLoadModule('/src/foundations/AccessStatesLab.tsx');
const {FloatingSpecimen}=await server.ssrLoadModule('/src/foundations/FloatingSpecimen.tsx');
const {ModalSpecimen}=await server.ssrLoadModule('/src/foundations/ModalSpecimen.tsx');
const {SystemLicenseInfo}=await server.ssrLoadModule('/src/foundations/SystemLicenseInfo.tsx');
function cards(scenario:Parameters<typeof buyerScenarioOwnership>[0]) {
 const html=renderToStaticMarkup(createElement(AccessStatesLab,{locale:'en',onOpenMaterial(){},ownership:buyerScenarioOwnership(scenario)}));
 const articles=[...html.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(match=>match[0]);
 assert.equal(articles.length,3);return articles;
}
test('buyer ownership changes prices, badges and actions on the cards themselves',()=>{
 const fresh=cards('new');assert.match(fresh[1],/>\$16</);assert.match(fresh[2],/>\$39</);
 const product=cards('product');assert.match(product[1],/data-price-state="owned"/);assert.match(product[1],/Already owned/);assert.match(product[1],/View access/);assert.doesNotMatch(product[1],/Choose Product/);
 assert.match(product[2],/>\$23</);assert.match(product[2],/Upgrade to All packs/);assert.match(product[2],/17 new materials/);
});
test('expired updates and a partial refund show distinct visible card states',()=>{
 const expired=cards('expired');assert.match(expired[1],/Functional updates ended/);assert.match(expired[2],/>\$23</);
 const refunded=cards('partial');assert.match(refunded[1],/>\$16</);assert.match(refunded[2],/6 new materials/);assert.match(refunded[2],/data-price-state="upgrade"/);assert.doesNotMatch(refunded[2],/Already owned/);
});
test('short explanatory hints remain visible without opening a popup',()=>{
 for(const locale of ['en','ru','vi']) {
  const floating=renderToStaticMarkup(createElement(FloatingSpecimen,{locale}));
  const modal=renderToStaticMarkup(createElement(ModalSpecimen,{locale}));
  const license=renderToStaticMarkup(createElement(SystemLicenseInfo,{locale}));
  assert.doesNotMatch(floating,/aria-haspopup="dialog"|role="tooltip"/);
  assert.doesNotMatch(modal,/aria-haspopup="dialog"|role="tooltip"/);
  assert.doesNotMatch(license,/<button|aria-haspopup|role="dialog"/);
  assert.match(license,/https:\/\/opensource.org\/license\/mit/);
 }
});
