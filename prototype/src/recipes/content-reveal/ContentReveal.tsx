'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { connectContentReveal, type RevealOptions } from './reveal-controller';
import styles from './ContentReveal.module.css';

export interface ContentRevealProps extends RevealOptions { children: ReactNode; className?: string }

/** Adds a brief entrance without making content or actions depend on animation. */
export function ContentReveal({ children, once = true, distance = 16, duration = 240, motion = 'subtle', className = '' }: ContentRevealProps) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current ? connectContentReveal(root.current, { once, distance, duration, motion }) : undefined, [once, distance, duration, motion]);
  return <div ref={root} className={`${styles.reveal} ${className}`.trim()} data-content-reveal="">{children}</div>;
}
