import type { ComponentPropsWithRef } from 'react';
import './system-text-link.css';
export interface SystemTextLinkProps extends ComponentPropsWithRef<'a'> { variant?: 'inline' | 'navigation' }
/** Native link: destinations, history, modifier clicks and visited state belong to the browser. */
export function SystemTextLink({ variant = 'inline', className = '', target, rel, ...props }: SystemTextLinkProps) {
  const safeRel = target === '_blank' ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), 'noopener'])].join(' ') : rel;
  return <a {...props} target={target} rel={safeRel} data-variant={variant} className={`system-text-link ${className}`.trim()} />;
}
