import type { CSSProperties } from 'react';
import './system-feedback.css';
/** Decorative placeholder; the containing region owns aria-busy and a text loading label. */
export function SystemSkeleton({ width = '100%', height = '1em', shape = 'line', className = '' }: { width?: CSSProperties['width']; height?: CSSProperties['height']; shape?: 'line' | 'circle' | 'block'; className?: string }) {
  return <span className={`sf-skeleton ${className}`.trim()} data-shape={shape} aria-hidden="true" style={{ width, height }} />;
}
