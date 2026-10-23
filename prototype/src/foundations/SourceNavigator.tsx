import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { sourceNavigationWords } from './source-navigation-copy';
import './source-navigator.css';

export interface SourceNavigatorProps {
  locale: 'en' | 'ru' | 'vi';
  files: readonly { path: string; content: string }[];
  selectedPath: string;
  onSelect: (path: string) => void;
  onCopy: () => void;
  copyBusy: boolean;
}

type FileNode = { name: string; path: string; children?: FileNode[] };

/** Organises real relative paths; the visible root is a file group, never an invented path. */
function fileHierarchy(files: SourceNavigatorProps['files']): FileNode[] {
  const root: FileNode[] = [];
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let siblings = root;
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/');
      let node = siblings.find(item => item.path === path);
      if (!node) {
        node = { name: part, path, ...(index < parts.length - 1 ? { children: [] } : {}) };
        siblings.push(node);
      }
      if (node.children) siblings = node.children;
    });
  }
  return root;
}

function Icon({ kind }: { kind: 'folder' | 'file' | 'more' | 'info' | 'close' }) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{
    kind === 'folder' ? <path d="M2.5 6V4.5h5l2 2h8v9h-15V6Z" /> :
    kind === 'file' ? <><path d="M5 2.5h6l4 4v11H5Z" /><path d="M11 2.5v4h4M7.5 10h5M7.5 13h5" /></> :
    kind === 'more' ? <><circle cx="4" cy="10" r=".7" fill="currentColor" /><circle cx="10" cy="10" r=".7" fill="currentColor" /><circle cx="16" cy="10" r=".7" fill="currentColor" /></> :
    kind === 'info' ? <><circle cx="10" cy="10" r="7" /><path d="M10 9v4M10 6.5h.01" /></> : <path d="m5 5 10 10M15 5 5 15" />
  }</svg>;
}

function fileType(path: string) {
  const extension = path.split('.').at(-1)?.toLowerCase();
  return ({ tsx: 'TypeScript + React (.tsx)', ts: 'TypeScript (.ts)', jsx: 'JavaScript + React (.jsx)', js: 'JavaScript (.js)', css: 'CSS (.css)', json: 'JSON (.json)', md: 'Markdown (.md)', txt: 'Text (.txt)' } as Record<string, string>)[extension ?? ''] ?? (extension ? `.${extension}` : 'Text');
}

