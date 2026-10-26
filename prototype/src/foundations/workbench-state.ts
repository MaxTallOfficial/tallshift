import { normalizeHexColor } from './config-control-validation.ts';
export type DraftState = 'applied' | 'pending' | 'invalid';
export function colorDraftState(draft: string, applied: string): DraftState {
 const normalized = normalizeHexColor(draft);
 return normalized === null ? 'invalid' : normalized === normalizeHexColor(applied) ? 'applied' : 'pending';
}
export function canExportConfiguration(states: readonly DraftState[]) { return states.every(state => state === 'applied'); }
