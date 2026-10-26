import { useLayoutEffect, useRef, useState, type Key, type ReactNode } from 'react';
import { SystemIconButton } from './SystemIconButton';
import { SystemIcon } from './SystemIcon';
import type { FeedbackTone } from './SystemBadge';
import './system-feedback.css';
import { createPortal } from 'react-dom';

const viewportHosts = new WeakMap<HTMLElement, { element: HTMLDivElement; users: number }>();
/** One shared corner stack per theme/modal; different toast producers cannot overlap. */
function ViewportToastPortal({ children }: { children: ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const root = anchor.current?.closest<HTMLElement>('dialog[open], [data-tallshift-theme], .system-study') ?? document.body;
    let entry = viewportHosts.get(root);
    if (!entry) { const element = document.createElement('div'); element.className = 'sf-toast-viewport'; root.appendChild(element); entry = { element, users: 0 }; viewportHosts.set(root, entry); }
    entry.users++; setHost(entry.element);
    return () => { if (--entry.users === 0) { entry.element.remove(); viewportHosts.delete(root); } };
  }, []);
  return <><span ref={anchor} hidden />{host && createPortal(children, host)}</>;
}
export interface SystemToast { id: string; title: ReactNode; description?: ReactNode; tone?: FeedbackTone; action?: ReactNode }
export interface SystemToastRegionProps {
  placement?: 'inline' | 'viewport';
  label: string; dismissLabel: string; items: readonly SystemToast[]; onDismiss: (id: string) => void;
  /** Announce only the latest change. Toast cards are deliberately not live regions. */
  announcement?: string; announcementKey?: Key; announcementPriority?: 'polite' | 'assertive' | 'off'; emptyContent?: ReactNode;
}
/** Inline specimens or a shared viewport stack; caller owns operation state and lifetime. */
export function SystemToastRegion({ label, dismissLabel, items, onDismiss, placement = 'viewport', announcement = '', announcementKey, announcementPriority = 'polite', emptyContent }: SystemToastRegionProps) {
  const region = useRef<HTMLDivElement>(null);
  function dismiss(id: string) {
    const host = region.current;
    const buttons = host ? [...host.querySelectorAll<HTMLButtonElement>('[data-toast-dismiss]')] : [];
    const current = buttons.findIndex(button => button.dataset.toastDismiss === id);
    // Transfer focus before removal only when it was inside the removed card.
    const activeCard = host?.ownerDocument.activeElement?.closest('[data-toast-id]');
    if (activeCard?.getAttribute('data-toast-id') === id) (buttons[current + 1] ?? buttons[current - 1] ?? host)?.focus();
    onDismiss(id);
  }
  const content = <div ref={region} data-placement={placement} className="sf-toast-region" role="region" aria-label={label} tabIndex={-1}>
    <div className="sf-live" role={announcementPriority === 'assertive' ? 'alert' : announcementPriority === 'polite' ? 'status' : undefined} aria-live={announcementPriority === 'off' ? 'off' : undefined} aria-atomic="true"><span key={announcementKey}>{announcement}</span></div>
    {items.length ? <ul className="sf-toast-list">{items.map(item => <li key={item.id} className="sf-toast" data-toast-id={item.id} data-tone={item.tone ?? 'neutral'}>
      <SystemIcon name={item.tone === 'success' ? 'check' : item.tone === 'error' ? 'error' : item.tone === 'warning' ? 'warning' : 'info'} />
      <div className="sf-message"><strong>{item.title}</strong>{item.description && <div className="sf-description">{item.description}</div>}</div>
      <SystemIconButton density="compact" icon="close" iconSize={16} variant="quiet" label={dismissLabel} data-toast-dismiss={item.id} onClick={() => dismiss(item.id)} />
      {item.action && <div className="sf-action">{item.action}</div>}
    </li>)}</ul> : emptyContent}
  </div>;
  return placement === 'viewport' ? <ViewportToastPortal>{content}</ViewportToastPortal> : content;
}
