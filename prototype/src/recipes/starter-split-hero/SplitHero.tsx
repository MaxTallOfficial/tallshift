'use client';

import { useId } from 'react';
import { PressButton } from './press-button';
import { ContentReveal } from './reveal';
import { surfaceStyle, type SectionDensity, type SectionMotion } from './appearance';
import styles from './SplitHero.module.css';

export interface HeroAction { label: string; href: string }
export interface HeroPanelItem { id: string; title: string; description: string }
export interface SplitHeroProps {
  title: string; description: string; primaryAction: HeroAction; secondaryAction: HeroAction;
  panelTitle: string; panelItems: readonly [HeroPanelItem, HeroPanelItem, HeroPanelItem];
  accent?: string; surface?: string; radius?: number; density?: SectionDensity; motion?: SectionMotion; duration?: number; className?: string;
}
/** Reject executable and ambiguous URLs. Relative routes, fragments and HTTP(S) are supported. */
export function safeHeroHref(value: string): string {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u0020\u007f\\]/.test(value) || value.startsWith('//') || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) throw new TypeError('Use a nonempty relative, fragment or HTTP(S) link');
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) throw new TypeError('Unsupported link protocol');
  return value;
}
/** A two-column introduction with two real links and three host-authored supporting points. */
export function SplitHero({ title, description, primaryAction, secondaryAction, panelTitle, panelItems, accent, surface, radius, density = 'default', motion = 'subtle', duration = 240, className = '' }: SplitHeroProps) {
  const id = useId();
  if (panelItems.length !== 3 || new Set(panelItems.map(item => item.id)).size !== 3) throw new RangeError('Provide three panel items with unique IDs');
  return <section className={`${styles.hero} ${className}`.trim()} style={surfaceStyle(surface, radius)} data-density={density} aria-labelledby={`${id}-title`}>
    <ContentReveal motion={motion} duration={duration} once><div className={styles.layout}>
      <div className={styles.copy}><h2 className={styles.title} id={`${id}-title`}>{title}</h2><p className={styles.description}>{description}</p>
        <div className={styles.actions}><PressButton label={primaryAction.label} href={safeHeroHref(primaryAction.href)} accent={accent} motion={motion} duration={duration} /><PressButton className={styles.secondary} label={secondaryAction.label} href={safeHeroHref(secondaryAction.href)} motion={motion} duration={duration} /></div>
      </div>
      <aside className={styles.panel} aria-labelledby={`${id}-panel`}><h3 className={styles.panelTitle} id={`${id}-panel`}>{panelTitle}</h3><ol className={styles.points}>{panelItems.map(item => <li key={item.id}><h4>{item.title}</h4><p>{item.description}</p></li>)}</ol></aside>
    </div></ContentReveal>
  </section>;
}
