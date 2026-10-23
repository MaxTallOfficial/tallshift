import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { toastQueueReducer } from '../src/foundations/toast-queue.ts';
const server = await createServer({ root:fileURLToPath(new URL('..',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false,ws:false} });
after(async()=>{await server.close();});
const { SystemToastRegion }=await server.ssrLoadModule('/src/foundations/SystemToastRegion.tsx');
const { SystemInlineAlert }=await server.ssrLoadModule('/src/foundations/SystemInlineAlert.tsx');
const { SystemBadge }=await server.ssrLoadModule('/src/foundations/SystemBadge.tsx');
const { SystemSkeleton }=await server.ssrLoadModule('/src/foundations/SystemSkeleton.tsx');
const { SystemEmptyState }=await server.ssrLoadModule('/src/foundations/SystemEmptyState.tsx');

test('queue updates in place, preserves order and does not evict older messages',()=>{
 const start=Object.freeze([{id:'a',title:'First'},{id:'b',title:'Second'}]);
 const updated=toastQueueReducer(start,{type:'upsert',item:{id:'a',title:'Resolved'}});
 assert.deepEqual(updated,[{id:'a',title:'Resolved'},{id:'b',title:'Second'}]); assert.equal(start[0].title,'First');
 let queue=updated; for(let i=0;i<30;i++)queue=toastQueueReducer(queue,{type:'upsert',item:{id:`item-${i}`,title:'New'}});
 assert.equal(queue.length,32); assert.equal(queue[0].id,'a');
 assert.equal(toastQueueReducer(queue,{type:'dismiss',id:'absent'}),queue);
 assert.deepEqual(toastQueueReducer(queue,{type:'dismiss',id:'a'}).map(item=>item.id),queue.slice(1).map(item=>item.id));
 assert.deepEqual(toastQueueReducer(queue,{type:'clear'}),[]);
 assert.equal(toastQueueReducer(queue,{type:'upsert',item:{id:' ',title:'Invalid'}}),queue);
});
test('toast region uses one announcer and passive cards with named dismiss controls',()=>{
 const html=renderToStaticMarkup(createElement(SystemToastRegion,{label:'Notifications',dismissLabel:'Dismiss notification',items:[{id:'one',title:'Saved'},{id:'two',title:'Retry needed',tone:'error'}],onDismiss:()=>{},announcement:'Retry needed'}));
 assert.equal((html.match(/role="status"/g)??[]).length,1);
 assert.equal((html.match(/role="alert"/g)??[]).length,0);
 assert.match(html,/role="region" aria-label="Notifications" tabindex="-1"/);
 assert.equal((html.match(/aria-label="Dismiss notification"/g)??[]).length,2);
 assert.equal((html.match(/data-toast-id=/g)??[]).length,2);
 const off=renderToStaticMarkup(createElement(SystemToastRegion,{label:'Notifications',dismissLabel:'Dismiss',items:[],onDismiss:()=>{},announcementPriority:'off'}));
 assert.doesNotMatch(off,/role="(?:alert|status)"/); assert.match(off,/aria-live="off"/);
});
test('inline alerts are static by default and announce only when requested',()=>{
 const staticHtml=renderToStaticMarkup(createElement(SystemInlineAlert,{title:'Try again',tone:'error'},'A visible reason'));
 assert.doesNotMatch(staticHtml,/role="(?:alert|status)"/); assert.match(staticHtml,/A visible reason/);
 const urgent=renderToStaticMarkup(createElement(SystemInlineAlert,{title:'Cannot continue',announce:'assertive'}));
 assert.match(urgent,/role="alert" aria-atomic="true"/);
});
test('badge is passive, skeleton decorative, empty state has a named heading',()=>{
 const badge=renderToStaticMarkup(createElement(SystemBadge,{tone:'warning'},'Planned'));
 assert.match(badge,/>Planned<\/span>/); assert.doesNotMatch(badge,/tabindex|role=|button/);
 const skeleton=renderToStaticMarkup(createElement(SystemSkeleton,{height:160,shape:'block'}));
 assert.match(skeleton,/aria-hidden="true"/); assert.match(skeleton,/height:160px/); assert.doesNotMatch(skeleton,/status|animation/);
 const empty=renderToStaticMarkup(createElement(SystemEmptyState,{title:'No results',headingLevel:4},'Reset filters'));
 const labelled=empty.match(/aria-labelledby="([^"]+)"/)?.[1]; assert.ok(labelled); assert.ok(empty.includes(`<h4 id="${labelled}">No results</h4>`));
});
