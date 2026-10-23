import { useId } from 'react';
import type { ReactNode } from 'react';
import './system-checkbox.css';

interface SystemCheckboxProps {
  label: ReactNode;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Native checkbox semantics, with a shared visual control and full-row label. */
export function SystemCheckbox({ label, description, checked, onChange, disabled = false, className = '' }: SystemCheckboxProps) {
  const id = useId();
  return <label className={`system-checkbox ${className}`}>
    <input type="checkbox" checked={checked} disabled={disabled} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined} onChange={event => onChange(event.target.checked)} />
    <span className="system-checkbox-box" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m3.5 8 3 3 6-6" /></svg></span>
    <span className="system-checkbox-copy"><span className="system-checkbox-label" id={`${id}-label`}>{label}</span>{description && <span className="system-checkbox-description" id={`${id}-description`}>{description}</span>}</span>
  </label>;
}
