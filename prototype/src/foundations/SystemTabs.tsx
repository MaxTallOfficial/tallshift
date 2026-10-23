import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './system-tabs.css';

export interface SystemTabListOption<T extends string> { value: T; label: ReactNode; tabId: string; panelId: string; disabled?: boolean }
export interface SystemTabListProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SystemTabListOption<T>[];
  activation?: 'automatic' | 'manual';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/** Existing panels can adopt this keyboard model without changing their layout or lifecycle. */
export function SystemTabList<T extends string>({ label, value, onChange, options, activation = 'automatic', orientation = 'horizontal', className = '' }: SystemTabListProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const selected = options.find(option => option.value === value && !option.disabled)?.value ?? options.find(option => !option.disabled)?.value;
  const [focused, setFocused] = useState<T | undefined>(undefined);
  const focusValue = focused && options.some(option => option.value === focused && !option.disabled) ? focused : selected;
  function move(current: T, key: string) {
    const enabled = options.filter(option => !option.disabled);
    const index = enabled.findIndex(option => option.value === current);
    let target: SystemTabListOption<T> | undefined;
    if (key === 'Home') target = enabled[0];
    if (key === 'End') target = enabled.at(-1);
    if (key === (orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown')) target = enabled[(index + 1) % enabled.length];
    if (key === (orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp')) target = enabled[(index - 1 + enabled.length) % enabled.length];
    if (!target) return false;
    refs.current.get(target.value)?.focus();
    if (activation === 'automatic') onChange(target.value);
    return true;
  }
  return <div className={`system-tablist ${className}`.trim()} role="tablist" aria-label={label} aria-orientation={orientation} data-activation={activation} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined); }}>
    {options.map(option => <button key={option.value} ref={node => { if (node) refs.current.set(option.value, node); else refs.current.delete(option.value); }} type="button" role="tab" id={option.tabId} aria-controls={option.panelId} aria-selected={selected === option.value} disabled={option.disabled} tabIndex={focusValue === option.value ? 0 : -1} onFocus={() => setFocused(option.value)} onClick={() => onChange(option.value)} onKeyDown={event => { if (move(option.value, event.key)) event.preventDefault(); }}>{option.label}</button>)}
  </div>;
}

export interface SystemTabOption<T extends string> { value: T; label: ReactNode; content: ReactNode; disabled?: boolean }
export interface SystemTabsProps<T extends string> extends Omit<SystemTabListProps<T>, 'options'> { options: readonly SystemTabOption<T>[] }

/** Panels stay mounted in one grid cell to reserve the tallest panel's height. Values must be unique. */
export function SystemTabs<T extends string>({ options, className = '', orientation = 'horizontal', ...props }: SystemTabsProps<T>) {
  const id = useId();
  const selected = options.find(option => option.value === props.value && !option.disabled)?.value ?? options.find(option => !option.disabled)?.value;
  const listOptions = options.map((option, index) => ({ ...option, tabId: `${id}-tab-${index}`, panelId: `${id}-panel-${index}` }));
  return <div className={`system-tabs ${className}`.trim()} data-orientation={orientation}>
    <SystemTabList {...props} orientation={orientation} options={listOptions} />
    <div className="system-tabpanels">{options.map((option, index) => <div key={option.value} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} tabIndex={selected === option.value ? 0 : -1} aria-hidden={selected !== option.value || undefined} inert={selected !== option.value} data-active={selected === option.value} className="system-tabpanel">{option.content}</div>)}</div>
  </div>;
}
