'use client';
import { useId, type MouseEvent } from 'react';
import { SplitHero } from './SplitHero';
import { copy } from './copy';
import styles from './Demo.module.css';
export interface DemoProps { locale?: 'ru' | 'en' | 'vi'; accent?: string; motion?: 'off' | 'subtle' | 'expressive'; duration?: number }
/**
 * Demo only: keeps both example links inside this example, also in a sandboxed or embedded preview
 * where a #fragment would reload another page or change nothing visible. It moves focus to the
 * section and scrolls it into view. In your own page, plain #fragment links need no handler.
 */
function openSection(event: MouseEvent<HTMLDivElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element).closest('a[href^="#"]');
  const target = link ? link.ownerDocument.getElementById(decodeURIComponent(link.getAttribute('href')!.slice(1))) : null;
  if (!target || !event.currentTarget.contains(target)) return;
  event.preventDefault();
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}
export function Demo({ locale = 'en', accent, motion = 'subtle', duration = 240 }: DemoProps) {
  const id = useId();
  const text = copy[locale];
  return <div className={styles.demo} onClick={openSection}><SplitHero title={text.title} description={text.description} primaryAction={{ label: text.primary, href: `#${id}-features` }} secondaryAction={{ label: text.secondary, href: `#${id}-setup` }} panelTitle={text.panelTitle} panelItems={text.items} accent={accent} motion={motion} duration={duration} />
    <section className={styles.details} id={`${id}-features`} tabIndex={-1}><h3>{text.featuresTitle}</h3><p>{text.featuresText}</p></section>
    <section className={styles.details} id={`${id}-setup`} tabIndex={-1}><h3>{text.setupTitle}</h3><p>{text.setupText}</p></section>
  </div>;
}
