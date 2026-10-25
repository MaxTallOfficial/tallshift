/** Prefer an aligned edge before clamping a surface inside the visual viewport. */
export function floatingLeft(anchor: { left: number; right: number }, panelWidth: number, viewport: { left: number; width: number }, align: 'start' | 'end', gutter = 12) {
  const min = viewport.left + gutter;
  const max = viewport.left + viewport.width - gutter;
  const start = anchor.left;
  const end = anchor.right - panelWidth;
  const preferred = align === 'end' ? end : start;
  const alternate = align === 'end' ? start : end;
  const fits = (left: number) => left >= min && left + panelWidth <= max;
  const aligned = fits(preferred) ? preferred : fits(alternate) ? alternate : preferred;
  return Math.max(min, Math.min(aligned, max - panelWidth));
}