/** Native disclosure lists deliberately avoid pretending to implement an ARIA tree widget. */
export function SourceNavigator({ locale, files, selectedPath, onSelect, onCopy, copyBusy }: SourceNavigatorProps) {
  const t = sourceNavigationWords[locale];
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const infoTrigger = useRef<HTMLButtonElement>(null);
  const infoClose = useRef<HTMLButtonElement>(null);
  const filesTrigger = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [menuUp, setMenuUp] = useState(false);
  const [infoUp, setInfoUp] = useState(false);
  const [menuRight, setMenuRight] = useState(0);
  const [infoRight, setInfoRight] = useState(0);
  const openingMenuIndex = useRef<'first' | 'last'>('first');
  const hierarchy = useMemo(() => fileHierarchy(files), [files]);
  const selected = files.find(file => file.path === selectedPath) ?? files[0];

  useEffect(() => {
    if (!menuOpen && !infoOpen) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuOpen && !menuRef.current?.contains(target) && !menuTrigger.current?.contains(target)) setMenuOpen(false);
      if (infoOpen && !rootRef.current?.querySelector('.sn-info')?.contains(target) && !infoTrigger.current?.contains(target)) setInfoOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (menuOpen) { setMenuOpen(false); menuTrigger.current?.focus({ preventScroll: true }); }
      else if (infoOpen) { setInfoOpen(false); infoTrigger.current?.focus({ preventScroll: true }); }
    };
    const focusOutside = (event: FocusEvent) => {
      const target = event.target as Node;
      if (menuOpen && !menuRef.current?.contains(target) && !menuTrigger.current?.contains(target)) setMenuOpen(false);
      if (infoOpen && !rootRef.current?.querySelector('.sn-info')?.contains(target) && !infoTrigger.current?.contains(target)) setInfoOpen(false);
    };
    const resized = () => { setMenuOpen(false); setInfoOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    document.addEventListener('focusin', focusOutside);
    window.addEventListener('resize', resized);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('focusin', focusOutside);
      window.removeEventListener('resize', resized);
    };
  }, [menuOpen, infoOpen]);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    (openingMenuIndex.current === 'last' ? items.at(-1) : items[0])?.focus({ preventScroll: true });
  }, [menuOpen]);
  useLayoutEffect(() => { if (infoOpen) infoClose.current?.focus({ preventScroll: true }); }, [infoOpen]);
  useEffect(() => {
    const media = matchMedia('(min-width: 768px)');
    const onChange = () => { if (media.matches) sheetRef.current?.close(); };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  useEffect(() => { setNotice(''); }, [selectedPath, locale]);

  function showMenu(last = false) {
    if (!selected) return;
    setInfoOpen(false);
    const rect = menuTrigger.current?.getBoundingClientRect();
    setMenuUp(Boolean(rect && innerHeight - rect.bottom < 132 && rect.top > 132));
    setMenuRight(rect ? Math.min(0, rect.right - Math.min(252, innerWidth - 48) - 16) : 0);
    openingMenuIndex.current = last ? 'last' : 'first';
    setMenuOpen(true);
  }
  function menuKey(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (index + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
    else if (event.key === 'Tab') setMenuOpen(false);
  }
  function closeMenu() { setMenuOpen(false); menuTrigger.current?.focus({ preventScroll: true }); }
  function download() {
    if (!selected) return;
    try {
      const url = URL.createObjectURL(new Blob([selected.content], { type: 'text/plain;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = selected.path.split('/').at(-1) ?? selected.path;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setNotice(t.downloaded);
    } catch { setNotice(t.downloadFailed); }
    closeMenu();
  }
  function openSheet() {
    setMenuOpen(false); setInfoOpen(false);
    const dialog = sheetRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal(); setSheetOpen(true);
  }
  function select(path: string, inSheet: boolean) {
    onSelect(path);
    if (inSheet) sheetRef.current?.close();
  }
  function sheetKey(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const stops = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), summary, [href], input:not(:disabled), [tabindex="0"]'))
      .filter(element => element.getClientRects().length > 0);
    const first = stops[0];
    const last = stops.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  function list(nodes: FileNode[], inSheet: boolean) {
    return <ul className="sn-file-list">{nodes.map(node => <li key={node.path}>{node.children ? <details open><summary><Icon kind="folder" /><span>{node.name}</span></summary>{list(node.children, inSheet)}</details> : <button type="button" className="sn-file" title={node.path} aria-current={selected?.path === node.path ? 'true' : undefined} onClick={() => select(node.path, inSheet)}><Icon kind="file" /><span>{node.name}</span>{selected?.path === node.path && <span className="sn-selected-dot" aria-hidden="true" />}</button>}</li>)}</ul>;
  }
  function fileList(inSheet: boolean) {
    return files.length ? <details className="sn-source-group" open><summary><Icon kind="folder" /><span>{t.sourceFiles}</span><span className="sn-count">{files.length}</span></summary>{list(hierarchy, inSheet)}</details> : <p className="sn-empty">{t.empty}</p>;
  }

  return <div className="sn-navigation" ref={rootRef} aria-label={t.navigation}>
    <div className="sn-toolbar">
      <button type="button" className="sn-control sn-files-trigger" ref={filesTrigger} aria-haspopup="dialog" aria-controls={`${id}-sheet`} aria-expanded={sheetOpen} onClick={openSheet}><Icon kind="folder" /><span>{t.files}</span><span className="sn-count">{files.length}</span></button>
      <span className="sn-desktop-title">{t.files}<span className="sn-count">{files.length}</span></span>
      <div className="sn-menu-wrap">
        <button type="button" className="sn-control sn-icon-control" ref={menuTrigger} title={t.actions} aria-label={t.actions} aria-haspopup="menu" aria-controls={`${id}-menu`} aria-expanded={menuOpen} disabled={!selected} onClick={() => menuOpen ? closeMenu() : showMenu()} onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); showMenu(event.key === 'ArrowUp' || event.key === 'End'); } }}><Icon kind="more" /></button>
        {menuOpen && <div id={`${id}-menu`} className={`sn-menu${menuUp ? ' sn-up' : ''}`} style={{ right: menuRight }} ref={menuRef} role="menu" aria-label={t.actions} onKeyDown={menuKey}>
          <button type="button" role="menuitem" tabIndex={-1} disabled={copyBusy} onClick={() => { onCopy(); closeMenu(); }}>{copyBusy ? t.copying : t.copy}</button>
          <button type="button" role="menuitem" tabIndex={-1} onClick={download}>{t.download}</button>
        </div>}
      </div>
      <div className="sn-info-wrap">
        <button type="button" className="sn-control sn-icon-control" ref={infoTrigger} title={t.about} aria-label={t.about} aria-haspopup="dialog" aria-controls={`${id}-info`} aria-expanded={infoOpen} disabled={!selected} onClick={() => { setMenuOpen(false); const rect = infoTrigger.current?.getBoundingClientRect(); setInfoUp(Boolean(rect && innerHeight - rect.bottom < 320 && rect.top > 320)); setInfoRight(rect ? Math.min(0, rect.right - Math.min(304, innerWidth - 48) - 16) : 0); setInfoOpen(!infoOpen); }}><Icon kind="info" /></button>
        {infoOpen && selected && <div className={`sn-info${infoUp ? ' sn-up' : ''}`} style={{ right: infoRight }} id={`${id}-info`} role="dialog" aria-modal="false" aria-labelledby={`${id}-info-title`}>
          <header><h4 id={`${id}-info-title`}>{t.about}</h4><button ref={infoClose} type="button" className="sn-control sn-icon-control" aria-label={t.close} onClick={() => { setInfoOpen(false); infoTrigger.current?.focus({ preventScroll: true }); }}><Icon kind="close" /></button></header>
          <dl><div><dt>{t.path}</dt><dd>{selected.path}</dd></div><div><dt>{t.type}</dt><dd>{fileType(selected.path)}</dd></div><div><dt>{t.bytes}</dt><dd>{new Intl.NumberFormat(locale).format(new TextEncoder().encode(selected.content).byteLength)} {t.byteUnit}</dd></div></dl>
        </div>}
      </div>
    </div>
    <nav className="sn-desktop-files" aria-label={t.sourceFiles}>{fileList(false)}</nav>
    <p className="sn-status" role="status">{notice}</p>
    <dialog className="sn-sheet" id={`${id}-sheet`} ref={sheetRef} aria-labelledby={`${id}-sheet-title`} aria-describedby={`${id}-sheet-description`} onKeyDown={sheetKey} onClose={() => { setSheetOpen(false); requestAnimationFrame(() => { if (filesTrigger.current && getComputedStyle(filesTrigger.current).display !== 'none') filesTrigger.current.focus({ preventScroll: true }); else menuTrigger.current?.focus({ preventScroll: true }); }); }}>
      <header><h3 id={`${id}-sheet-title`}>{t.files}</h3><button autoFocus type="button" className="sn-control sn-icon-control" aria-label={t.close} onClick={() => sheetRef.current?.close()}><Icon kind="close" /></button></header>
      <p id={`${id}-sheet-description`}>{t.sheetDescription}</p>
      <nav aria-label={t.sourceFiles}>{fileList(true)}</nav>
    </dialog>
  </div>;
}
