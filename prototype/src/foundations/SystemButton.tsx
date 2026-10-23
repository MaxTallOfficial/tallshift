import type { ComponentPropsWithRef, ReactNode } from 'react';
import './system-button.css';

export interface SystemButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  /** Keeps the label and dimensions intact and prevents repeat activation. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function SystemButton({ variant = 'secondary', size = 'medium', loading = false, leadingIcon, trailingIcon, children, className = '', type = 'button', disabled, onClick, ...props }: SystemButtonProps) {
  return <button {...props} type={type} disabled={disabled} aria-disabled={loading || props['aria-disabled'] || undefined} aria-busy={loading || undefined} data-variant={variant} data-size={size} data-loading={loading || undefined} className={`system-button ${className}`.trim()} onClick={event => {
    if (loading || props['aria-disabled'] === true || props['aria-disabled'] === 'true') { event.preventDefault(); return; }
    onClick?.(event);
  }}>
    {leadingIcon && <span className="system-button-icon" aria-hidden="true">{leadingIcon}</span>}
    <span className="system-button-label">{children}</span>
    {trailingIcon && <span className="system-button-icon" aria-hidden="true">{trailingIcon}</span>}
    {loading && <span className="system-button-busy" aria-hidden="true" />}
  </button>;
}
