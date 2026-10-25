import { SystemIcon } from './SystemIcon';
import './system-checkmark.css';
/** Shared passive mark. Its parent owns native checkbox or listbox semantics. */
export function SystemCheckmark({checked=false,mixed=false,className=''}:{checked?:boolean;mixed?:boolean;className?:string}) {
 return <span className={`system-checkmark ${className}`.trim()} data-checked={checked||mixed||undefined} aria-hidden="true"><SystemIcon name={mixed?'checkbox-mixed':checked?'checkbox-checked':'checkbox-unchecked'} size={24}/></span>;
}
