import { createElement, type CSSProperties, type HTMLAttributes } from 'react';
import { typographyScale, type TypographyRole } from './system-scale';
import './system-typography.css';
export interface SystemTypographyProps extends HTMLAttributes<HTMLElement> { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label'; textRole?: TypographyRole; numeric?: boolean }
/** Visual type role and semantic heading level are intentionally independent. */
export function SystemTypography({ as = 'p', textRole = 'body', numeric = false, className = '', style, ...props }: SystemTypographyProps) {
  const scale = typographyScale[textRole];
  return createElement(as, { ...props, className: `system-type ${className}`.trim(), 'data-role': textRole, 'data-numeric': numeric || undefined, style: { '--type-desktop': `${scale.desktopSize}px`, '--type-mobile': `${scale.mobileSize}px`, '--type-weight': scale.weight, '--type-leading': scale.lineHeight, '--type-tracking': `${scale.trackingEm}em`, ...style } as CSSProperties });
}
