import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { SystemIconButton } from './SystemIconButton';
import './system-dialog.css';

export type SystemModalCloseReason = 'close-button' | 'escape' | 'native';
export interface SystemDialogProps {
  id?: string;
  open: boolean;
  onOpenChange: (open: boolean, reason: SystemModalCloseReason) => void;
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  variant?: 'dialog' | 'sheet';
}

const scrollLocks = new WeakMap<Document, { count: number; overflow: string }>();
function lockScroll(doc: Document) {
  const existing = scrollLocks.get(doc);
  if (existing) existing.count += 1;
  else { scrollLocks.set(doc, { count: 1, overflow: doc.documentElement.style.overflow }); doc.documentElement.style.overflow = 'hidden'; }
  return () => {
    const lock = scrollLocks.get(doc);
    if (!lock) return;
    lock.count -= 1;
    if (!lock.count) { doc.documentElement.style.overflow = lock.overflow; scrollLocks.delete(doc); }
  };
}
function focusable(element: HTMLElement | null | undefined): element is HTMLElement {
  return !!element?.isConnected && (element.tabIndex >= 0 || element.hasAttribute('tabindex') || element.isContentEditable) && !element.matches(':disabled') && !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}

/** Native modal top layer owns containment and background inertness. Callers own open state and form values. */
export function SystemDialog({ id: dialogId, open, onOpenChange, title, description, closeLabel, children, footer, initialFocusRef, returnFocusRef, fallbackFocusRef, className = '', variant = 'dialog' }: SystemDialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const current = useRef({ open, onOpenChange, initialFocusRef, returnFocusRef, fallbackFocusRef });
  current.current = { open, onOpenChange, initialFocusRef, returnFocusRef, fallbackFocusRef };
  const releaseScroll = useRef<(() => void) | null>(null);
  const restoreFocus = () => {
    if (!releaseScroll.current && !previousFocus.current) return;
    releaseScroll.current?.(); releaseScroll.current = null;
    const config = current.current;
    const target = [config.returnFocusRef?.current, previousFocus.current, config.fallbackFocusRef?.current].find(focusable);
    target?.focus({ preventScroll: true });
    previousFocus.current = null;
  };
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const active = dialog.ownerDocument.activeElement;
      previousFocus.current = active instanceof HTMLElement ? active : null;
      dialog.showModal();
      releaseScroll.current = lockScroll(dialog.ownerDocument);
      const initial = current.current.initialFocusRef?.current;
      if (initial && dialog.contains(initial) && focusable(initial)) initial.focus({ preventScroll: true });
      else titleRef.current?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      dialog.close();
      restoreFocus();
    }
  }, [open]);
  useEffect(() => { const dialog = dialogRef.current; return () => { dialog?.close(); restoreFocus(); }; }, []);

  return <dialog id={dialogId} ref={dialogRef} className={`system-dialog ${className}`.trim()} data-variant={variant} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
    onKeyDown={event => {
      if (event.key !== 'Tab' || event.defaultPrevented) return;
      const dialog = event.currentTarget;
      const stops = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]')]
        .filter(element => element.tabIndex >= 0 && focusable(element));
      const first = stops[0], last = stops.at(-1);
      const active = dialog.ownerDocument.activeElement;
      if (!first) { event.preventDefault(); titleRef.current?.focus(); }
      else if (event.shiftKey && (active === first || active === titleRef.current || active === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (active === last || active === dialog)) { event.preventDefault(); first.focus(); }
    }}
    onCancel={event => { event.preventDefault(); current.current.onOpenChange(false, 'escape'); }}
    onClose={event => { if (event.currentTarget.open) return; if (current.current.open) current.current.onOpenChange(false, 'native'); restoreFocus(); }}>
    <header className="system-dialog-heading">
      <div><h2 ref={titleRef} tabIndex={-1} id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div>
      <SystemIconButton density="compact" icon="close" label={closeLabel} variant="quiet" onClick={() => onOpenChange(false, 'close-button')} />
    </header>
    <div className="system-dialog-content">{children}</div>
    {footer && <footer className="system-dialog-footer">{footer}</footer>}
  </dialog>;
}
