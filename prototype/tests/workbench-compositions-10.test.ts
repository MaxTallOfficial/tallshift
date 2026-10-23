import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const server = await createServer({ root:fileURLToPath(new URL('..',import.meta.url)), configFile:false, server:{middlewareMode:true,hmr:false,ws:false} });
after(async()=>{await server.close();});
const { SystemCodePanel } = await server.ssrLoadModule('/src/foundations/SystemCodePanel.tsx');
const { SystemPromptPanel, SystemCopyFallback } = await server.ssrLoadModule('/src/foundations/SystemPromptPanel.tsx');
const { SystemDownloadAction } = await server.ssrLoadModule('/src/foundations/SystemDownloadAction.tsx');
function textContent(html:string) {
 return html.replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
}

test('code panel preserves source whitespace and escapes hostile markup',()=>{
 const source='\nimport x from "x";\n\tconst count = 42;\n<script>alert("Xin chào & Привет")</script>\n';
 const html=renderToStaticMarkup(createElement(SystemCodePanel,{label:'Source',filePath:'src/main.tsx',source,wrap:true,description:'Exact file'}));
 const code=html.match(/<code>([\s\S]*?)<\/code>/)?.[1];
 assert.ok(code); assert.equal(textContent(code),source);
 assert.doesNotMatch(html,/<script>/); assert.match(html,/data-wrap="true"/);
 assert.match(html,/role="region" aria-label="Source: src\/main.tsx"/);
 const described=html.match(/aria-describedby="([^"]+)"/)?.[1]; assert.ok(described); assert.ok(html.includes(`id="${described}"`));
 assert.match(html,/tabindex="0"/);
});
test('code panel supports host navigation and toolbar without wrapping interactive descendants',()=>{
 const html=renderToStaticMarkup(createElement(SystemCodePanel,{label:'Source',filePath:'main.tsx',source:'export default 1',toolbar:createElement('button',null,'Wrap'),navigation:createElement('nav',{'aria-label':'Files'},'main.tsx')}));
 assert.match(html,/system-code-with-navigation/); assert.match(html,/<button>Wrap<\/button>/); assert.match(html,/<nav aria-label="Files">/);
 assert.doesNotMatch(html,/<pre[^>]*>[\s\S]*?<button/);
});
test('prompt panel has an exact safely escaped raw fallback and host readable projection',()=>{
 const prompt='\nCONTEXT_JSON="Xin chào"\n<script>local only</script>\n';
 const html=renderToStaticMarkup(createElement(SystemPromptPanel,{label:'Adaptation prompt',prompt}));
 const code=html.match(/<code>([\s\S]*?)<\/code>/)?.[1]; assert.ok(code); assert.equal(textContent(code),prompt);
 assert.doesNotMatch(html,/<script>/); assert.match(html,/role="region" aria-label="Adaptation prompt"/);
 const projected=renderToStaticMarkup(createElement(SystemPromptPanel,{label:'Adaptation prompt',prompt},createElement('article',null,'Readable task')));
 assert.match(projected,/<article>Readable task<\/article>/); assert.doesNotMatch(projected,/CONTEXT_JSON/);
});
test('copy failure keeps the failed payload selectable, labelled and read only',()=>{
 const payload='\nconst x = "<button>";\n';
 const html=renderToStaticMarkup(createElement(SystemCopyFallback,{title:'Clipboard unavailable',label:'Copy manually',value:payload}));
 assert.match(html,/role="alert"/); assert.match(html,/<label><span>Copy manually<\/span><textarea readOnly="">/);
 const textarea=html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)?.[1]; assert.ok(textarea);
 // React adds one extra initial LF to preserve a textarea value that begins with LF in HTML parsing.
 assert.equal(textContent(textarea).replace(/^\n/,'') ,payload);
});
test('download distinguishes unavailable, pending and visible error without claiming completion',()=>{
 const base={label:'Download ZIP',failureMessage:'Archive unavailable',onDownload:()=>{throw Error('must not execute during render');}};
 const unavailable=renderToStaticMarkup(createElement(SystemDownloadAction,{...base,unavailableReason:'Sign in to access this file'}));
 assert.match(unavailable,/disabled=""/); assert.match(unavailable,/Sign in to access this file/); assert.match(unavailable,/aria-describedby=/);
 const pending=renderToStaticMarkup(createElement(SystemDownloadAction,{...base,loading:true}));
 assert.match(pending,/aria-disabled="true"/); assert.match(pending,/aria-busy="true"/); assert.match(pending,/>Download ZIP<\/span>/);
 const error=renderToStaticMarkup(createElement(SystemDownloadAction,{...base,error:'Could not create archive. Try again.'}));
 assert.match(error,/data-error="true"/); assert.match(error,/Could not create archive. Try again./);
 assert.doesNotMatch(error,/role="alert"|aria-live|Download complete|100%/);
});
