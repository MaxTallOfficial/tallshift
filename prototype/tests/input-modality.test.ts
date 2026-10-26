import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false,ws:false}});
after(()=>server.close());
const {registerInputModality}=await server.ssrLoadModule('/src/foundations/system-input-modality.ts');
class Root {
 ownerDocument:EventTarget;
 attributes=new Map<string,string>();
 constructor(doc:EventTarget){this.ownerDocument=doc;}
 getAttribute(name:string){return this.attributes.get(name)??null;}
 setAttribute(name:string,value:string){this.attributes.set(name,value);}
 removeAttribute(name:string){this.attributes.delete(name);}
}
function key(doc:EventTarget,value:string,more:Record<string,unknown>={}) {
 const event=new Event('keydown');for(const [name,entry] of Object.entries({key:value,...more}))Object.defineProperty(event,name,{value:entry,configurable:true});doc.dispatchEvent(event);
}
test('pointer focus stays pointer while typing; Tab and navigation restore keyboard mode',()=>{
 const doc=new EventTarget(),root=new Root(doc),cleanup=registerInputModality(root);
 doc.dispatchEvent(new Event('pointerdown'));assert.equal(root.getAttribute('data-input-modality'),'pointer');
 key(doc,' ',{target:{closest:()=>({})}});assert.equal(root.getAttribute('data-input-modality'),'pointer');
 key(doc,'a');assert.equal(root.getAttribute('data-input-modality'),'pointer');
 key(doc,'Tab');assert.equal(root.getAttribute('data-input-modality'),'keyboard');
 doc.dispatchEvent(new Event('pointerdown'));key(doc,'ArrowDown');assert.equal(root.getAttribute('data-input-modality'),'keyboard');
 doc.dispatchEvent(new Event('pointerdown'));key(doc,'Tab',{isComposing:true});assert.equal(root.getAttribute('data-input-modality'),'pointer');
 cleanup();assert.equal(root.getAttribute('data-input-modality'),null);
});
test('theme scopes share modality across the trusted preview document and clean up separately',()=>{
 const outer=new EventTarget(),inner=new EventTarget(),a=new Root(outer),b=new Root(inner);
 a.setAttribute('data-input-modality','previous');const disposeA=registerInputModality(a),disposeB=registerInputModality(b);
 inner.dispatchEvent(new Event('pointerdown'));assert.equal(a.getAttribute('data-input-modality'),'pointer');assert.equal(b.getAttribute('data-input-modality'),'pointer');
 key(inner,'Tab');assert.equal(a.getAttribute('data-input-modality'),'keyboard');assert.equal(b.getAttribute('data-input-modality'),'keyboard');
 disposeB();outer.dispatchEvent(new Event('pointerdown'));assert.equal(a.getAttribute('data-input-modality'),'pointer');assert.equal(b.getAttribute('data-input-modality'),null);
 disposeA();assert.equal(a.getAttribute('data-input-modality'),'previous');
 key(outer,'Tab');assert.equal(a.getAttribute('data-input-modality'),'previous');
});
