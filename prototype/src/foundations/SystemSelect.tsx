import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import './system-select.css';

export interface SystemSelectOption {
  value: string;
  label: string;
}
export interface SystemSelectProps {
  label: string;
  value: string;
  options: readonly SystemSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function SelectIcon({ check = false }: { check?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={check ? 'm5 12 4 4L19 6' : 'm7 10 5 5 5-5'} /></svg>;
}
function searchText(value: string) {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLocaleLowerCase();
}

/** Select-only combobox. Its trigger keeps focus while the active option is announced. */
export function SystemSelect({ label, value, options, onChange, disabled = false }: SystemSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [up, setUp] = useState(false);
  const [room, setRoom] = useState(240);
  const typeAhead = useRef({ text: '', time: 0 });
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const selected = options[selectedIndex];
  const unavailable = disabled || options.length === 0;

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const viewport = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', viewport);
    window.addEventListener('scroll', viewport, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', viewport);
      window.removeEventListener('scroll', viewport, true);
    };
  }, [open]);
  useEffect(() => { if (unavailable) setOpen(false); }, [unavailable]);
  useLayoutEffect(() => {
    if (!open) return;
    const list = rootRef.current?.querySelector<HTMLElement>('[role="listbox"]');
    const item = list?.querySelector<HTMLElement>(`[data-system-select-index="${activeIndex}"]`);
    if (!list || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [activeIndex, open]);

  function show(index = selectedIndex, resetTypeAhead = true) {
    if (unavailable) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      const above = rect.top;
      const wantedRoom = Math.min(options.length * 44 + 12, 240);
      const useAbove = below < wantedRoom + 12 && above > below;
      setUp(useAbove);
      setRoom(Math.max(44, Math.min(240, (useAbove ? above : below) - 12)));
    }
    if (resetTypeAhead) typeAhead.current = { text: '', time: 0 };
    setActiveIndex(index);
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (unavailable) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) show(selectedIndex);
      else setActiveIndex(index => (index + direction + options.length) % options.length);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : options.length - 1;
      if (!open) show(next);
      else setActiveIndex(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(activeIndex);
      else show();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const text = now - typeAhead.current.time < 700 ? typeAhead.current.text + event.key : event.key;
      let index = options.findIndex(option => searchText(option.label).startsWith(searchText(text)));
      const nextText = index < 0 ? event.key : text;
      if (index < 0) index = options.findIndex(option => searchText(option.label).startsWith(searchText(event.key)));
      typeAhead.current = { text: nextText, time: now };
      if (index !== -1) {
        event.preventDefault();
        if (!open) show(index, false);
        else setActiveIndex(index);
      }
    }
  }

  return <div ref={rootRef} className={`sys-select${up ? ' sys-select-up' : ''}`} style={{ '--sys-menu-height': `${room}px` } as CSSProperties}>
    <span id={`${id}-label`} className="sys-select-label">{label}</span>
    <button type="button" className="sys-select-trigger" role="combobox" disabled={unavailable} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-labelledby={`${id}-label ${id}-value`} aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined} onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown} onBlur={event => { if (!rootRef.current?.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <span id={`${id}-value`} title={selected?.label}>{selected?.label ?? '—'}</span><SelectIcon />
    </button>
    {open && <ul id={`${id}-list`} className="sys-select-list" role="listbox" aria-labelledby={`${id}-label`}>
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} data-system-select-index={index} role="option" aria-selected={value === option.value} data-active={activeIndex === index || undefined} onPointerMove={() => setActiveIndex(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}</span>{value === option.value && <SelectIcon check />}
      </li>)}
    </ul>}
  </div>;
}
