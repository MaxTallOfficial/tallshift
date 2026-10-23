import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { SystemBrandMark } from './SystemBrandMark';
import { SystemButton } from './SystemButton';
import './system-shell.css';
export interface SystemNavigationItem { id: string; href: string; label: string }
export interface SystemNavigationShellProps {
  brand?: ReactNode; edition?: ReactNode; localeControl?: ReactNode; label: string;
  items: readonly SystemNavigationItem[]; activeId?: string;
  skipLink?: { href: string; label: string }; menuLabels?: { open: string; close: string };
  className?: string; mobileOpen?: boolean; onMobileOpenChange?: (open: boolean) => void;
}
export function SystemNavigationShell({ brand = <SystemBrandMark />, edition, localeControl, label, items, activeId, skipLink, menuLabels = { open: 'Open navigation', close: 'Close navigation' }, className = '', mobileOpen, onMobileOpenChange }: SystemNavigationShellProps) {
  const id = useId(); const [localOpen, setLocalOpen] = useState(false); const open = mobileOpen ?? localOpen;
  const toggle = useRef<HTMLButtonElement>(null);
  const change = (next: boolean) => { if (mobileOpen === undefined) setLocalOpen(next); onMobileOpenChange?.(next); };
  useEffect(() => {
    const media = matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (media.matches && open) change(false); };
    media.addEventListener('change',closeOnDesktop); closeOnDesktop();
    return () => media.removeEventListener('change',closeOnDesktop);
  },[open,mobileOpen,onMobileOpenChange]);
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
  return <>{skipLink && <a className="system-shell-skip" href={skipLink.href}>{skipLink.label}</a>}<header className={`system-shell ${className}`.trim()} data-mobile-open={open} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); change(false); toggle.current?.focus(); } }}>
    <div className="system-shell-main">{brand}{edition && <span className="system-shell-edition">{edition}</span>}{localeControl && <div className="system-shell-locale">{localeControl}</div>}<SystemButton ref={toggle} className="system-shell-toggle" aria-expanded={open} aria-controls={`${id}-navigation`} onClick={() => change(!open)}>{open ? menuLabels.close : menuLabels.open}</SystemButton></div>
    <nav id={`${id}-navigation`} aria-label={label}>{items.map(item => <a key={item.id} href={item.href} aria-current={activeId === item.id ? 'location' : undefined} onClick={event => navigate(item,event)}>{item.label}</a>)}</nav>
  </header></>;
}
