'use client';

import { useId, type CSSProperties, type ReactNode } from 'react';
import { ContentReveal } from './reveal';
import { surfaceStyle, type SectionDensity, type SectionMotion } from './appearance';
import styles from './FeatureGrid.module.css';
export interface Feature { id: string; title: string; description: string; icon?: ReactNode }
export interface FeatureGridProps {
  title: string; description?: string; features: readonly Feature[];
  accent?: string; surface?: string; radius?: number; density?: SectionDensity; motion?: SectionMotion; duration?: number; className?: string;
}
/** Three to six readable features. Icons are optional host-owned decorative slots. */
export function FeatureGrid({ title, description, features, accent, surface, radius, density = 'default', motion = 'subtle', duration = 240, className = '' }: FeatureGridProps) {
  const id = useId();
  if (features.length < 3 || features.length > 6 || new Set(features.map(feature => feature.id)).size !== features.length) throw new RangeError('Provide three to six features with unique IDs');
  const style = { ...surfaceStyle(surface, radius), ...(accent && /^#[\da-f]{6}$/i.test(accent) ? { '--section-accent': accent } : {}) } as CSSProperties;
  return <section className={`${styles.section} ${className}`.trim()} style={style} data-density={density} aria-labelledby={`${id}-title`}>
    <header className={styles.header}><h2 className={styles.title} id={`${id}-title`}>{title}</h2>{description?.trim() && <p className={styles.description}>{description}</p>}</header>
    <ContentReveal motion={motion} duration={duration} once><ul className={styles.grid}>{features.map(feature => <li className={styles.feature} key={feature.id}>{feature.icon && <span className={styles.icon} aria-hidden="true">{feature.icon}</span>}<h3>{feature.title}</h3><p>{feature.description}</p></li>)}</ul></ContentReveal>
  </section>;
}
