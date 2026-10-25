import { useId, useLayoutEffect, useRef, useState } from 'react';
import { SystemButton } from './SystemButton';
import { SystemIcon } from './SystemIcon';
import { FloatingPortal, useFloatingDismiss, useFloatingPosition } from './system-floating';
import './system-multi-select.css';
export interface SystemMultiSelectOption { value: string; label: string; disabled?: boolean }
export interface SystemMultiSelectProps {
  label: string; placeholder: string; options: readonly SystemMultiSelectOption[];
  value: readonly string[]; onChange: (value: string[]) => void; disabled?: boolean; removeLabel?: (label: string) => string;
}
/** Persistent multiple selection; selected labels stay visible on the trigger. */
export function SystemMultiSelect({label,placeholder,options,value,onChange,disabled=false,removeLabel=(name)=>`Remove ${name}`}:SystemMultiSelectProps) {
  const id=useId(),trigger=useRef<HTMLButtonElement>(null),control=useRef<HTMLDivElement>(null),removeButtons=useRef(new Map<string,HTMLButtonElement>()),panel=useRef<HTMLDivElement>(null),last=useRef(false);
  const [open,setOpen]=useState(false); const active=open&&!disabled;
  const selected=options.filter(option=>value.includes(option.value));
  const position=useFloatingPosition(active,control,panel,'start');
  const close=(_reason:unknown,restore=false)=>{setOpen(false);if(restore)trigger.current?.focus({preventScroll:true});};
  useFloatingDismiss(active,control,panel,close);
  useLayoutEffect(()=>{if(!active||position.visibility!=='visible')return;
    const enabled=panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    (last.current?enabled?.[enabled.length-1]:enabled?.[0])?.focus({preventScroll:true});
  },[active,position.visibility]);
  return <div className="system-multi-select">
    <span id={`${id}-label`} className="sm-label">{label}</span>
    <div ref={control} className="sm-control" data-disabled={disabled||undefined} onClick={event=>{if(!disabled&&!event.defaultPrevented&&!(event.target as Element).closest('button')){last.current=false;setOpen(!active);trigger.current?.focus();}}}>
      <span id={`${id}-value`} className="sm-values">{selected.length?selected.map((option,index)=><span className="sm-chip" key={option.value}><span>{option.label}</span><button ref={node=>{if(node)removeButtons.current.set(option.value,node);else removeButtons.current.delete(option.value);}} type="button" className="sm-remove" aria-label={removeLabel(option.label)} disabled={disabled||option.disabled} onClick={event=>{event.stopPropagation();const remaining=selected.filter(item=>item.value!==option.value);onChange(value.filter(item=>item!==option.value));requestAnimationFrame(()=>{(removeButtons.current.get(remaining[Math.min(index,remaining.length-1)]?.value)??trigger.current)?.focus({preventScroll:true});});}}><SystemIcon name="close" size={16}/></button></span>):<span className="sm-placeholder">{placeholder}</span>}</span>
      <SystemButton ref={trigger} className="sm-trigger" variant="quiet" disabled={disabled||!options.length} aria-haspopup="listbox" aria-expanded={active} aria-controls={active?`${id}-list`:undefined} aria-label={`${label}: ${selected.map(option=>option.label).join(', ')||placeholder}`} onClick={()=>{last.current=false;setOpen(!active);}} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();last.current=event.key==='ArrowUp';setOpen(true);}}}/>
    </div>
    {active&&<FloatingPortal anchor={control.current}><div ref={panel} id={`${id}-list`} className="system-floating sm-list" role="listbox" aria-multiselectable="true" aria-labelledby={`${id}-label`} style={position} onKeyDown={event=>{
      const enabled=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]),current=enabled.indexOf(document.activeElement as HTMLButtonElement);
      let next:number|undefined;
      if(event.key==='ArrowDown')next=(current+1)%enabled.length;
      if(event.key==='ArrowUp')next=(current-1+enabled.length)%enabled.length;
      if(event.key==='Home')next=0;if(event.key==='End')next=enabled.length-1;
      if(next!==undefined){event.preventDefault();enabled[next]?.focus();}
      if(event.key==='Tab')close('focus-out',true);
    }}>{options.map(option=><button key={option.value} type="button" role="option" aria-selected={value.includes(option.value)} disabled={option.disabled} tabIndex={-1} onClick={()=>onChange(value.includes(option.value)?value.filter(item=>item!==option.value):[...value,option.value])}>
      <span className="sm-option-check" aria-hidden="true">{value.includes(option.value)&&<SystemIcon name="check" size={16}/>}</span><span>{option.label}</span>
    </button>)}</div></FloatingPortal>}
  </div>;
}
