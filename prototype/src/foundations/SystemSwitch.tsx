import { useId } from 'react';
import type { ReactNode } from 'react';
import './system-switch.css';
export interface SystemSwitchProps {
  label: ReactNode; description?: ReactNode; error?: ReactNode;
  checked: boolean; onChange: (checked: boolean) => void;
  disabled?: boolean; readOnly?: boolean; pending?: boolean; pendingLabel?: string; className?: string;
}
/** Immediate setting. A persistence caller keeps the confirmed value and owns failure/retry messaging. */
export function SystemSwitch({ label, description, error, checked, onChange, disabled, readOnly, pending, pendingLabel, className = '' }: SystemSwitchProps) {
  const id = useId();
  return <div className={`system-switch-row ${className}`}>
    <div className="system-switch-copy"><span id={`${id}-label`}>{label}</span>{description && <p id={`${id}-help`}>{description}</p>}{error && <p id={`${id}-error`} className="system-switch-error">{error}</p>}{pending && pendingLabel && <p id={`${id}-pending`} role="status">{pendingLabel}</p>}</div>
    <button type="button" role="switch" className="system-switch" aria-checked={checked} aria-labelledby={`${id}-label`} aria-describedby={[description ? `${id}-help` : '', error ? `${id}-error` : '', pending && pendingLabel ? `${id}-pending` : ''].filter(Boolean).join(' ') || undefined} aria-invalid={error ? true : undefined} aria-disabled={readOnly || pending || undefined} aria-readonly={readOnly || undefined} aria-busy={pending || undefined} disabled={disabled} onClick={() => { if (!readOnly && !pending) onChange(!checked); }}><span aria-hidden="true" /></button>
  </div>;
}
