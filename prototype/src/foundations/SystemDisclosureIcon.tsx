import { SystemIcon } from './SystemIcon';
import './system-disclosure-icon.css';
/** Native details controls open state; both glyphs come from Hugeicons. */
export function SystemDisclosureIcon({ direction = 'down' }: { direction?: 'down' | 'right' }) {
 return <span className="system-disclosure-icon" aria-hidden="true"><span className="system-disclosure-closed"><SystemIcon name={direction === 'right' ? 'chevron-right' : 'chevron-down'} size={16}/></span><span className="system-disclosure-open"><SystemIcon name={direction === 'right' ? 'chevron-down' : 'chevron-up'} size={16}/></span></span>;
}
