import type { ComponentPropsWithoutRef } from 'react';
import './system-shell.css';
export interface SystemBrandMarkProps extends ComponentPropsWithoutRef<'a'> { compact?: boolean; inverse?: boolean }
/** The wordmark is always a named home link; the compact glyph has the same name. */
export function SystemBrandMark({ href = '#top', compact = false, inverse = false, children, className = '', 'aria-label': label = 'Tallshift — home', ...props }: SystemBrandMarkProps) {
  return <a {...props} href={href} aria-label={label} className={`system-brand ${className}`.trim()} data-compact={compact || undefined} data-inverse={inverse || undefined}><span aria-hidden="true">{compact ? 't' : children ?? 'tallshift'}<i /></span></a>;
}
