'use client';
import { useId } from 'react';
import { SplitHero } from './SplitHero';
import { copy } from './copy';
import styles from './Demo.module.css';
export interface DemoProps { locale?: 'ru' | 'en' | 'vi'; accent?: string; motion?: 'off' | 'subtle' | 'expressive'; duration?: number }
export function Demo({ locale = 'en', accent, motion = 'subtle', duration = 240 }: DemoProps) {
  const id = useId();
  const text = copy[locale];
  return <div className={styles.demo}><SplitHero title={text.title} description={text.description} primaryAction={{ label: text.primary, href: `#${id}-features` }} secondaryAction={{ label: text.secondary, href: `#${id}-setup` }} panelTitle={text.panelTitle} panelItems={text.items} accent={accent} motion={motion} duration={duration} />
    <section className={styles.details} id={`${id}-features`}><h3>{text.featuresTitle}</h3><p>{text.featuresText}</p></section>
    <section className={styles.details} id={`${id}-setup`}><h3>{text.setupTitle}</h3><p>{text.setupText}</p></section>
  </div>;
}
