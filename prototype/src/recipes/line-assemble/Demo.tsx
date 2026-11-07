'use client';

import { useRef, useState } from 'react';
import { LineAssemble } from './LineAssemble';
import { copy } from './copy';
import { useInputModality } from './useInputModality';
import styles from './Demo.module.css';

export interface DemoProps { locale?: 'ru' | 'en' | 'vi'; duration?: number; motion?: 'off' | 'subtle' | 'expressive' }
export function Demo({ locale = 'en', duration = 320, motion = 'subtle' }: DemoProps) {
  const t = copy[locale];
  const root = useRef<HTMLDivElement>(null);
  const [replay, setReplay] = useState(0);
  const [alternate, setAlternate] = useState(false);
  useInputModality(root);
  return <div ref={root} className={styles.demo}>
    <header className={styles.header}><h2>{t.title}</h2><p>{t.help}</p></header>
    <div className={styles.stage}><LineAssemble text={alternate ? t.second : t.heading} duration={duration} motion={motion} replayKey={replay} className={styles.headline} /><p>{t.note}</p></div>
    <div className={styles.controls}><button type="button" onClick={() => setReplay(value => value + 1)}>{t.replay}</button><button type="button" onClick={() => setAlternate(value => !value)}>{t.alternate}</button></div>
  </div>;
}
