import { SystemDialog } from './SystemDialog';
import type { SystemDialogProps } from './SystemDialog';
import './system-sheet.css';

export type SystemSheetProps = Omit<SystemDialogProps, 'variant'>;
/** Modal only: persistent sidebars need a separate non-modal navigation pattern. */
export function SystemSheet(props: SystemSheetProps) { return <SystemDialog {...props} variant="sheet" />; }
