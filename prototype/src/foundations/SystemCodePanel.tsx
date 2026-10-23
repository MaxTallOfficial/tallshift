import { useId, type ReactNode } from 'react';
import './system-workbench-panels.css';

export interface SystemCodePanelProps {
  /** An accessible name for the scrollable source region. */
  label: string;
  source: string;
  filePath: string;
  wrap?: boolean;
  toolbar?: ReactNode;
  navigation?: ReactNode;
  description?: ReactNode;
  className?: string;
}

function CodeText({ source }: { source: string }) {
  return <code>{source.split(/("[^"\n]*"|'[^'\n]*'|\b(?:import|from|export|default|function|return|const|as|true|false)\b|\b\d+\b)/g).map((part, index) => <span key={index} className={/^['"]/.test(part) ? 'system-code-string' : /^\d+$/.test(part) ? 'system-code-number' : /^(import|from|export|default|function|return|const|as|true|false)$/.test(part) ? 'system-code-keyword' : undefined}>{part}</span>)}</code>;
}

/** Source is rendered as React text, never interpreted as markup or executed. */
export function SystemCodePanel({ label, source, filePath, wrap = false, toolbar, navigation, description, className = '' }: SystemCodePanelProps) {
  const id = useId();
  return <div className={`system-code-panel ${className}`.trim()}>
    {toolbar}
    <div className={`system-code-layout ${navigation ? 'system-code-with-navigation' : ''}`}>
      {navigation}
      <pre className="system-code-source" data-wrap={wrap} data-file-path={filePath} tabIndex={0} role="region" aria-label={`${label}: ${filePath}`} aria-describedby={description ? `${id}-note` : undefined}><CodeText source={source} /></pre>
    </div>
    {description && <p id={`${id}-note`} className="system-panel-note">{description}</p>}
  </div>;
}
