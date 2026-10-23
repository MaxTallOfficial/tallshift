import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false,ws:false}});
after(async()=>{await server.close();});
const {SystemTextInput}=await server.ssrLoadModule('/src/foundations/SystemTextField.tsx');
const {SystemSearchCombobox}=await server.ssrLoadModule('/src/foundations/SystemSearchCombobox.tsx');
const {SystemMenu}=await server.ssrLoadModule('/src/foundations/SystemMenu.tsx');
const {SystemTheme}=await server.ssrLoadModule('/src/foundations/SystemTheme.tsx');
const noop=()=>{};
test('field affixes are described, escape text and never rewrite the submitted value',()=>{
 const html=renderToStaticMarkup(createElement(SystemTextInput,{id:'address',label:'Address',prefix:'https://',suffix:'<unit>',value:'tallshift.dev',onChange:noop}));
 assert.match(html,/value="tallshift.dev"/);assert.match(html,/aria-describedby="address-prefix address-suffix"/);assert.match(html,/id="address-prefix"/);assert.match(html,/&lt;unit&gt;/);assert.doesNotMatch(html,/value="https:/);
});
test('search signals explicit loading/error without stale active descendant',()=>{
 const props={label:'Search',placeholder:'Query',value:'A001',onChange:noop,options:[{value:'A001',label:'State Relay'}],clearLabel:'Clear',listLabel:'Suggestions',emptyText:'None'};
 const loading=renderToStaticMarkup(createElement(SystemSearchCombobox,{...props,status:'loading',loadingText:'Loading'}));
 const error=renderToStaticMarkup(createElement(SystemSearchCombobox,{...props,status:'error',errorText:'Failed'}));
 assert.match(loading,/aria-busy="true"/);assert.match(error,/aria-invalid="true"/);assert.doesNotMatch(loading,/aria-activedescendant/);assert.doesNotMatch(error,/aria-activedescendant/);
});
test('menus distinguish checkbox and radio checked state from simple actions',()=>{
 const html=renderToStaticMarkup(createElement(SystemMenu,{label:'Display',defaultOpen:true,trigger:()=>createElement('button',{},'Display'),items:[{id:'wrap',label:'Wrap',kind:'checkbox',checked:true,onSelect:noop},{id:'subtle',label:'Subtle',kind:'radio',checked:false,onSelect:noop},{id:'run',label:'Run',onSelect:noop}]}));
 assert.match(html,/role="menuitemcheckbox" aria-checked="true"/);assert.match(html,/role="menuitemradio" aria-checked="false"/);assert.match(html,/role="menuitem"/);
});
test('standalone theme scopes all approved variables and locale without body mutation',()=>{
 const html=renderToStaticMarkup(createElement(SystemTheme,{locale:'vi'},'Content'));
 assert.match(html,/data-tallshift-theme="afterlight"/);assert.match(html,/lang="vi"/);assert.match(html,/--f-accent:#EBD183/i);assert.match(html,/--sy-font-ui:/);assert.doesNotMatch(html,/<body|<script/);
});
