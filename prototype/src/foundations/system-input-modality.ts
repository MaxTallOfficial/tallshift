import {useLayoutEffect,type RefObject} from 'react';
import './system-focus.css';
type Modality='keyboard'|'pointer';
const navigationKeys=new Set(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Enter',' ','Escape']);
const documents=new WeakMap<Document,{roots:Set<HTMLElement>;dispose:()=>void}>();
const scopes=new Set<HTMLElement>();
let currentMode:Modality='keyboard';
/** Tracks interaction type on theme roots only; never blurs controls or mutates html/body. */
export function registerInputModality(root:HTMLElement) {
 const doc=root.ownerDocument;
 let entry=documents.get(doc);
 if(!entry){
  const roots=new Set<HTMLElement>();
  const change=(mode:Modality)=>{currentMode=mode;for(const scope of scopes)scope.setAttribute('data-input-modality',mode);};
  const pointer=()=>change('pointer');
  const keyboard=(event:KeyboardEvent)=>{
   const editing=(event.target as Element|null)?.closest?.('input:not([type=checkbox],[type=radio],[type=range],[type=button],[type=submit],[type=reset],[type=color]),textarea,[contenteditable="true"],[role="textbox"]');
   if(editing&&event.key!=='Tab')return;
   if(!event.isComposing&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&navigationKeys.has(event.key))change('keyboard');};
  doc.addEventListener('pointerdown',pointer,true);
  doc.addEventListener('keydown',keyboard,true);
  entry={roots,dispose:()=>{doc.removeEventListener('pointerdown',pointer,true);doc.removeEventListener('keydown',keyboard,true);}};
  documents.set(doc,entry);
 }
 const previous=root.getAttribute('data-input-modality');
 entry.roots.add(root);scopes.add(root);root.setAttribute('data-input-modality',currentMode);
 return ()=>{entry!.roots.delete(root);scopes.delete(root);if(previous===null)root.removeAttribute('data-input-modality');else root.setAttribute('data-input-modality',previous);if(!entry!.roots.size){entry!.dispose();documents.delete(doc);}};
}
export function useInputModality(root:RefObject<HTMLElement|null>) {
 useLayoutEffect(()=>root.current?registerInputModality(root.current):undefined,[root]);
}
