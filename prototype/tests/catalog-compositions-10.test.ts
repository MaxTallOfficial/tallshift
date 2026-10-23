import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { paginationRange, paginationItems } from '../src/foundations/pagination.ts';
const server = await createServer({root:fileURLToPath(new URL('..',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false,ws:false}});
after(async()=>{await server.close();});
const {SystemContentTile}=await server.ssrLoadModule('/src/foundations/SystemContentTile.tsx');
const {SystemCollectionTile}=await server.ssrLoadModule('/src/foundations/SystemCollectionTile.tsx');
const {SystemPagination}=await server.ssrLoadModule('/src/foundations/SystemPagination.tsx');
const {SystemCatalogToolbar}=await server.ssrLoadModule('/src/foundations/SystemCatalogToolbar.tsx');

test('pagination clamps invalid input and reports exact first/last item including empty results',()=>{
 assert.deepEqual(paginationRange(5,2,3),{current:3,pages:3,first:5,last:5,total:5});
 assert.deepEqual(paginationRange(0,2,99),{current:1,pages:1,first:0,last:0,total:0});
 assert.deepEqual(paginationRange(-2,0,NaN),{current:1,pages:1,first:0,last:0,total:0});
 assert.equal(paginationRange(6,2,99).current,3);
 assert.equal(paginationRange(6,2,-99).current,1);
});
test('page window remains bounded with endpoints and selected page for every position',()=>{
 for(let page=1;page<=10000;page++){
  const items=paginationItems(page,10000); const numbers=items.filter(item=>typeof item==='number');
  assert.ok(items.length<=9); assert.equal(numbers[0],1); assert.equal(numbers.at(-1),10000); assert.ok(numbers.includes(page));
  assert.equal(new Set(numbers).size,numbers.length);
 }
});
test('content card labels its heading and separates open/favorite actions',()=>{
 const html=renderToStaticMarkup(createElement(SystemContentTile,{name:'State Relay',title:'Keep actions connected',description:'Ready source',metadata:'A001',status:'Ready',action:{state:'ready',label:'Open',onOpen:()=>{}},favorite:{label:'Save State Relay',selected:true,onChange:()=>{}}}));
 const headingId=html.match(/aria-labelledby="([^"]+)"/)?.[1]; assert.ok(headingId); assert.ok(html.includes(`<h3 id="${headingId}">`));
 assert.equal((html.match(/<button /g)??[]).length,2);
 assert.doesNotMatch(html,/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
 assert.match(html,/aria-pressed="true"/);
});
test('planned content requires visible reason associated with disabled action',()=>{
 const html=renderToStaticMarkup(createElement(SystemContentTile,{name:'Planned',title:'Upcoming material',description:'In plan',metadata:'A002',status:'Planned',action:{state:'planned',label:'Unavailable',reason:'Not built yet'}}));
 const reasonId=html.match(/aria-describedby="([^"]+)"/)?.[1]; assert.ok(reasonId); assert.ok(html.includes(`id="${reasonId}"`));
 assert.match(html,/disabled=""/); assert.match(html,/Not built yet/);
});
test('collection is one selected native button with canonical caller text',()=>{
 const html=renderToStaticMarkup(createElement(SystemCollectionTile,{name:'Starter',title:'Start with a working component',accessLabel:'Free · Planned',countLabel:'9 items in plan',membersLabel:'Planned contents',memberIds:['A001','S001'],actionLabel:'View samples · 2',selected:true,onSelect:()=>{}}));
 assert.equal((html.match(/<button /g)??[]).length,1); assert.match(html,/aria-pressed="true"/); assert.match(html,/A001 · S001/);
 assert.doesNotMatch(html,/role="link"|<a /);
});
test('pagination exposes current page and focusable guarded boundaries',()=>{
 const html=renderToStaticMarkup(createElement(SystemPagination,{total:6,pageSize:2,page:1,onPageChange:()=>{},label:'Pages',previousLabel:'Previous',nextLabel:'Next',pageLabel:(p:number,n:number)=>`Page ${p} of ${n}`}));
 assert.match(html,/<nav[^>]*aria-label="Pages"/); assert.equal((html.match(/aria-current="page"/g)??[]).length,1);
 assert.match(html,/<button[^>]*aria-label="Previous"[^>]*aria-disabled="true"/);
 assert.doesNotMatch(html,/<button[^>]* disabled=/);
});
test('catalog form grouping does not promise toolbar arrow navigation',()=>{
 const html=renderToStaticMarkup(createElement(SystemCatalogToolbar,{label:'Catalog filters',search:'Search',sort:'Sort'},'Categories'));
 assert.match(html,/role="group" aria-label="Catalog filters"/); assert.doesNotMatch(html,/role="toolbar"/);
});
