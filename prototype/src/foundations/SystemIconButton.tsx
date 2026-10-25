import type { SystemButtonProps } from './SystemButton';
import { SystemButton } from './SystemButton';
import { SystemIcon } from './SystemIcon';
import type { SystemIconName } from './SystemIcon';

export interface SystemIconButtonProps extends Omit<SystemButtonProps, 'children' | 'leadingIcon' | 'trailingIcon' | 'aria-label'> {
  label: string;
  icon: SystemIconName;
  /** Compact for standalone help/dismiss actions; toolbar matches adjacent full-size controls. */
  density?: 'toolbar' | 'compact';
  iconSize?: 16 | 20 | 24;
}
/** Toggle callers supply aria-pressed; a tooltip is never the only accessible name. */
export function SystemIconButton({ label, icon, iconSize = 20, density = 'toolbar', className = '', ...props }: SystemIconButtonProps) {
  return <SystemButton {...props} aria-label={label} data-density={density} className={`system-icon-button ${className}`.trim()} leadingIcon={<SystemIcon name={icon} size={iconSize}/>} />;
}
