import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import './system-checkbox.css';

export interface SystemCheckboxProps {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

/** Native checkbox semantics and form participation. Mixed is a DOM property, not a third submitted value. */
export function SystemCheckbox({ label, description, error, checked, indeterminate = false, onChange, disabled = false, readOnly = false, required, name, value, className = '' }: SystemCheckboxProps) {
  const id = useId(); const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (inputRef.current) inputRef.current.indeterminate = indeterminate; }, [indeterminate, checked]);
  return <label className={`system-checkbox ${className}`} data-mixed={indeterminate || undefined}>
    <input ref={inputRef} type="checkbox" name={name} value={value} checked={checked} required={required} disabled={disabled} aria-readonly={readOnly || undefined} aria-labelledby={`${id}-label`} aria-invalid={error ? true : undefined} aria-describedby={[description ? `${id}-description` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined} onClick={event => { if (readOnly) event.preventDefault(); }} onChange={event => { if (!readOnly) onChange(event.target.checked); }} />
    <span className="system-checkbox-box" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d={indeterminate ? 'M4 8h8' : 'm3.5 8 3 3 6-6'} /></svg></span>
    <span className="system-checkbox-copy"><span className="system-checkbox-label" id={`${id}-label`}>{label}</span>{description && <span className="system-checkbox-description" id={`${id}-description`}>{description}</span>}{error && <span className="system-checkbox-error" id={`${id}-error`}>{error}</span>}</span>
  </label>;
}
