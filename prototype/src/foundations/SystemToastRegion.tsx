import { useRef, type Key, type ReactNode } from 'react';
import { SystemIconButton } from './SystemIconButton';
import { SystemIcon } from './SystemIcon';
import type { FeedbackTone } from './SystemBadge';
import './system-feedback.css';
export interface SystemToast { id: string; title: ReactNode; description?: ReactNode; tone?: FeedbackTone; action?: ReactNode }
export interface SystemToastRegionProps {
  label: string; dismissLabel: string; items: readonly SystemToast[]; onDismiss: (id: string) => void;
  /** Announce only the latest change. Toast cards are deliberately not live regions. */
  announcement?: string; announcementKey?: Key; announcementPriority?: 'polite' | 'assertive' | 'off'; emptyContent?: ReactNode;
}
/** Inline queue. Caller places it in the layout and owns all lifetime/operation state. */
export function SystemToastRegion({ label, dismissLabel, items, onDismiss, announcement = '', announcementKey, announcementPriority = 'polite', emptyContent }: SystemToastRegionProps) {
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
  return <div ref={region} className="sf-toast-region" role="region" aria-label={label} tabIndex={-1}>
    <div className="sf-live" role={announcementPriority === 'assertive' ? 'alert' : announcementPriority === 'polite' ? 'status' : undefined} aria-live={announcementPriority === 'off' ? 'off' : undefined} aria-atomic="true"><span key={announcementKey}>{announcement}</span></div>
    {items.length ? <ul className="sf-toast-list">{items.map(item => <li key={item.id} className="sf-toast" data-toast-id={item.id} data-tone={item.tone ?? 'neutral'}>
      <SystemIcon name={item.tone === 'success' ? 'check' : item.tone === 'error' ? 'error' : item.tone === 'warning' ? 'warning' : 'info'} />
      <div className="sf-message"><strong>{item.title}</strong>{item.description && <div className="sf-description">{item.description}</div>}</div>
      <SystemIconButton density="compact" icon="close" iconSize={16} variant="quiet" label={dismissLabel} data-toast-dismiss={item.id} onClick={() => dismiss(item.id)} />
      {item.action && <div className="sf-action">{item.action}</div>}
    </li>)}</ul> : emptyContent}
  </div>;
}
