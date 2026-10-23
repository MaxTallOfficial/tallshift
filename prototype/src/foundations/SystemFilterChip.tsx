import type { Ref } from 'react';
import './system-filter-chip.css';

export interface SystemFilterChipProps {
  label: string;
  removeLabel: string;
  onRemove: () => void;
  disabled?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}

/** One removable criterion. The accessible name includes both its group and value. */
export function SystemFilterChip({ label, removeLabel, onRemove, disabled = false, buttonRef }: SystemFilterChipProps) {
  return <button ref={buttonRef} type="button" className="sys-filter-chip" aria-label={removeLabel} disabled={disabled} onClick={onRemove}>
    <span>{label}</span><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 8 8m-8 0 8-8" /></svg>
  </button>;
}
