import type { SystemButtonProps } from './SystemButton';
import { SystemButton } from './SystemButton';
import { SystemIcon } from './SystemIcon';
import type { SystemIconName } from './SystemIcon';

export interface SystemIconButtonProps extends Omit<SystemButtonProps, 'children' | 'leadingIcon' | 'trailingIcon' | 'aria-label'> {
  label: string;
  icon: SystemIconName;
}
/** Toggle callers supply aria-pressed; a tooltip is never the only accessible name. */
export function SystemIconButton({ label, icon, className = '', ...props }: SystemIconButtonProps) {
  return <SystemButton {...props} aria-label={label} className={`system-icon-button ${className}`.trim()}><SystemIcon name={icon} /></SystemButton>;
}
