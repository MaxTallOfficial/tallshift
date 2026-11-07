'use client';

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { nextTabId, tabIdentity, type TabsOrientation } from './tabs-model';
import { useInputModality } from './useInputModality';
import styles from './ContentTabs.module.css';

export interface ContentTab { id: string; label: ReactNode; content: ReactNode }
export interface ContentTabsProps {
  tabs: readonly ContentTab[];
  /** Accessible name for the group, such as "Project sections". */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  orientation?: TabsOrientation;
  accent?: string;
  duration?: number;
  motion?: 'off' | 'subtle' | 'expressive';
  className?: string;
}

/** Automatic activation: moving keyboard focus also selects the local panel. */
export function ContentTabs({ tabs, label, value, defaultValue, onValueChange, orientation = 'horizontal', accent = '#EBD183', duration = 160, motion = 'subtle', className = '' }: ContentTabsProps) {
  const ids = tabIdentity(tabs);
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(() => defaultValue ?? ids[0]);
  const candidate = value ?? internal;
  const selected = ids.includes(candidate) ? candidate : ids[0];
  const [focused, setFocused] = useState<string>();
  const focusId = focused && ids.includes(focused) ? focused : selected;
  const prefix = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  useInputModality(root);

  useLayoutEffect(() => {
    const group = list.current;
    const active = buttons.current.get(selected);
    if (!group || !active) return;
    const measure = () => {
      group.style.setProperty('--ct-offset', `${orientation === 'horizontal' ? active.offsetLeft : active.offsetTop}px`);
      group.style.setProperty('--ct-size', String(orientation === 'horizontal' ? active.offsetWidth : active.offsetHeight));
      group.setAttribute('data-measured', 'true');
    };
    measure();
    const view = group.ownerDocument.defaultView;
    const Observer = view?.ResizeObserver;
    if (Observer) {
      const observer = new Observer(measure);
      observer.observe(group);
      for (const button of buttons.current.values()) observer.observe(button);
      return () => observer.disconnect();
    }
    view?.addEventListener('resize', measure);
    return () => view?.removeEventListener('resize', measure);
  }, [selected, orientation, tabs]);

  function activate(id: string) {
    if (!controlled) setInternal(id);
    if (id !== selected) onValueChange?.(id);
  }

  const safeDuration = Number.isFinite(duration) ? Math.max(0, Math.min(480, Math.round(duration))) : 160;
  const color = /^#[\da-f]{6}$/i.test(accent) ? accent : '#EBD183';
  const variables = { '--ct-custom-accent': color, '--ct-duration': `${safeDuration}ms` } as CSSProperties;
  return <div ref={root} className={`${styles.root} ${className}`.trim()} style={variables} data-orientation={orientation} data-motion={motion}>
    <div ref={list} className={styles.list} role="tablist" aria-label={label} aria-orientation={orientation} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined); }}>
      {tabs.map((tab, index) => <button key={tab.id} ref={node => { if (node) buttons.current.set(tab.id, node); else buttons.current.delete(tab.id); }}
        type="button" role="tab" className={styles.tab} id={`${prefix}-tab-${index}`} aria-controls={`${prefix}-panel-${index}`} aria-selected={selected === tab.id}
        tabIndex={focusId === tab.id ? 0 : -1} onFocus={() => setFocused(tab.id)} onClick={() => activate(tab.id)}
        onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const next = nextTabId(ids, tab.id, event.key, orientation);
          if (!next) return;
          event.preventDefault();
          const button = buttons.current.get(next);
          button?.focus({ preventScroll: true });
          // Scroll only the tab strip. Focusing a long label must not move the page.
          if (button && list.current) {
            const viewport = list.current;
            if (orientation === 'horizontal') {
              const before = button.offsetLeft;
              const after = before + button.offsetWidth;
              if (before < viewport.scrollLeft) viewport.scrollLeft = before;
              else if (after > viewport.scrollLeft + viewport.clientWidth) viewport.scrollLeft = after - viewport.clientWidth;
            }
          }
          activate(next);
        }}>{tab.label}</button>)}
      <span className={styles.indicator} aria-hidden="true" />
    </div>
    <div className={styles.panels}>{tabs.map((tab, index) => <div key={tab.id} id={`${prefix}-panel-${index}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${index}`} tabIndex={0} hidden={selected !== tab.id} className={styles.panel}>{tab.content}</div>)}</div>
  </div>;
}
