import {useRef} from 'react';
import {useInputModality} from './system-input-modality';
import type { CSSProperties, ReactNode } from 'react';
import { getSaffronTheme } from './tokens';
import { systemCssVariables } from './system-tokens';
import './system-theme.css';
export interface SystemThemeProps { children: ReactNode; locale?: 'en' | 'ru' | 'vi'; className?: string; style?: CSSProperties }
/** Scoped approved theme; no document/body mutation. Floating surfaces remain within this theme root. */
export function SystemTheme({children,locale='en',className='',style}:SystemThemeProps) {
 const root=useRef<HTMLDivElement>(null);useInputModality(root);
 return <div ref={root} data-tallshift-theme="afterlight" lang={locale} className={`tallshift-ui ${className}`.trim()} style={{...getSaffronTheme(),...systemCssVariables,...style} as CSSProperties}>{children}</div>;
}
