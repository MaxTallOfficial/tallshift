import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import './file-select.css';

export type FileSelectOption = { value: string; label: string };
export type FileSelectProps = {
  label: string;
  value: string;
  options: FileSelectOption[];
  onChange: (value: string) => void;
  accent?: string;
};

type Placement = { top: number; left: number; width: number; maxHeight: number };

export function FileSelect({ label, value, options, onChange, accent = '#cfd98b' }: FileSelectProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const listId = `${id}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));
  const [placement, setPlacement] = useState<Placement>({ top: 0, left: 0, width: 0, maxHeight: 320 });
  const colorStyle = { '--file-accent': accent } as CSSProperties;
  const selected = options[selectedIndex];

  const openList = (index = Math.max(0, selectedIndex)) => {
    setActiveIndex(Math.min(Math.max(0, index), Math.max(0, options.length - 1)));
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    setOpen(false);
    onChange(option.value);
    triggerRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const position = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const inset = 12;
      const gap = 7;
      const view = window.visualViewport;
      const viewportLeft = view?.offsetLeft ?? 0;
      const viewportTop = view?.offsetTop ?? 0;
      const viewportWidth = view?.width ?? window.innerWidth;
      const viewportHeight = view?.height ?? window.innerHeight;
      const width = Math.min(Math.max(rect.width, 420), Math.max(0, viewportWidth - inset * 2));
      // Measure the content at its final width before deciding whether to flip.
      if (listRef.current) listRef.current.style.width = `${width}px`;
      const availableBelow = viewportTop + viewportHeight - rect.bottom - inset - gap;
      const availableAbove = rect.top - viewportTop - inset - gap;
      const contentHeight = Math.min(320, listRef.current?.scrollHeight ?? options.length * 46 + 12);
      const above = availableBelow < contentHeight && availableAbove > availableBelow;
      const maxHeight = Math.max(44, Math.min(320, above ? availableAbove : availableBelow));
      const height = Math.min(contentHeight, maxHeight);
      const left = Math.max(viewportLeft + inset, Math.min(rect.left, viewportLeft + viewportWidth - width - inset));
      const top = above ? Math.max(viewportTop + inset, rect.top - gap - height) : rect.bottom + gap;
      setPlacement({ top, left, width, maxHeight });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    };
    position();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [open, options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const item = list?.children[activeIndex] as HTMLElement | undefined;
    if (!list || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, activeIndex, placement.maxHeight]);

  useEffect(() => {
    if (!open) return;
    const isInside = (target: EventTarget | null) => target instanceof Node &&
      (triggerRef.current?.contains(target) || listRef.current?.contains(target));
    const onPointerDown = (event: PointerEvent) => {
      if (!isInside(event.target)) setOpen(false);
    };
    const onFocus = (event: FocusEvent) => {
      if (!isInside(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocus);
    };
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openList(selectedIndex >= 0 ? selectedIndex : event.key === 'ArrowUp' ? last : 0);
      else setActiveIndex((index) => Math.min(last, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1))));
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      openList(event.key === 'Home' ? 0 : last);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(activeIndex);
      else openList();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      clearTimeout(searchTimer.current);
      searchRef.current += event.key.toLocaleLowerCase();
      const query = searchRef.current;
      const start = open ? activeIndex + 1 : Math.max(0, selectedIndex);
      const find = (term: string) => options.findIndex((_, offset) => {
        const option = options[(start + offset) % options.length];
        const text = option.label.toLocaleLowerCase();
        return text.startsWith(term) || text.split('/').at(-1)?.startsWith(term);
      });
      let offset = find(query);
      if (offset < 0 && query.length > 1) {
        searchRef.current = event.key.toLocaleLowerCase();
        offset = find(searchRef.current);
      }
      if (offset >= 0) openList((start + offset) % options.length);
      searchTimer.current = setTimeout(() => { searchRef.current = ''; }, 650);
    }
  };

  return <div className="file-select" style={colorStyle}>
    <span id={labelId} className="file-select__label">{label}</span>
    <button
      ref={triggerRef}
      type="button"
      className="file-select__trigger"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={open && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
      aria-labelledby={`${labelId} ${valueId}`}
      onClick={() => open ? setOpen(false) : openList()}
      onKeyDown={onKeyDown}
    >
      <span id={valueId} className="file-select__value">{selected?.label ?? value}</span>
      <svg className="file-select__chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none">
        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    {open && createPortal(<ul
      ref={listRef}
      id={listId}
      role="listbox"
      aria-labelledby={labelId}
      className="file-select__list"
      style={{ ...colorStyle, ...placement }}
    >
      {options.map((option, index) => <li
        id={`${id}-option-${index}`}
        key={option.value}
        role="option"
        aria-selected={option.value === value}
        data-active={index === activeIndex ? 'true' : undefined}
        className="file-select__option"
        onPointerMove={() => setActiveIndex(index)}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => choose(index)}
      >
        <span className="file-select__path">{option.label}</span>
        <svg className="file-select__check" aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <path d="m5 10 3.2 3.2L15 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </li>)}
    </ul>, document.body)}
  </div>;
}

export default FileSelect;
