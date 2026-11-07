import { useLayoutEffect, type RefObject } from 'react';

type Mode = 'keyboard' | 'pointer';
const navigationKeys = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' ', 'Escape']);
const documents = new WeakMap<Document, { roots: Set<HTMLElement>; mode: Mode; dispose: () => void }>();

/** Listeners belong to this component's roots; html/body and focus are never modified. */
export function useInputModality(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const document = element.ownerDocument;
    let entry = documents.get(document);
    if (!entry) {
      const roots = new Set<HTMLElement>();
      const change = (mode: Mode) => {
        entry!.mode = mode;
        for (const scope of roots) scope.setAttribute('data-input-modality', mode);
      };
      const pointer = () => change('pointer');
      const keyboard = (event: KeyboardEvent) => {
        const editing = (event.target as Element | null)?.closest?.('input:not([type=checkbox],[type=radio],[type=range],[type=button],[type=submit],[type=reset],[type=color]),textarea,[contenteditable="true"],[role="textbox"]');
        if (editing && event.key !== 'Tab') return;
        if (!event.isComposing && !event.metaKey && !event.ctrlKey && !event.altKey && navigationKeys.has(event.key)) change('keyboard');
      };
      document.addEventListener('pointerdown', pointer, true);
      document.addEventListener('keydown', keyboard, true);
      entry = { roots, mode: 'keyboard', dispose: () => {
        document.removeEventListener('pointerdown', pointer, true);
        document.removeEventListener('keydown', keyboard, true);
      } };
      documents.set(document, entry);
    }
    const previous = element.getAttribute('data-input-modality');
    entry.roots.add(element);
    element.setAttribute('data-input-modality', entry.mode);
    return () => {
      entry!.roots.delete(element);
      if (previous === null) element.removeAttribute('data-input-modality');
      else element.setAttribute('data-input-modality', previous);
      if (!entry!.roots.size) {
        entry!.dispose();
        documents.delete(document);
      }
    };
  }, [root]);
}
