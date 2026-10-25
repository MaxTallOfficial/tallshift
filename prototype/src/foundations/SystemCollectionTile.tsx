import { useId } from 'react';
import './system-catalog.css';
export interface SystemCollectionMember { id: string; label: string }
export interface SystemCollectionTileProps {
  name: string; title: string; accessLabel: string; countLabel: string; membersLabel: string; members: readonly SystemCollectionMember[]; actionLabel: string;
  selected: boolean; onSelect: () => void; disabled?: boolean; className?: string;
}
/** Selection and membership disclosure are siblings, never nested interactive targets. */
export function SystemCollectionTile({ name, title, accessLabel, countLabel, membersLabel, members, actionLabel, selected, onSelect, disabled = false, className = '' }: SystemCollectionTileProps) {
  const id=useId();
  return <article className={`system-collection-tile ${className}`} aria-labelledby={`${id}-name`}>
    <button type="button" className="system-collection-select" aria-pressed={selected} disabled={disabled} onClick={onSelect}>
      <span id={`${id}-name`} className="system-collection-name">{name}</span><span className="system-collection-access">{accessLabel}</span>
      <span className="system-collection-title">{title}</span><span className="system-collection-count">{countLabel}</span>
      <span className="system-collection-action">{actionLabel}</span>
    </button>
    <details className="system-collection-members"><summary>{membersLabel}</summary><ul>{members.map(member=><li key={member.id}>{member.label}</li>)}</ul></details>
  </article>;
}
