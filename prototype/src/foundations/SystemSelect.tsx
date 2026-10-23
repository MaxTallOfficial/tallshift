import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import './system-select.css';

/** Option values must be unique within one select. */
export interface SystemSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}
export interface SystemSelectProps {
  label: string;
  value: string;
  options: readonly SystemSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  hint?: string;
}

function SelectIcon({ check = false }: { check?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={check ? 'm5 12 4 4L19 6' : 'm7 10 5 5 5-5'} /></svg>;
}
function searchText(value: string) {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLocaleLowerCase();
}

/** Select-only combobox. Its trigger keeps focus while the active option is announced. */
export function SystemSelect({ label, value, options, onChange, disabled = false, readOnly = false, hint }: SystemSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const [up, setUp] = useState(false);
  const [room, setRoom] = useState(240);
  const typeAhead = useRef({ text: '', time: 0 });
  const selectedIndex = options.findIndex(option => option.value === value);
  const selected = options[selectedIndex];
  const activeIndex = options.findIndex(option => option.value === activeValue && !option.disabled);
  const unavailable = disabled || options.length === 0;
  const expanded = open && !unavailable && !readOnly;
  const enabledIndices = options.flatMap((option, index) => option.disabled ? [] : [index]);

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const viewport = (event: Event) => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', viewport);
    window.addEventListener('scroll', viewport, true);
    window.visualViewport?.addEventListener('resize', viewport);
    window.visualViewport?.addEventListener('scroll', viewport);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', viewport);
      window.removeEventListener('scroll', viewport, true);
      window.visualViewport?.removeEventListener('resize', viewport);
      window.visualViewport?.removeEventListener('scroll', viewport);
    };
  }, [expanded]);
  useEffect(() => { if (unavailable || readOnly) setOpen(false); }, [unavailable, readOnly]);
  useLayoutEffect(() => {
    if (!expanded) return;
    const list = rootRef.current?.querySelector<HTMLElement>('[role="listbox"]');
    const item = list?.querySelector<HTMLElement>(`[data-system-select-index="${activeIndex}"]`);
    if (!list || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [activeIndex, expanded]);

  function show(index = selectedIndex, resetTypeAhead = true) {
    if (unavailable || readOnly) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const below = viewportTop + (viewport?.height ?? window.innerHeight) - rect.bottom;
      const above = rect.top - viewportTop;
      const wantedRoom = Math.min(options.length * 44 + 12, 240);
      const useAbove = below < wantedRoom + 12 && above > below;
      setUp(useAbove);
      setRoom(Math.max(0, Math.min(240, (useAbove ? above : below) - 12)));
    }
    if (resetTypeAhead) typeAhead.current = { text: '', time: 0 };
    const initial = options[index] && !options[index].disabled ? options[index] : options[enabledIndices[0]];
    setActiveValue(initial?.value ?? null);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (readOnly || disabled || !option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (unavailable || readOnly || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!expanded) show(selectedIndex >= 0 ? selectedIndex : direction > 0 ? enabledIndices[0] : enabledIndices[enabledIndices.length - 1]);
      else {
        const current = enabledIndices.indexOf(activeIndex);
        const position = current < 0 ? (direction > 0 ? 0 : enabledIndices.length - 1) : (current + direction + enabledIndices.length) % enabledIndices.length;
        setActiveValue(options[enabledIndices[position]]?.value ?? null);
      }
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'Home' ? enabledIndices[0] : enabledIndices[enabledIndices.length - 1];
      if (!expanded) show(next);
      else setActiveValue(options[next]?.value ?? null);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (expanded) choose(activeIndex);
      else show();
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const text = now - typeAhead.current.time < 700 ? typeAhead.current.text + event.key : event.key;
      const repeated = [...searchText(text)].every(character => character === searchText(event.key));
      const candidates = repeated
        ? [...enabledIndices.filter(index => index > activeIndex), ...enabledIndices.filter(index => index <= activeIndex)]
        : enabledIndices;
      let index = candidates.find(index => searchText(options[index].label).startsWith(searchText(repeated ? event.key : text))) ?? -1;
      const nextText = index < 0 || repeated ? event.key : text;
      if (index < 0) index = options.findIndex(option => !option.disabled && searchText(option.label).startsWith(searchText(event.key)));
      typeAhead.current = { text: nextText, time: now };
      if (index !== -1) {
        event.preventDefault();
        if (!expanded) show(index, false);
        else setActiveValue(options[index].value);
      }
    }
  }

  const groups: { label?: string; entries: {option: SystemSelectOption; index: number}[] }[] = [];
  options.forEach((option,index) => { let group = groups.at(-1); if (!group || group.label !== option.group) { group = {label:option.group, entries:[]}; groups.push(group); } group.entries.push({option,index}); });
  const optionNode = (option: SystemSelectOption, index: number) => <li key={option.value} id={`${id}-option-${index}`} data-system-select-index={index} role="option" aria-selected={value === option.value} aria-disabled={option.disabled || undefined} data-active={activeIndex === index || undefined} onPointerMove={event => { if (!option.disabled && event.pointerType !== 'touch') setActiveValue(option.value); }} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}><span>{option.label}</span>{value === option.value && <SelectIcon check />}</li>;
  return <div ref={rootRef} className={`sys-select${up ? ' sys-select-up' : ''}`} style={{ '--sys-menu-height': `${room}px` } as CSSProperties}>
    <span id={`${id}-label`} className="sys-select-label">{label}</span>
    <div className="sys-select-control">
    <button ref={triggerRef} type="button" className="sys-select-trigger" role="combobox" disabled={unavailable} aria-haspopup="listbox" aria-expanded={expanded} aria-readonly={readOnly || undefined} aria-describedby={hint ? `${id}-hint` : undefined} aria-controls={expanded ? `${id}-list` : undefined} aria-labelledby={`${id}-label ${id}-value`} aria-activedescendant={expanded && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined} onClick={() => expanded ? setOpen(false) : show()} onKeyDown={onKeyDown} onBlur={event => { if (!rootRef.current?.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <span id={`${id}-value`} title={selected?.label}>{selected?.label ?? '—'}</span><SelectIcon />
    </button>
    {expanded && <ul id={`${id}-list`} className="sys-select-list" role="listbox" aria-labelledby={`${id}-label`}>
      {groups.map((group,index) => group.label ? <li role="presentation" className="sys-select-group" key={index}><span className="sys-select-group-label" aria-hidden="true">{group.label}</span><ul role="group" aria-label={group.label}>{group.entries.map(entry => optionNode(entry.option,entry.index))}</ul></li> : group.entries.map(entry => optionNode(entry.option,entry.index)))}
    </ul>}
    </div>
    {hint && <p className="sys-select-hint" id={`${id}-hint`}>{hint}</p>}
  </div>;
}
