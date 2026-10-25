import {accessStatesCopy} from '../src/foundations/access-states-copy.ts';
import {systemWords} from '../src/foundations/system-copy.ts';
import {configControlWords} from '../src/foundations/system-config-controls-copy.ts';
import {discoveryCopy} from '../src/foundations/discovery-copy.ts';
import {libraryStatesCopy} from '../src/foundations/library-states-copy.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {materialLabels,collectionMembers} from '../src/foundations/material-labels.ts';
import {libraryStateCollections} from '../src/foundations/library-states-copy.ts';
import {accessProductOffer} from '../src/foundations/access-states-copy.ts';
const catalog=JSON.parse(readFileSync(new URL('../../docs/spec-v1.0/catalog.json',import.meta.url),'utf8'));
test('every canonical material has human labels in all three interface languages',()=>{
 assert.deepEqual(Object.keys(materialLabels).sort(),catalog.items.map((item:{id:string})=>item.id).sort());
 for(const item of catalog.items)for(const locale of ['en','ru','vi'] as const){const label=materialLabels[item.id][locale];assert.ok(label.trim());assert.doesNotMatch(label,/^[SCEA]\d{3}$/);if(locale==='en')assert.equal(label,item.title.en);}
});
test('translated membership preserves canonical IDs, order and counts without raw ID fallback',()=>{
 for(const ids of [...libraryStateCollections.map(entry=>entry.ids),accessProductOffer.itemIds])for(const locale of ['en','ru','vi'] as const){const members=collectionMembers(ids,locale);assert.deepEqual(members.map(item=>item.id),[...ids]);assert.ok(members.every(item=>item.label!==item.id));}
 for(const id of ['UNKNOWN','toString','__proto__'])assert.throws(()=>collectionMembers([id],'ru'),/Missing material label/);
});

test('public interface copy does not expose catalog IDs, release tags or internal membership terminology',()=>{
 const strings=(value:unknown):string[]=>typeof value==='string'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(strings):[];
 for(const source of [accessStatesCopy,systemWords,configControlWords,discoveryCopy,libraryStatesCopy])for(const line of strings(source))assert.doesNotMatch(line,/\b(?:[SCEA]\d{3}|PACK-[A-Z-]+|1\.0-launch)\b|included IDs|включённые ID|các ID/);
});
