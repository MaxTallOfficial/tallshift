import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import './system-text-field.css';

export interface SystemFieldProps {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Visible localized text, for example “Required” or “Optional”. */
  requirement?: ReactNode;
  counter?: ReactNode;
  className?: string;
  announceError?: boolean;
}
export type SystemTextInputProps = SystemFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'prefix'> & { prefix?: ReactNode; suffix?: ReactNode };
export type SystemTextareaProps = SystemFieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

function FieldFrame({ id, label, description, error, requirement, counter, className = '', announceError, children }: SystemFieldProps & { id: string; children: ReactNode }) {
  return <div className={`system-field ${className}`} data-invalid={Boolean(error) || undefined}>
    <div className="system-field-heading"><label htmlFor={id}>{label}</label>{requirement && <span>{requirement}</span>}</div>
    {children}
    {(description || counter !== undefined) && <div className="system-field-footer">{description && <p id={`${id}-help`}>{description}</p>}{counter !== undefined && <span id={`${id}-count`}>{counter}</span>}</div>}
    {error && <p id={`${id}-error`} className="system-field-error" role={announceError ? 'alert' : undefined}>{error}</p>}
  </div>;
}
function describedBy(id: string, description: ReactNode, error: ReactNode, counter: ReactNode, external?: string) {
  return [external, description ? `${id}-help` : '', error ? `${id}-error` : '', counter !== undefined ? `${id}-count` : ''].filter(Boolean).join(' ') || undefined;
}

/** Native single-line input. The caller owns validation, value and translated messages. */
export const SystemTextInput = forwardRef<HTMLInputElement, SystemTextInputProps>(function SystemTextInput({ id: suppliedId, label, description, error, requirement, counter, className, announceError, prefix, suffix, 'aria-describedby': externalDescription, ...input }, ref) {
  const generatedId = useId(); const id = suppliedId ?? generatedId;
  const control = <input {...input} id={id} ref={ref} className="system-field-control" aria-invalid={error ? true : input['aria-invalid']} aria-describedby={[describedBy(id, description, error, counter, externalDescription), prefix ? `${id}-prefix` : '', suffix ? `${id}-suffix` : ''].filter(Boolean).join(' ') || undefined} />;
  return <FieldFrame {...{ id, label, description, error, requirement, counter, className, announceError }}>{prefix || suffix ? <div className="system-field-affixed" data-disabled={input.disabled || undefined} data-invalid={Boolean(error) || undefined}>{prefix && <span id={`${id}-prefix`}>{prefix}</span>}{control}{suffix && <span id={`${id}-suffix`}>{suffix}</span>}</div> : control}</FieldFrame>;
});
/** Native resizable textarea. Counter is explicit so callers can use their chosen counting policy. */
export const SystemTextarea = forwardRef<HTMLTextAreaElement, SystemTextareaProps>(function SystemTextarea({ id: suppliedId, label, description, error, requirement, counter, className, announceError, 'aria-describedby': externalDescription, ...textarea }, ref) {
  const generatedId = useId(); const id = suppliedId ?? generatedId;
  return <FieldFrame {...{ id, label, description, error, requirement, counter, className, announceError }}><textarea {...textarea} id={id} ref={ref} className="system-field-control" aria-invalid={error ? true : textarea['aria-invalid']} aria-describedby={describedBy(id, description, error, counter, externalDescription)} /></FieldFrame>;
});
