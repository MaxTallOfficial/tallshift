import type { ReactNode } from 'react';
import './system-feedback.css';
export type FeedbackTone = 'neutral' | 'success' | 'warning' | 'error';
/** Passive text: access/availability must be stated by its label, never by color alone. */
export function SystemBadge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: FeedbackTone; className?: string }) {
  return <span className={`sf-badge ${className}`.trim()} data-tone={tone}>{children}</span>;
}
