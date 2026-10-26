import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import path from 'node:path';
function files(directory:string):string[]{ return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]); }
const roots=['../src/','../recipe-exports/'].map(relative=>fileURLToPath(new URL(relative,import.meta.url)));
test('UI and transferable examples contain no hand-authored SVG icon geometry',()=>{
 for(const file of roots.flatMap(files).filter(file=>file.endsWith('.tsx'))) {const source=readFileSync(file,'utf8');assert.doesNotMatch(source,/<(?:svg|path|polyline|polygon|circle|rect)\b/,file);assert.doesNotMatch(source,/[↺↻]/,file);}
});
test('every native disclosure uses a library indicator instead of a browser glyph',()=>{
 for(const file of files(roots[0]).filter(file=>file.endsWith('.tsx'))){
  const source=readFileSync(file,'utf8');
  for(const summary of source.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/g)) assert.match(summary[1],/<(?:SystemDisclosureIcon|SystemIcon|Icon)\b/,file);
 }
});
test('disclosure CSS never paints a symbol or line icon',()=>{
 for(const name of ['source-navigator.css','system-accordion.css','control-audit-specimen.css']) {
  const source=readFileSync(new URL(`../src/foundations/${name}`,import.meta.url),'utf8');
  assert.doesNotMatch(source,/content:\s*['"][›‹+−✓▼▶]/,name);
  assert.doesNotMatch(source,/\.system-accordion-mark::(?:before|after)/,name);
 }
});
