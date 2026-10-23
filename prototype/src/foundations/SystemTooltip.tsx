import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FloatingPortal, useFloatingPosition } from './system-floating';
export interface SystemTooltipProps { content: string; trigger: (props: { 'aria-describedby'?: string }) => ReactNode; }
/** Supplementary text only; do not put actions or essential instructions in a tooltip. */
export function SystemTooltip({ content, trigger: renderTrigger }: SystemTooltipProps) {
  const id = useId(), trigger = useRef<HTMLSpanElement>(null), panel = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false), dismissed = useRef(false);
  const position = useFloatingPosition(open, trigger, panel);
  const clear = () => { clearTimeout(timer.current); };
  const show = () => { clear(); if (!dismissed.current) setOpen(true); };
  const leave = () => { clear(); timer.current = setTimeout(() => { if (!trigger.current?.contains(document.activeElement)) { setOpen(false); dismissed.current = false; } }, 120); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target;
      const ownsFocus = target instanceof Node && (trigger.current?.contains(target) || panel.current?.contains(target));
      const modal = document.querySelector('dialog:modal');
      // A background tooltip must not handle the Escape intended for a native modal.
      if (modal && !modal.contains(trigger.current)) return;
      setOpen(false); dismissed.current = true;
      // The focused tooltip takes the first Escape; the next Escape belongs to the dialog.
      if (ownsFocus) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [open]);
  return <><span ref={trigger} className="system-tooltip-anchor" onPointerEnter={show} onPointerLeave={leave} onFocus={show} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { clear(); setOpen(false); dismissed.current = false; } }}>{renderTrigger({ 'aria-describedby': open ? id : undefined })}</span>{open && <FloatingPortal anchor={trigger.current}><div ref={panel} id={id} role="tooltip" className="system-floating system-tooltip" style={position} onPointerEnter={show} onPointerLeave={leave}>{content}</div></FloatingPortal>}</>;
}
