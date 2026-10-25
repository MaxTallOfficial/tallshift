import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { SystemIcon } from './SystemIcon';
import { FloatingPortal, useFloatingDismiss, useFloatingPosition, useFloatingState, type FloatingReason, type FloatingTriggerProps } from './system-floating';
export interface SystemMenuItem { id: string; label: ReactNode; disabled?: boolean; destructive?: boolean; kind?: 'action' | 'checkbox' | 'radio'; checked?: boolean; onSelect: () => void; }
export interface SystemMenuProps {
  label: string; items: readonly SystemMenuItem[];
  trigger: (props: FloatingTriggerProps) => ReactNode;
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean, reason: FloatingReason) => void;
  align?: 'start' | 'end';
}
export function SystemMenu({ label, items, trigger, open, defaultOpen = false, onOpenChange, align = 'end' }: SystemMenuProps) {
  const id = useId(), triggerRef = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null), last = useRef(false);
  const [active, change] = useFloatingState(open, defaultOpen, onOpenChange);
  const close = (reason: FloatingReason, restore = false) => { change(false, reason); if (restore) triggerRef.current?.focus({ preventScroll: true }); };
  const position = useFloatingPosition(active, triggerRef, panel, align);
  useFloatingDismiss(active, triggerRef, panel, close);
  useLayoutEffect(() => { if (!active || position.visibility !== 'visible') return; const enabled = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'); (last.current ? enabled?.[enabled.length - 1] : enabled?.[0])?.focus({ preventScroll: true }); if (!enabled?.length) panel.current?.focus(); }, [active, position.visibility]);
  return <>{trigger({ ref: triggerRef, id: `${id}-trigger`, 'aria-expanded': active, 'aria-controls': active ? `${id}-menu` : undefined, 'aria-haspopup': 'menu', onClick: () => { last.current = false; change(!active, 'trigger'); }, onKeyDown: event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); last.current = event.key === 'ArrowUp'; change(true, 'trigger'); } } })}
    {active && <FloatingPortal anchor={triggerRef.current}><div ref={panel} id={`${id}-menu`} role="menu" tabIndex={-1} aria-label={label} className="system-floating system-menu" style={position} onKeyDown={event => {
      const enabled = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []), current = enabled.indexOf(document.activeElement as HTMLButtonElement);
      let next: number | undefined;
      if (event.key === 'ArrowDown') next = (current + 1) % enabled.length;
      if (event.key === 'ArrowUp') next = (current - 1 + enabled.length) % enabled.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = enabled.length - 1;
      if (next !== undefined) { event.preventDefault(); enabled[next]?.focus(); }
      if (event.key === 'Tab') close('focus-out', true);
    }}>{items.map(item => <button key={item.id} type="button" role={item.kind === 'checkbox' ? 'menuitemcheckbox' : item.kind === 'radio' ? 'menuitemradio' : 'menuitem'} aria-checked={item.kind === 'checkbox' || item.kind === 'radio' ? Boolean(item.checked) : undefined} tabIndex={-1} disabled={item.disabled} data-destructive={item.destructive || undefined} onClick={() => { if (item.disabled) return; close('action', true); item.onSelect(); }}><span>{item.label}</span>{(item.kind === 'checkbox' || item.kind === 'radio') && <span aria-hidden="true" className="system-menu-check">{item.checked && <SystemIcon name="check" size={16} />}</span>}</button>)}</div></FloatingPortal>}
  </>;
}
