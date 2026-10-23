import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { SystemIcon } from './SystemIcon';
import './system-search-combobox.css';

export interface SystemSearchOption {
  value: string;
  label: string;
  detail?: string;
  meta?: string;
}

export interface SystemSearchComboboxProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (option: SystemSearchOption) => void;
  /** The caller supplies the already filtered, ordered local suggestions. Values must be unique. */
  options: readonly SystemSearchOption[];
  clearLabel: string;
  listLabel: string;
  emptyText: string;
  status?: 'ready' | 'loading' | 'error';
  loadingText?: string;
  errorText?: string;
  retryLabel?: string;
  onRetry?: () => void;
  hint?: string;
  locale?: string;
  disabled?: boolean;
  readOnly?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

interface MenuPlacement { above: boolean; height: number; width: number; left: number }

/** Editable, synchronous local search. Suggestions never filter a second time inside the control. */
export function SystemSearchCombobox({ label, placeholder, value, onChange, onSelect, options, clearLabel, listLabel, emptyText, hint, locale, status = 'ready', loadingText, errorText, retryLabel, onRetry, disabled = false, readOnly = false, inputRef }: SystemSearchComboboxProps) {
  const suggestions = status === 'ready' ? options : [];
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const composing = useRef(false);
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const [placement, setPlacement] = useState<MenuPlacement>({ above: false, height: 280, width: 0, left: 0 });
  const expanded = open && !disabled && !readOnly;
  const activeIndex = activeValue === null ? -1 : suggestions.findIndex(option => option.value === activeValue);
  const activeId = expanded && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  function close() {
    setOpen(false);
    setActiveValue(null);
  }
  function show() {
    if (disabled || readOnly) return;
    setOpen(true);
  }
  function select(index: number) {
    const option = suggestions[index];
    if (!option || disabled || readOnly) return;
    onChange(option.label);
    onSelect?.(option);
    close();
    ownInputRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => { if (disabled || readOnly) { setOpen(false); setActiveValue(null); } }, [disabled, readOnly]);
  useEffect(() => { setActiveValue(null); }, [value, status]);
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [expanded]);

  useLayoutEffect(() => {
    if (!expanded) return;
    const control = controlRef.current;
    if (!control) return;
    const position = () => {
      const rect = control.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const inset = 12;
      const gap = 8;
      const below = viewportTop + viewportHeight - rect.bottom - inset - gap;
      const above = rect.top - viewportTop - inset - gap;
      const desired = Math.min(280, Math.max(52, suggestions.length * 60 + 10));
      const useAbove = below < desired && above > below;
      const width = Math.max(0, Math.min(rect.width, viewportWidth - inset * 2));
      const left = Math.max(viewportLeft + inset, Math.min(rect.left, viewportLeft + viewportWidth - inset - width)) - rect.left;
      const next = { above: useAbove, height: Math.max(0, Math.min(280, useAbove ? above : below)), width, left };
      setPlacement(previous => previous.above === next.above && previous.height === next.height && previous.width === next.width && previous.left === next.left ? previous : next);
    };
    position();
    const scroll = (event: Event) => {
      // Scrolling the options themselves does not change the input's viewport position.
      if (!listRef.current?.contains(event.target as Node)) position();
    };
    window.addEventListener('resize', position);
    window.addEventListener('scroll', scroll, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    const observer = new ResizeObserver(position);
    observer.observe(control);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', scroll, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      observer.disconnect();
    };
  }, [expanded, suggestions.length]);

  useLayoutEffect(() => {
    if (!expanded || activeIndex < 0) return;
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-search-option-index="${activeIndex}"]`);
    if (!list || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [activeIndex, expanded]);

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled || readOnly || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show();
      if (!suggestions.length) { setActiveValue(null); return; }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const next = activeIndex < 0 ? (direction > 0 ? 0 : suggestions.length - 1) : (activeIndex + direction + suggestions.length) % suggestions.length;
      setActiveValue(suggestions[next].value);
    } else if (event.key === 'Enter' && expanded && activeIndex >= 0) {
      event.preventDefault();
      select(activeIndex);
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') close();
    // Home, End, Left and Right retain the native text caret behavior.
  }

  const menuStyle = { '--sys-search-menu-height': `${placement.height}px`, '--sys-search-menu-width': `${placement.width}px`, '--sys-search-menu-left': `${placement.left}px` } as CSSProperties;
  return <div ref={rootRef} className="sys-search" lang={locale} data-disabled={disabled || undefined} onBlur={event => { if (!rootRef.current?.contains(event.relatedTarget as Node)) close(); }}>
    <label htmlFor={`${id}-input`} className="sys-search-label">{label}</label>
    <div ref={controlRef} className="sys-search-control" data-expanded={expanded || undefined}>
      <span className="sys-search-icon"><SystemIcon name="search" size={20} /></span>
      <input ref={element => { ownInputRef.current = element; if (inputRef) inputRef.current = element; }} id={`${id}-input`} className="sys-search-input" type="text" inputMode="search" role="combobox" autoComplete="off" autoCorrect="off" spellCheck={false} disabled={disabled} readOnly={readOnly} aria-readonly={readOnly || undefined} value={value} placeholder={placeholder} aria-busy={status === 'loading' || undefined} aria-invalid={status === 'error' || undefined} aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded ? `${id}-list` : undefined} aria-activedescendant={activeId} aria-describedby={hint ? `${id}-hint` : undefined} onFocus={show} onClick={show} onChange={event => { onChange(event.target.value); setActiveValue(null); show(); }} onKeyDown={keyDown} onCompositionStart={() => { composing.current = true; setActiveValue(null); }} onCompositionEnd={() => { composing.current = false; }} />
      {value && !readOnly && <button className="sys-search-clear" type="button" disabled={disabled} aria-label={clearLabel} onPointerDown={event => event.preventDefault()} onClick={() => { onChange(''); setActiveValue(null); show(); ownInputRef.current?.focus({ preventScroll: true }); }}><SystemIcon name="close" size={20} /></button>}
      {expanded && <div className={`sys-search-menu${placement.above ? ' sys-search-menu-above' : ''}`} style={menuStyle}>
        <ul ref={listRef} id={`${id}-list`} className="sys-search-list" role="listbox" aria-label={listLabel}>
          {suggestions.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} data-search-option-index={index} role="option" aria-selected={activeIndex === index} data-active={activeIndex === index || undefined} onPointerMove={event => { if (event.pointerType !== 'touch') setActiveValue(option.value); }} onMouseDown={event => event.preventDefault()} onClick={() => select(index)}>
            <span className="sys-search-option-copy"><span className="sys-search-option-label">{option.label}</span>{option.detail && <span className="sys-search-option-detail">{option.detail}</span>}</span>
            {option.meta && <span className="sys-search-option-meta">{option.meta}</span>}
          </li>)}
        </ul>
        {status === 'loading' && <p className="sys-search-empty" role="status">{loadingText ?? hint ?? label}</p>}
        {status === 'error' && <div className="sys-search-empty"><p role="alert">{errorText ?? hint ?? label}</p>{onRetry && retryLabel && <button type="button" className="sys-search-retry" onClick={() => { ownInputRef.current?.focus(); onRetry(); }}>{retryLabel}</button>}</div>}
        {status === 'ready' && !suggestions.length && <p className="sys-search-empty" role="status">{emptyText}</p>}
      </div>}
    </div>
    {hint && <p className="sys-search-hint" id={`${id}-hint`}>{hint}</p>}
  </div>;
}
