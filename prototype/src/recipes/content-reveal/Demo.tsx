'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ContentReveal } from './ContentReveal';
import { revealCopy } from './copy';
import { useInputModality } from './useInputModality';
import styles from './Demo.module.css';

export interface DemoProps { locale?: 'ru' | 'en' | 'vi'; accent?: string; duration?: number; motion?: 'off' | 'subtle' | 'expressive' }

export function Demo({ locale = 'en', duration = 240, motion = 'subtle' }: DemoProps) {
  const t = revealCopy[locale];
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const destination = useRef<HTMLParagraphElement>(null);
  const [revision, setRevision] = useState(0);
  const id = useId();
  useInputModality(root);
  useLayoutEffect(() => { if (viewport.current) viewport.current.scrollTop = 0; }, [revision]);
  return <div ref={root} className={styles.demo}>
    <header className={styles.header}><h2>{t.title}</h2><p>{t.help}</p></header>
    <div className={styles.controls}>
      <button type="button" onClick={() => { const container = viewport.current; const block = container?.querySelector<HTMLElement>('[data-content-reveal]'); if (container && block) { container.scrollTop += block.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop - 16; container.scrollIntoView({ block: 'nearest', behavior: 'instant' }); } }}>{t.show}</button>
      <button type="button" onClick={() => setRevision(value => value + 1)}>{t.reset}</button>
    </div>
    <div ref={viewport} className={styles.viewport} role="region" aria-label={t.window} tabIndex={0}>
      <div className={styles.intro}><h3>{t.startTitle}</h3><p>{t.startBody}</p></div>
      <ContentReveal key={revision} duration={duration} motion={motion}>
        <article className={styles.block}><h3>{t.blockTitle}</h3><p>{t.blockBody}</p><p className={styles.note}>{t.blockNote}</p>
          <a href={`#${id}-explanation`} onClick={event => { event.preventDefault(); const target = destination.current; target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }}>{t.link}</a>
          <p ref={destination} id={`${id}-explanation`} className={styles.destination} tabIndex={-1}>{t.destination}</p>
        </article>
      </ContentReveal>
    </div>
  </div>;
}
