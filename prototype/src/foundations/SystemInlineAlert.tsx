import type { ReactNode } from 'react';
import { SystemIcon } from './SystemIcon';
import type { FeedbackTone } from './SystemBadge';
import './system-feedback.css';
export interface SystemInlineAlertProps {
  title: ReactNode; children?: ReactNode; tone?: FeedbackTone; action?: ReactNode;
  /** Static by default. Enable only for a newly inserted, meaningful message. */
  announce?: 'off' | 'polite' | 'assertive'; className?: string;
}
export function SystemInlineAlert({ title, children, tone = 'neutral', action, announce = 'off', className = '' }: SystemInlineAlertProps) {
  return <div className={`sf-alert ${className}`.trim()} data-tone={tone} role={announce === 'polite' ? 'status' : announce === 'assertive' ? 'alert' : undefined} aria-atomic={announce === 'off' ? undefined : true}>
    <SystemIcon name={tone === 'success' ? 'check' : tone === 'warning' ? 'warning' : tone === 'error' ? 'error' : 'info'} />
    <div className="sf-message"><strong>{title}</strong>{children && <div className="sf-description">{children}</div>}{action && <div className="sf-action">{action}</div>}</div>
  </div>;
}
