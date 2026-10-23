import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import './system-floating.css';

export type FloatingReason = 'trigger' | 'escape' | 'outside' | 'focus-out' | 'action' | 'close';
export interface FloatingTriggerProps {
  ref: RefObject<HTMLButtonElement | null>;
  id: string;
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  'aria-haspopup'?: 'menu' | 'dialog';
  onClick: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
}
export function useFloatingState(open: boolean | undefined, defaultOpen: boolean, onOpenChange?: (open: boolean, reason: FloatingReason) => void) {
  const [internal, setInternal] = useState(defaultOpen);
  const active = open ?? internal;
  function change(next: boolean, reason: FloatingReason) { if (open === undefined) setInternal(next); onOpenChange?.(next, reason); }
  return [active, change] as const;
}
export function FloatingPortal({ children, anchor }: { children: ReactNode; anchor?: HTMLElement | null }) {
  if (typeof document === 'undefined') return children;
  const modal = anchor?.closest('dialog[open]') ?? document.activeElement?.closest('dialog[open]');
  return createPortal(children, modal ?? document.body);
}
export function useFloatingPosition(open: boolean, trigger: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, align: 'start' | 'end' = 'start') {
  const [position, setPosition] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!trigger.current || !panel.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftBound = viewport?.offsetLeft ?? 0, topBound = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
      const availableBelow = topBound + height - anchor.bottom - 16;
      const availableAbove = anchor.top - topBound - 16;
      const naturalHeight = panel.current.scrollHeight;
      const below = naturalHeight <= availableBelow || availableBelow >= availableAbove;
      const maxHeight = Math.max(44, below ? availableBelow : availableAbove);
      const panelHeight = Math.min(naturalHeight, maxHeight);
      const panelWidth = Math.min(panel.current.getBoundingClientRect().width, width - 24);
      const requestedLeft = align === 'end' ? anchor.right - panelWidth : anchor.left;
      setPosition({ position: 'fixed', left: Math.max(leftBound + 12, Math.min(requestedLeft, leftBound + width - panelWidth - 12)), top: Math.max(topBound + 12, below ? anchor.bottom + 8 : anchor.top - panelHeight - 8), maxWidth: width - 24, maxHeight, visibility: 'visible' });
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    if (panel.current) observer?.observe(panel.current);
    if (trigger.current) observer?.observe(trigger.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, [open, trigger, panel, align]);
  return position;
}
export function useFloatingDismiss(open: boolean, trigger: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, close: (reason: FloatingReason, returnFocus?: boolean) => void) {
  const latest = useRef(close); latest.current = close;
  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) => target instanceof Node && (trigger.current?.contains(target) || panel.current?.contains(target));
    const pointer = (event: PointerEvent) => { if (!inside(event.target)) latest.current('outside'); };
    const focus = (event: FocusEvent) => { if (!inside(event.target)) latest.current('focus-out'); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && inside(event.target)) { event.preventDefault(); event.stopPropagation(); latest.current('escape', true); } };
    document.addEventListener('pointerdown', pointer); document.addEventListener('focusin', focus); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('focusin', focus); document.removeEventListener('keydown', key); };
  }, [open, trigger, panel]);
}
