import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const server = await createServer({root:fileURLToPath(new URL('..',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false,ws:false}});
after(async()=>{await server.close();});
const { SystemTextLink } = await server.ssrLoadModule('/src/foundations/SystemTextLink.tsx');
const { SystemAccordion } = await server.ssrLoadModule('/src/foundations/SystemAccordion.tsx');
test('links preserve native destination/target and merge opener protection with caller rel',()=>{
  const html=renderToStaticMarkup(createElement(SystemTextLink,{href:'/docs',target:'_blank',rel:'license',children:'Guide'}));
  assert.match(html,/href="\/docs"/);assert.match(html,/target="_blank"/);assert.match(html,/rel="license noopener"/);assert.doesNotMatch(html,/role="button"/);
});
test('disclosures emit independent native details, headings and labelled mounted content',()=>{
  const html=renderToStaticMarkup(createElement(SystemAccordion,{headingLevel:4,items:[{id:'one',title:'One',content:'First'},{id:'two',title:'Two',content:'Second',defaultOpen:true}]}));
  assert.equal((html.match(/<details/g)??[]).length,2);assert.equal((html.match(/<h4/g)??[]).length,2);assert.equal((html.match(/<details open=""/g)??[]).length,1);assert.match(html,/First/);assert.match(html,/Second/);
  const ids=[...html.matchAll(/<h4 id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,2);for(const id of ids)assert.ok(html.includes(`aria-labelledby="${id}"`));
});
