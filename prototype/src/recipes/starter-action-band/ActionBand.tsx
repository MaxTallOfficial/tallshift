'use client';

import { useId, type CSSProperties, type MouseEventHandler, type ReactNode } from 'react';
import { PressButton, pressButtonTextColor, type PressButtonAppearance } from './press-button';
import styles from './ActionBand.module.css';

interface ActionState {
  label: string;
  icon?: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
  disabled?: boolean;
  controls?: string;
  expanded?: boolean;
}
export type ActionBandAction = ActionState & (
  | { href: string; target?: string; rel?: string; onClick?: never; type?: never }
  | { href?: never; target?: never; rel?: never; onClick: MouseEventHandler<HTMLButtonElement>; type?: 'button' | 'submit' | 'reset' }
);
export interface ActionBandProps {
  title: string;
  description: string;
  action: ActionBandAction;
  note?: string;
  accent?: string;
  surface?: string;
  radius?: number;
  motion?: PressButtonAppearance['motion'];
  duration?: number;
  className?: string;
}

/** One closing action. The host owns the destination or callback and actual operation state. */
export function ActionBand({ title, description, action, note, accent, surface, radius = 16, motion = 'subtle', duration = 160, className = '' }: ActionBandProps) {
  const id = useId();
  const hasNote = Boolean(note?.trim());
  const customSurface = typeof surface === 'string' && /^#[\da-f]{6}$/i.test(surface);
  const textColor = customSurface ? pressButtonTextColor(surface) : undefined;
  const appearance = {
    '--ab-radius': `${Number.isFinite(radius) ? Math.min(48, Math.max(0, radius)) : 16}px`,
    ...(customSurface ? { '--ab-surface': surface, '--ab-text': textColor, '--ab-secondary': textColor } : {}),
  } as CSSProperties;
  const buttonAppearance = { accent, motion, duration, icon: action.icon, pending: action.pending, pendingLabel: action.pendingLabel, disabled: action.disabled };
  const semantics = { 'aria-controls': action.controls, 'aria-expanded': action.expanded };
  return <section className={`${styles.band} ${className}`.trim()} style={appearance} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description${hasNote ? ` ${id}-note` : ''}`}>
    <div className={styles.inner}>
      <div className={styles.copy}>
        <h2 id={`${id}-title`} className={styles.title}>{title}</h2>
        <p id={`${id}-description`} className={styles.description}>{description}</p>
      </div>
      <div className={styles.action}>
        {typeof action.href === 'string'
          ? <PressButton {...buttonAppearance} {...semantics} label={action.label} href={action.href} target={action.target} rel={action.rel} />
          : <PressButton {...buttonAppearance} {...semantics} label={action.label} type={action.type ?? 'button'} onClick={action.onClick} />}
      </div>
      {hasNote && <p id={`${id}-note`} className={styles.note}>{note}</p>}
    </div>
  </section>;
}
