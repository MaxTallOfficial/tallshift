'use client';

import { ContentTabs } from './ContentTabs';
import { tabsCopy } from './copy';
import styles from './Demo.module.css';

export interface DemoProps {
  locale?: 'ru' | 'en' | 'vi';
  accent?: string;
  duration?: number;
  motion?: 'off' | 'subtle' | 'expressive';
}

export function Demo({ locale = 'en', accent = '#EBD183', duration = 160, motion = 'subtle' }: DemoProps) {
  const t = tabsCopy[locale];
  return <section className={styles.demo}>
    <header className={styles.header}><h2>{t.title}</h2><p>{t.help}</p></header>
    <ContentTabs label={t.label} accent={accent} duration={duration} motion={motion} tabs={t.tabs.map(tab => ({ id: tab.id, label: tab.label, content: <article className={styles.article}><h3>{tab.title}</h3><p>{tab.body}</p><p className={styles.note}>{tab.note}</p></article> }))} />
  </section>;
}
