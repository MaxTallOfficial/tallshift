import { useId, type ReactNode } from 'react';
import { SystemIcon, type SystemIconName } from './SystemIcon';
import './system-feedback.css';
export function SystemEmptyState({ title, children, action, icon = 'search', headingLevel = 3 }: { title: string; children?: ReactNode; action?: ReactNode; icon?: SystemIconName; headingLevel?: 2 | 3 | 4 }) {
  const id = useId(); const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return <section className="sf-empty" aria-labelledby={id}><SystemIcon name={icon} size={24} /><Heading id={id}>{title}</Heading>{children && <div className="sf-description">{children}</div>}{action && <div className="sf-action">{action}</div>}</section>;
}
