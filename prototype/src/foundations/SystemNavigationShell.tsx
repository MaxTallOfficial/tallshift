import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { SystemBrandMark } from './SystemBrandMark';
import {SystemNavigationToggle} from './SystemNavigationToggle';
import './system-shell.css';
export interface SystemNavigationItem { id: string; href: string; label: string; visibility?: 'always' | 'mobile' }
export interface SystemNavigationShellProps {
  brand?: ReactNode; edition?: ReactNode; localeControl?: ReactNode; label: string;
  items: readonly SystemNavigationItem[]; activeId?: string;
  skipLink?: { href: string; label: string }; menuLabels?: { open: string; close: string; label?: string };
  className?: string; mobileOpen?: boolean; onMobileOpenChange?: (open: boolean) => void;
  layout?: 'stacked' | 'inline'; utilityAction?: ReactNode; primaryAction?: ReactNode; menuIcon?: ReactNode; closeMenuIcon?: ReactNode;
}
export function SystemNavigationShell({ brand = <SystemBrandMark />, edition, localeControl, label, items, activeId, skipLink, menuLabels = { open: 'Open navigation', close: 'Close navigation' }, className = '', mobileOpen, onMobileOpenChange, layout='stacked',utilityAction,primaryAction,menuIcon,closeMenuIcon }: SystemNavigationShellProps) {
  const id = useId(); const [localOpen, setLocalOpen] = useState(false); const open = mobileOpen ?? localOpen;
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const lastHeaderFocus = useRef<HTMLElement|null>(null);
  const change = (next: boolean) => { if (mobileOpen === undefined) setLocalOpen(next); onMobileOpenChange?.(next); };
  useEffect(() => {
    const media = matchMedia(layout==='inline'?'(min-width: 768px)':'(min-width: 1024px)');
    const closeOnDesktop = (event?:MediaQueryListEvent) => {
      const active=header.current?.ownerDocument.activeElement;
      // A browser can clear focus as soon as responsive CSS hides a link,
      // before delivering the media change event. Preserve the last header target.
      const focused=active===header.current?.ownerDocument.body?lastHeaderFocus.current:active;
      if (!media.matches) {
        if(event&&!open&&focused?.closest('nav,.system-shell-primary,.system-shell-utility'))toggle.current?.focus({preventScroll:true});
        return;
      }
      if (open) change(false);
      if(focused===toggle.current||layout==='inline'&&focused?.closest('[data-mobile-only]')) {
        (header.current?.querySelector<HTMLAnchorElement>('.system-shell-utility a')??header.current?.querySelector<HTMLAnchorElement>('.system-brand'))?.focus({preventScroll:true});
      }
    };
    media.addEventListener('change',closeOnDesktop); closeOnDesktop();
    return () => media.removeEventListener('change',closeOnDesktop);
  },[open,mobileOpen,onMobileOpenChange,layout]);
  useEffect(()=>{
    if(!open)return;
    const dismiss=(event:Event)=>{if(event.target instanceof Node&&!header.current?.contains(event.target))change(false);};
    document.addEventListener('pointerdown',dismiss);document.addEventListener('focusin',dismiss);
    return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('focusin',dismiss);};
  },[open,layout,mobileOpen,onMobileOpenChange]);
  function navigate(item: SystemNavigationItem, event: MouseEvent<HTMLAnchorElement>) {
    change(false);
    if (!open || !item.href.startsWith('#') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    let fragment: string; try { fragment = decodeURIComponent(item.href.slice(1)); } catch { return; }
    const target = document.getElementById(fragment);
    const focusTarget = target?.querySelector<HTMLElement>('h1,h2,h3') ?? target;
    if (!focusTarget) return;
    requestAnimationFrame(() => {
      const temporary = !focusTarget.hasAttribute('tabindex');
      if (temporary) focusTarget.setAttribute('tabindex','-1');
      focusTarget.focus({preventScroll:true});
      if (temporary) focusTarget.addEventListener('blur',()=>focusTarget.removeAttribute('tabindex'),{once:true});
    });
  }
  const navigation=<nav id={`${id}-navigation`} aria-label={label}>{items.map(item => <a key={item.id} href={item.href} data-mobile-only={item.visibility==='mobile'||undefined} aria-current={activeId === item.id ? 'location' : undefined} onClick={event => navigate(item,event)}>{item.label}</a>)}</nav>;
  const toggleIcon=open?closeMenuIcon??menuIcon:menuIcon;
  return <>{skipLink && <a className="system-shell-skip" href={skipLink.href}>{skipLink.label}</a>}<header ref={header} className={`system-shell ${className}`.trim()} data-layout={layout} data-mobile-open={open} onFocusCapture={event=>{lastHeaderFocus.current=event.target as HTMLElement;}} onBlurCapture={event=>{if(event.relatedTarget&&!header.current?.contains(event.relatedTarget as Node))lastHeaderFocus.current=null;}} onClick={event=>{if(open&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&(event.target as Element).closest('a[href]'))change(false);}} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); change(false); toggle.current?.focus(); } }}>
    <div className="system-shell-main">{brand}{edition && <span className="system-shell-edition">{edition}</span>}{layout==='inline'&&navigation}{localeControl && <div className="system-shell-locale">{localeControl}</div>}{utilityAction&&<div className="system-shell-utility">{utilityAction}</div>}{primaryAction&&<div className="system-shell-primary">{primaryAction}</div>}<SystemNavigationToggle ref={toggle} className="system-shell-toggle" leadingIcon={toggleIcon} open={open} controls={`${id}-navigation`} label={menuLabels.label??'Menu'} openLabel={menuLabels.open} closeLabel={menuLabels.close} onClick={() => change(!open)}/></div>
    {layout==='stacked'&&navigation}
  </header></>;
}
