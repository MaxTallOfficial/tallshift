import { useId } from 'react';
import { SystemButton } from './SystemButton';
import './access-states-lab.css';
export type SystemEntitlementKind = 'free' | 'no-access' | 'pending' | 'owner' | 'error' | 'closed' | 'checking' | 'provisioning' | 'partial' | 'updates-expired' | 'delivery-error';
export interface SystemEntitlementData { kind: SystemEntitlementKind; itemLabel: string; status: string; title: string; body: string; action: { label: string; reason: string; onAction?: () => void; disabled?: boolean; intent?: 'download' | 'retry' | 'check' }; simulationLabel?: string }
export interface SystemEntitlementStateProps { state: SystemEntitlementData; active?: boolean; announce?: boolean; className?: string }
/** Presentation only. The caller must verify access server-side before providing an enabled file action. */
export function SystemEntitlementState({ state, active = true, announce = false, className = '' }: SystemEntitlementStateProps) {
  const id = useId(); const enabledKind = state.kind === 'free' || state.kind === 'owner' || state.kind === 'partial' || state.kind === 'updates-expired' || state.kind === 'delivery-error' || ((state.kind === 'provisioning' || state.kind === 'error') && state.action.intent !== undefined && state.action.intent !== 'download');
  const blocked = !enabledKind || state.action.disabled || !state.action.onAction;
  return <div className={`as-state ${className}`.trim()} data-scenario={state.kind} data-active={active} inert={!active} aria-hidden={!active || undefined}>
    <div className="as-state-copy" role={active && announce ? 'status' : undefined} aria-atomic={active && announce || undefined}>
      {state.simulationLabel && <span className="as-simulated">{state.simulationLabel}</span>}<span className="as-state-item">{state.itemLabel}</span>
      <span className="as-state-status"><span aria-hidden="true" />{state.status}</span><h3>{state.title}</h3><p>{state.body}</p>
    </div><div className="as-state-action"><SystemButton variant={state.kind === 'free' ? 'primary' : 'secondary'} disabled={blocked} onClick={state.action.onAction} aria-describedby={`${id}-reason`}>{state.action.label}</SystemButton><p id={`${id}-reason`}>{state.action.reason}</p></div>
  </div>;
}
