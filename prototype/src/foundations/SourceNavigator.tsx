import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { sourceNavigationWords } from './source-navigation-copy';
import './source-navigator.css';
import { SystemIcon } from './SystemIcon';
import { SystemMenu } from './SystemMenu';
import { SystemPopover } from './SystemPopover';
import { SystemSheet } from './SystemSheet';

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

function Icon({kind}:{kind:'folder'|'file'|'more'|'info'|'close'}) { return <SystemIcon name={kind==='more'?'chevron-down':kind}/>; }

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
  const filesTrigger = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const hierarchy = useMemo(() => fileHierarchy(files), [files]);
  const selected = files.find(file => file.path === selectedPath) ?? files[0];

  useEffect(() => {
    const media = matchMedia('(min-width: 768px)');
    const onChange = () => { if (media.matches) setSheetOpen(false); };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  useEffect(() => { setNotice(''); }, [selectedPath, locale]);

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
    setMenuOpen(false);
  }
  function openSheet() {
    setMenuOpen(false); setInfoOpen(false);
    setSheetOpen(true);
  }
  function select(path: string, inSheet: boolean) {
    onSelect(path);
    if (inSheet) setSheetOpen(false);
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
        <SystemMenu label={t.actions} align="end" open={menuOpen} onOpenChange={next => { setMenuOpen(next); if (next) setInfoOpen(false); }} trigger={props => <button {...props} ref={node => { props.ref.current = node; menuTrigger.current = node; }} type="button" className="sn-control sn-icon-control sn-dropdown-control" aria-label={t.actions} title={t.actions} disabled={!selected}><Icon kind="file" /><SystemIcon name={props['aria-expanded'] ? 'chevron-up' : 'chevron-down'} size={16} /></button>} items={[
          { id: 'copy', label: copyBusy ? t.copying : t.copy, disabled: copyBusy, onSelect: onCopy },
          { id: 'download', label: t.download, onSelect: download },
        ]} />
      </div>
      <div className="sn-info-wrap">
        <SystemPopover title={t.about} closeLabel={t.close} open={infoOpen} onOpenChange={next => { setInfoOpen(next); if (next) setMenuOpen(false); }} trigger={props => <button {...props} type="button" className="sn-control sn-icon-control sn-dropdown-control" aria-label={t.about} disabled={!selected}><Icon kind="info" /><SystemIcon name={props['aria-expanded'] ? 'chevron-up' : 'chevron-down'} size={16} /></button>}>
          {selected && <dl><div><dt>{t.path}</dt><dd>{selected.path}</dd></div><div><dt>{t.type}</dt><dd>{fileType(selected.path)}</dd></div><div><dt>{t.bytes}</dt><dd>{new Intl.NumberFormat(locale).format(new TextEncoder().encode(selected.content).byteLength)} {t.byteUnit}</dd></div></dl>}
        </SystemPopover>
      </div>
    </div>
    <nav className="sn-desktop-files" aria-label={t.sourceFiles}>{fileList(false)}</nav>
    <p className="sn-status" role="status">{notice}</p>
    <SystemSheet id={`${id}-sheet`} open={sheetOpen} onOpenChange={setSheetOpen} title={t.files} description={t.sheetDescription} closeLabel={t.close} returnFocusRef={filesTrigger} fallbackFocusRef={menuTrigger}>
      <nav aria-label={t.sourceFiles}>{fileList(true)}</nav>
    </SystemSheet>
  </div>;
}
