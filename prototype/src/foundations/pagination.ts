export function paginationRange(total: number, pageSize: number, page: number) {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const safeSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
  const pages = Math.max(1, Math.ceil(safeTotal / safeSize));
  const current = Number.isFinite(page) ? Math.max(1, Math.min(Math.floor(page), pages)) : 1;
  return { current, pages, first: safeTotal ? (current - 1) * safeSize + 1 : 0, last: Math.min(current * safeSize, safeTotal), total: safeTotal };
}
export function paginationItems(page: number, pages: number): (number | 'start-gap' | 'end-gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const start = Math.max(2, Math.min(page - 1, pages - 4));
  const end = Math.min(pages - 1, Math.max(page + 1, 5));
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  return [1, ...(start > 2 ? ['start-gap' as const] : []), ...middle, ...(end < pages - 1 ? ['end-gap' as const] : []), pages];
}
