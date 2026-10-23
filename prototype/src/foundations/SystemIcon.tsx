import type { ReactNode } from 'react';
import './system-icons.css';

export const systemIconNames = [
  'search', 'close', 'chevron-down', 'chevron-up', 'chevron-right', 'chevron-left',
  'arrow-left', 'arrow-right', 'check', 'copy', 'download', 'code', 'prompt',
  'play', 'pause', 'replay', 'settings', 'filter', 'grid', 'desktop', 'tablet',
  'mobile', 'info', 'warning', 'error', 'plus', 'minus', 'external', 'folder', 'file',
] as const;

export type SystemIconName = typeof systemIconNames[number];
export interface SystemIconProps {
  name: SystemIconName;
  size?: 16 | 20 | 24;
  /** Omit for decoration. Interactive parents need their own accessible name. */
  label?: string;
  className?: string;
}

const drawings: Record<SystemIconName, ReactNode> = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  'chevron-down': <path d="m7 10 5 5 5-5" />,
  'chevron-up': <path d="m7 14 5-5 5 5" />,
  'chevron-right': <path d="m10 7 5 5-5 5" />,
  'chevron-left': <path d="m14 7-5 5 5 5" />,
  'arrow-left': <path d="M19 12H5m5-5-5 5 5 5" />,
  'arrow-right': <path d="M5 12h14m-5-5 5 5-5 5" />,
  check: <path d="m5 12 4 4L19 6" />,
  copy: <><rect x="8" y="7" width="12" height="14" rx="2" /><path d="M15 4V3H5a2 2 0 0 0-2 2v11h2" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
  code: <path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16" />,
  prompt: <><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" /></>,
  play: <path d="m8 4 12 8-12 8V4Z" />,
  pause: <><rect x="5" y="4" width="4" height="16" rx="1" /><rect x="15" y="4" width="4" height="16" rx="1" /></>,
  replay: <><path d="M4 10a8 8 0 1 1 .7 6M4 4v6h6" /></>,
  settings: <><path d="M3 6h4m4 0h10M3 12h10m4 0h4M3 18h4m4 0h10" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="9" cy="18" r="2" /></>,
  filter: <path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z" />,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  desktop: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v5m-5 0h10" /></>,
  tablet: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M10 18h4" /></>,
  mobile: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  warning: <><path d="m10.3 4.2-8 14A1.9 1.9 0 0 0 4 21h16a1.9 1.9 0 0 0 1.7-2.8l-8-14a1.9 1.9 0 0 0-3.4 0Z" /><path d="M12 9v5m0 3h.01" /></>,
  error: <><circle cx="12" cy="12" r="9" /><path d="m8.5 8.5 7 7m-7 0 7-7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  external: <><path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" /><path d="M14 3v6h6" /></>,
};

/** A passive SVG: visual size is independent of its parent's interaction target. */
export function SystemIcon({ name, size = 20, label, className = '' }: SystemIconProps) {
  const accessibleLabel = label?.trim();
  const strokeWidth = size === 16 ? 1.9 : size === 20 ? 1.75 : 1.6;
  return <svg
    className={`system-icon ${className}`.trim()}
    data-icon={name}
    data-size={size}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={accessibleLabel ? 'img' : undefined}
    aria-label={accessibleLabel || undefined}
    aria-hidden={accessibleLabel ? undefined : true}
    focusable="false"
  >{drawings[name]}</svg>;
}
