'use client';

import { useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { useInputModality } from './input-modality';
import { pressButtonTextColor } from './contrast';
import styles from './PressButton.module.css';

export interface PressButtonAppearance {
  label: string;
  icon?: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  accent?: string;
  radius?: number;
  motion?: 'off' | 'subtle' | 'expressive';
  duration?: number;
}
type ButtonProps = PressButtonAppearance & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof PressButtonAppearance | 'children'> & { href?: never };
type LinkProps = PressButtonAppearance & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof PressButtonAppearance | 'children' | 'href'> & { href: string };
export type PressButtonProps = ButtonProps | LinkProps;

/** A visual response to input. The host owns the action and its actual pending state. */
export function PressButton(props: PressButtonProps) {
  const { label, icon, pending = false, pendingLabel, disabled = false, size = 'md', accent, radius = 8, motion = 'subtle', duration = 160, className = '', style, ...native } = props;
  const root = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  useInputModality(root);
  const blocked = disabled || pending;
  const appearance = {
    ...style,
    ...(accent && /^#[\da-f]{6}$/i.test(accent) ? { '--press-accent': accent, '--press-on-accent': pressButtonTextColor(accent) } : {}),
    '--press-radius': `${Number.isFinite(radius) ? Math.min(48, Math.max(0, radius)) : 8}px`,
    '--press-duration': `${motion === 'off' ? 0 : Number.isFinite(duration) ? Math.min(480, Math.max(0, duration)) : 160}ms`,
  } as CSSProperties;
  const common = {
    className: `${styles.control} ${className}`.trim(), style: appearance,
    'data-size': size, 'data-motion': motion, 'aria-disabled': blocked || undefined, 'aria-busy': pending || undefined,
  };
  const content = <>{icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}<span className={styles.label}>{pending && pendingLabel ? pendingLabel : label}</span></>;

  if (typeof props.href === 'string') {
    const { href, onClick, onAuxClick, onKeyDown, ...attributes } = native as Omit<LinkProps, keyof PressButtonAppearance>;
    const preventBlocked = (event: MouseEvent<HTMLAnchorElement>) => { if (blocked) { event.preventDefault(); event.stopPropagation(); return true; } return false; };
    return <a {...attributes} {...common} ref={root as RefObject<HTMLAnchorElement | null>} href={blocked ? undefined : href} role={blocked ? 'link' : attributes.role} tabIndex={attributes.tabIndex ?? 0}
      onClick={event => { if (!preventBlocked(event)) onClick?.(event); }}
      onAuxClick={event => { if (!preventBlocked(event)) onAuxClick?.(event); }}
      onKeyDown={event => { if (blocked && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); } else onKeyDown?.(event); }}>{content}</a>;
  }
  const { href: _href, onClick, onKeyDown, type = 'button', ...attributes } = native as Omit<ButtonProps, keyof PressButtonAppearance>;
  return <button {...attributes} {...common} ref={root as RefObject<HTMLButtonElement | null>} type={type}
    onKeyDown={event => { if (blocked && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); } else onKeyDown?.(event); }}
    onClick={event => { if (blocked) { event.preventDefault(); event.stopPropagation(); return; } onClick?.(event); }}>{content}</button>;
}
