import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { SystemIconButton } from './SystemIconButton';
import { FloatingPortal, useFloatingDismiss, useFloatingPosition, useFloatingState, type FloatingReason, type FloatingTriggerProps } from './system-floating';
export interface SystemPopoverProps {
  title: string; closeLabel: string; children: ReactNode; trigger: (props: FloatingTriggerProps) => ReactNode;
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean, reason: FloatingReason) => void;
  align?: 'start' | 'end';
}
/** Nonmodal information surface: moves focus inside, never traps Tab. */
export function SystemPopover({ title, closeLabel, children, trigger, open, defaultOpen = false, onOpenChange, align = 'end' }: SystemPopoverProps) {
  const id = useId(), triggerRef = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const [active, change] = useFloatingState(open, defaultOpen, onOpenChange);
  const close = (reason: FloatingReason, restore = false) => { change(false, reason); if (restore) triggerRef.current?.focus({ preventScroll: true }); };
  useFloatingDismiss(active, triggerRef, panel, close);
  const position = useFloatingPosition(active, triggerRef, panel, align);
  useLayoutEffect(() => { if (active && position.visibility === 'visible') panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); }, [active, position.visibility]);
  return <>{trigger({ ref: triggerRef, id: `${id}-trigger`, 'aria-expanded': active, 'aria-controls': active ? `${id}-popover` : undefined, 'aria-haspopup': 'dialog', onClick: () => change(!active, 'trigger') })}
    {active && <FloatingPortal anchor={triggerRef.current}><div ref={panel} id={`${id}-popover`} role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} className="system-floating system-popover" style={position} onKeyDown={event => {
      if (event.key !== 'Tab' || event.defaultPrevented) return;
      const visibleStops = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]')].filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      const stops = visibleStops(event.currentTarget);
      const focused = event.currentTarget.ownerDocument.activeElement;
      if (event.shiftKey && focused === stops[0]) { event.preventDefault(); close('focus-out', true); }
      else if (!event.shiftKey && focused === stops.at(-1)) {
        event.preventDefault();
        const anchor = triggerRef.current;
        if (!anchor) { close('focus-out'); return; }
        const scope = anchor.closest('dialog[open]') ?? anchor.ownerDocument;
        const outside = visibleStops(scope).filter(element => !panel.current?.contains(element));
        const following = outside[outside.indexOf(anchor) + 1];
        close('focus-out'); (following ?? anchor).focus({ preventScroll: true });
      }
    }}><header><h4 id={`${id}-title`}>{title}</h4><SystemIconButton icon="close" label={closeLabel} variant="quiet" onClick={() => close('close', true)} /></header>{children}</div></FloatingPortal>}
  </>;
}
