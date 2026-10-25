import type { Ref } from 'react';
import './system-filter-chip.css';
import { SystemIcon } from './SystemIcon';

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
    <span>{label}</span><SystemIcon name="close" size={16}/>
  </button>;
}
