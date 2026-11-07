'use client';

import { useId, useState } from 'react';
import { ActionBand } from './ActionBand';
import { actionBandCopy } from './copy';
import styles from './Demo.module.css';

export interface DemoProps { locale?: 'ru' | 'en' | 'vi'; accent?: string; duration?: number; motion?: 'off' | 'subtle' | 'expressive' }

export function Demo({ locale = 'en', accent, duration = 160, motion = 'subtle' }: DemoProps) {
  const t = actionBandCopy[locale];
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  return <div className={styles.demo}>
    <ActionBand title={t.title} description={t.description} note={t.note} accent={accent} duration={duration} motion={motion}
      action={{ label: expanded ? t.hide : t.show, onClick: () => setExpanded(value => !value), controls: `${id}-steps`, expanded }} />
    <section id={`${id}-steps`} hidden={!expanded} aria-labelledby={`${id}-heading`} className={styles.steps}>
      <h3 id={`${id}-heading`}>{t.heading}</h3>
      <ol>{t.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </section>
  </div>;
}
