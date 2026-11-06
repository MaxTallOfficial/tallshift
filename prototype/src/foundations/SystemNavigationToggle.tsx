import {SystemButton,type SystemButtonProps} from './SystemButton';
import {SystemIcon} from './SystemIcon';
import './system-navigation-toggle.css';

export interface SystemNavigationToggleProps extends Omit<SystemButtonProps,'children'|'aria-expanded'|'aria-controls'> {
 open:boolean;controls:string;label:string;openLabel:string;closeLabel:string;
}
/** A labelled disclosure: the same control in the product and design-system shell. */
export function SystemNavigationToggle({open,controls,label,openLabel,closeLabel,className='',leadingIcon,...props}:SystemNavigationToggleProps) {
 return <SystemButton {...props} className={`system-navigation-toggle ${className}`.trim()} aria-expanded={open} aria-controls={controls} aria-label={open?closeLabel:openLabel}
  leadingIcon={leadingIcon??<SystemIcon name="grid" size={20}/>} trailingIcon={<SystemIcon name={open?'chevron-up':'chevron-down'} size={16}/>}>{label}</SystemButton>;
}
