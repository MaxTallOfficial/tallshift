'use client';
import { FeatureGrid } from './FeatureGrid';
import { copy } from './copy';
export interface DemoProps { locale?: 'ru' | 'en' | 'vi'; accent?: string; motion?: 'off' | 'subtle' | 'expressive'; duration?: number }
export function Demo({ locale = 'en', accent, motion = 'subtle', duration = 240 }: DemoProps) {
  const text = copy[locale];
  return <FeatureGrid title={text.title} description={text.description} features={text.features} accent={accent} motion={motion} duration={duration} />;
}
