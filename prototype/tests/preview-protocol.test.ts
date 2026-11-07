import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewMessage,parsePreviewMessage,validPreviewConfig,messageBudget} from '../src/platform/preview-protocol.ts';
import {deploymentPolicy} from '../scripts/deployment-policy.mjs';
const channel='ba428ced-369c-436e-a614-a748ee62dd9d';
const config={locale:'ru',motion:'subtle',duration:160,accent:'#EBD183'};
test('preview schema accepts only exact per-item configuration and supported version',()=>{
  assert.ok(parsePreviewMessage(previewMessage('APPLY_CONFIG','S001',channel,'1',config)));
  for(const patch of [{target:'vite'},{context:'private'},{html:'<b>x</b>'},{url:'https://example.com'},{duration:481},{locale:'fr'},{accent:'red'}])assert.equal(validPreviewConfig({...config,...patch},'S001'),false);
  assert.equal(validPreviewConfig({locale:'vi',motion:'off',duration:600},'E001'),true);
  assert.equal(validPreviewConfig({locale:'vi',motion:'off',duration:481},'A003'),false);
  assert.equal(validPreviewConfig(config,'A006'),false);
  assert.equal(validPreviewConfig(config,'S004'),false);
});
test('bridge rejects malformed, oversized, cross-version and unknown envelopes',()=>{
  const value=previewMessage('READY','A001',channel,'1');
  for(const patch of [{itemVersion:'1.0.0'},{protocolVersion:2},{channelId:'short'},{requestId:'<html>'},{payload:{untrusted:true}},{type:'NAVIGATE'},{extra:1}])assert.equal(parsePreviewMessage({...value,...patch}),null);
  assert.equal(parsePreviewMessage({...value,payload:{code:'a'.repeat(17000)}}),null);
  const cycle:Record<string,unknown>={};cycle.self=cycle;assert.equal(parsePreviewMessage(cycle),null);
  assert.ok(parsePreviewMessage(previewMessage('RESIZE','A001',channel,'2',{height:120})));
  assert.equal(parsePreviewMessage(previewMessage('RESIZE','A001',channel,'2',{height:2401})),null);
});
test('message flood is bounded and resets per window',()=>{
  let time=0;const allowed=messageBudget(()=>time);
  for(let i=0;i<30;i++)assert.equal(allowed(),true);
  assert.equal(allowed(),false);time=1000;assert.equal(allowed(),true);
});
test('deployment policy uses public suffix data including private hosting suffixes',()=>{
  assert.throws(()=>deploymentPolicy('https://app.example.co.uk','https://preview.example.co.uk'));
  assert.throws(()=>deploymentPolicy('https://app.example.com','http://different.example.net'));
  assert.throws(()=>deploymentPolicy('https://app.example.com/path','https://different.example.net'));
  assert.equal(deploymentPolicy('https://tallshift.example','https://tallshift-preview.example').local,false);
  assert.equal(deploymentPolicy('https://one.vercel.app','https://two.vercel.app').local,false);
  assert.throws(()=>deploymentPolicy('http://127.0.0.1:4174','http://127.0.0.1:4175'));
  assert.equal(deploymentPolicy('http://127.0.0.1:4174','http://127.0.0.1:4175',{local:true}).local,true);
});
