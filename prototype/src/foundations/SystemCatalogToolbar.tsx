import type { ReactNode } from 'react';
import './system-catalog.css';
export interface SystemCatalogToolbarProps {
  label: string; search: ReactNode; sort: ReactNode; children: ReactNode; busy?: boolean;
}
/** A labelled form-control group, not an ARIA toolbar with misleading arrow-key behavior. */
export function SystemCatalogToolbar({ label, search, sort, children, busy = false }: SystemCatalogToolbarProps) {
  return <div className="system-catalog-toolbar" role="group" aria-label={label} aria-busy={busy || undefined}>
    <div className="system-catalog-search-row">{search}{sort}</div>{children}
  </div>;
}
