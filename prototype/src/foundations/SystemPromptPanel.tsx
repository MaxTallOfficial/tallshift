import { useId, type ReactNode } from 'react';
import './system-workbench-panels.css';

export interface SystemPromptPanelProps {
  label: string;
  /** Exact source of truth for copying. This component makes no network request. */
  prompt: string;
  /** Optional readable projection; it must derive from the same prompt string. */
  children?: ReactNode;
  controls?: ReactNode;
  description?: ReactNode;
  className?: string;
}

export function SystemPromptPanel({ label, prompt, children, controls, description, className = '' }: SystemPromptPanelProps) {
  const id = useId();
  return <div className={`system-prompt-panel ${className}`.trim()}>
    {controls}
    <div className="system-prompt-document sy-prompt" role="region" aria-label={label} tabIndex={0} aria-describedby={description ? `${id}-note` : undefined}>
      {children ?? <pre className="system-prompt-raw"><code>{prompt}</code></pre>}
    </div>
    {description && <p className="system-panel-note" id={`${id}-note`}>{description}</p>}
  </div>;
}

/** Retains the failed payload rather than regenerating it from newer settings. */
export function SystemCopyFallback({ title, label, value }: { title: string; label: string; value: string }) {
  return <div className="system-copy-fallback" role="alert"><p>{title}</p><label><span>{label}</span><textarea readOnly value={value} onFocus={event => event.currentTarget.select()} /></label></div>;
}
