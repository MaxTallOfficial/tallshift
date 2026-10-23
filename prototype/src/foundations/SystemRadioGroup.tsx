import { useId } from 'react';
import type { ReactNode } from 'react';
import './system-radio-group.css';
export interface SystemRadioOption<T extends string> { value: T; label: ReactNode; description?: ReactNode; disabled?: boolean; }
export interface SystemRadioGroupProps<T extends string> {
  label: ReactNode; name?: string; value: T; options: readonly SystemRadioOption<T>[];
  onChange: (value: T) => void; description?: ReactNode; error?: ReactNode;
  required?: boolean; disabled?: boolean; layout?: 'list' | 'inline' | 'cards'; className?: string;
}
/** Native radio keyboard behavior, including skipping disabled options. */
export function SystemRadioGroup<T extends string>({ label, name, value, options, onChange, description, error, required, disabled, layout = 'list', className = '' }: SystemRadioGroupProps<T>) {
  const id = useId();
  const describedBy = [description ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return <fieldset className={`system-radio-group ${className}`} disabled={disabled} data-layout={layout} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
    <legend>{label}</legend>
    {description && <p id={`${id}-help`} className="system-radio-description">{description}</p>}
    <div className="system-radio-options">{options.map(option => <label key={option.value} className="system-radio-option">
      <input type="radio" name={name ?? id} value={option.value} checked={value === option.value} required={required} disabled={option.disabled} onChange={() => onChange(option.value)} />
      <span className="system-radio-mark" aria-hidden="true" />
      <span className="system-radio-copy"><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span>
    </label>)}</div>
    {error && <p id={`${id}-error`} className="system-radio-error">{error}</p>}
  </fieldset>;
}
