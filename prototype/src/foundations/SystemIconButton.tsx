import type { SystemButtonProps } from './SystemButton';
import { SystemButton } from './SystemButton';
import { SystemIcon } from './SystemIcon';
import type { SystemIconName } from './SystemIcon';

export interface SystemIconButtonProps extends Omit<SystemButtonProps, 'children' | 'leadingIcon' | 'trailingIcon' | 'aria-label'> {
  label: string;
  icon: SystemIconName;
  iconSize?: 16 | 20 | 24;
}
/** Toggle callers supply aria-pressed; a tooltip is never the only accessible name. */
export function SystemIconButton({ label, icon, iconSize = 20, className = '', ...props }: SystemIconButtonProps) {
  return <SystemButton {...props} aria-label={label} className={`system-icon-button ${className}`.trim()} leadingIcon={<SystemIcon name={icon} size={iconSize}/>} />;
}
