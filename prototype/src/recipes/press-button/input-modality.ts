import { useLayoutEffect, type RefObject } from 'react';

type InputModality = 'keyboard' | 'pointer';
const navigationKeys = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' ', 'Escape']);
const documents = new WeakMap<Document, { roots: Set<HTMLElement>; mode: InputModality; dispose: () => void }>();

/** Local scope only: keeps real focus and never changes html/body or another app. */
export function registerInputModality(root: HTMLElement) {
  const doc = root.ownerDocument;
  let entry = documents.get(doc);
  if (!entry) {
    const roots = new Set<HTMLElement>();
    const update = (mode: InputModality) => {
      entry!.mode = mode;
      for (const scope of roots) scope.setAttribute('data-input-modality', mode);
    };
    const pointer = () => update('pointer');
    const keyboard = (event: KeyboardEvent) => {
      const editing = (event.target as Element | null)?.closest?.('input:not([type=checkbox],[type=radio],[type=range],[type=button],[type=submit],[type=reset]),textarea,[contenteditable="true"],[role="textbox"]');
      if (editing && event.key !== 'Tab') return;
      if (!event.isComposing && !event.metaKey && !event.ctrlKey && !event.altKey && navigationKeys.has(event.key)) update('keyboard');
    };
    doc.addEventListener('pointerdown', pointer, true);
    doc.addEventListener('keydown', keyboard, true);
    entry = { roots, mode: 'keyboard', dispose: () => { doc.removeEventListener('pointerdown', pointer, true); doc.removeEventListener('keydown', keyboard, true); } };
    documents.set(doc, entry);
  }
  const previous = root.getAttribute('data-input-modality');
  entry.roots.add(root);
  root.setAttribute('data-input-modality', entry.mode);
  return () => {
    entry!.roots.delete(root);
    if (previous === null) root.removeAttribute('data-input-modality');
    else root.setAttribute('data-input-modality', previous);
    if (entry!.roots.size === 0) { entry!.dispose(); documents.delete(doc); }
  };
}

export function useInputModality(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => root.current ? registerInputModality(root.current) : undefined, [root]);
}
