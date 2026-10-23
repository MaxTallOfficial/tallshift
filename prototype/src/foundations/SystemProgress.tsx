import { useId, type CSSProperties } from 'react';
import './system-progress.css';

export interface SystemProgressProps {
  label: string;
  value?: number;
  max?: number;
  valueText?: string;
  hint?: string;
  indeterminate?: boolean;
  tone?: 'default' | 'success' | 'error';
  locale?: string;
}

/** Accessible progress display; its caller owns the operation, updates and cancellation. */
export function SystemProgress({ label, value, max = 100, valueText, hint, indeterminate = value === undefined, tone = 'default', locale }: SystemProgressProps) {
  const id = useId();
  const limit = Number.isFinite(max) && max > 0 ? max : 100;
  const current = Math.min(limit, Math.max(0, Number.isFinite(value) ? value! : 0));
  const percent = current / limit;
  const visibleValue = valueText ?? (indeterminate ? '' : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(percent));
  return <div className="sys-progress" data-tone={tone} data-indeterminate={indeterminate || undefined}>
    <div className="sys-progress-heading"><span id={`${id}-label`}>{label}</span>{visibleValue && <span className="sys-progress-value">{visibleValue}</span>}</div>
    <div className="sys-progress-track" role="progressbar" aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={indeterminate ? undefined : current} aria-valuetext={valueText} style={{ '--sys-progress-fill': `${percent * 100}%` } as CSSProperties}><span aria-hidden="true" /></div>
    {hint && <p className="sys-progress-hint" id={`${id}-hint`}>{hint}</p>}
  </div>;
}
