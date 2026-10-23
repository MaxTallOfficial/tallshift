import { SystemButton } from './SystemButton';
import { SystemIcon } from './SystemIcon';
import { paginationItems, paginationRange } from './pagination';
import './system-catalog.css';
export interface SystemPaginationProps {
  total: number; pageSize: number; page: number; onPageChange: (page: number) => void;
  label: string; previousLabel: string; nextLabel: string; pageLabel: (page: number, pages: number) => string;
  disabled?: boolean; loading?: boolean; className?: string;
}
/** Controlled paging. Boundary controls retain focus; aria-disabled activation is guarded. */
export function SystemPagination({ total, pageSize, page, onPageChange, label, previousLabel, nextLabel, pageLabel, disabled = false, loading = false, className = '' }: SystemPaginationProps) {
  const { current, pages } = paginationRange(total, pageSize, page);
  const blocked = disabled || loading || total <= 0;
  return <nav className={`system-pagination ${className}`} aria-label={label} aria-busy={loading || undefined}>
    <SystemButton aria-label={previousLabel} aria-disabled={blocked || current === 1} onClick={() => onPageChange(current - 1)}><SystemIcon name="arrow-left" /></SystemButton>
    <div>{paginationItems(current, pages).map(item => typeof item === 'number' ? <SystemButton key={item} aria-label={pageLabel(item, pages)} aria-current={item === current ? 'page' : undefined} aria-disabled={blocked || item === current} onClick={() => onPageChange(item)}>{item}</SystemButton> : <span key={item} aria-hidden="true">…</span>)}</div>
    <SystemButton aria-label={nextLabel} aria-disabled={blocked || current === pages} onClick={() => onPageChange(current + 1)}><SystemIcon name="arrow-right" /></SystemButton>
  </nav>;
}
