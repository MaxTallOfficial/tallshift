import type { CSSProperties } from 'react';
export type SectionMotion = 'off' | 'subtle' | 'expressive';
export type SectionDensity = 'compact' | 'default' | 'relaxed';
/** Plain opaque colors only; choose black or white with at least 4.5:1 contrast. */
export function surfaceStyle(surface?: string, radius = 16): CSSProperties {
  const style = { '--section-radius': `${Number.isFinite(radius) ? Math.min(48, Math.max(0, radius)) : 16}px` } as CSSProperties;
  if (!surface || !/^#[\da-f]{6}$/i.test(surface)) return style;
  const channels = [1, 3, 5].map(i => parseInt(surface.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  const light = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  return { ...style, '--section-surface': surface, '--section-text': light > .179 ? '#000000' : '#FFFFFF', '--section-secondary': light > .179 ? '#000000' : '#FFFFFF' } as CSSProperties;
}
