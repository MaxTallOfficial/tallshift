import { useId, type ReactNode } from 'react';
import { SystemButton } from './SystemButton';
import './system-catalog.css';

export type SystemContentAction =
  | { state: 'ready'; label: string; onOpen: () => void; loading?: boolean }
  | { state: 'planned' | 'unavailable'; label: string; reason: string };
export interface SystemContentTileProps {
  name: string;
  title: string;
  description: string;
  metadata: ReactNode;
  status: ReactNode;
  action: SystemContentAction;
  preview?: ReactNode;
  footnote?: string;
  headingLevel?: 3 | 4;
  density?: 'default' | 'compact';
  className?: string;
  /** Independent control, never nested inside the open action. */
  favorite?: { label: string; selected: boolean; onChange: (selected: boolean) => void; disabled?: boolean };
}
export function SystemContentTile({ name, title, description, metadata, status, action, preview, footnote, headingLevel = 3, density = 'default', className = '', favorite }: SystemContentTileProps) {
  const id = useId();
  const Heading = headingLevel === 4 ? 'h4' : 'h3';
  return <article className={`system-content-tile ${className}`} data-density={density} data-state={action.state} aria-labelledby={`${id}-title`}>
    {preview && <div className="system-content-preview">{preview}</div>}
    <div className="system-content-body">
      <div className="system-content-meta">{metadata}</div>
      <p className="system-content-name" lang="en">{name}</p>
      <Heading id={`${id}-title`}>{title}</Heading>
      <p className="system-content-description">{description}</p>
      <div className="system-content-status">{status}</div>
      <div className="system-content-footer"><div className="system-content-actions">
        <SystemButton variant={action.state === 'ready' ? 'primary' : 'secondary'} disabled={action.state !== 'ready'} loading={action.state === 'ready' && action.loading} aria-describedby={action.state !== 'ready' ? `${id}-reason` : undefined} onClick={action.state === 'ready' ? action.onOpen : undefined}>{action.label}</SystemButton>
        {favorite && <SystemButton aria-label={favorite.label} aria-pressed={favorite.selected} disabled={favorite.disabled} onClick={() => favorite.onChange(!favorite.selected)}>{favorite.label}</SystemButton>}
      </div>{action.state !== 'ready' && <p id={`${id}-reason`} className="system-content-note">{action.reason}</p>}{footnote && <p className="system-content-note">{footnote}</p>}</div>
    </div>
  </article>;
}
