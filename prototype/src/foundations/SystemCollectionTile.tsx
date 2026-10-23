import './system-catalog.css';
export interface SystemCollectionTileProps {
  name: string; title: string; accessLabel: string; countLabel: string; membersLabel: string; memberIds: readonly string[]; actionLabel: string;
  selected: boolean; onSelect: () => void; disabled?: boolean; className?: string;
}
/** One selection target; all card contents are non-interactive text. Counts stay caller-owned canonical data. */
export function SystemCollectionTile({ name, title, accessLabel, countLabel, membersLabel, memberIds, actionLabel, selected, onSelect, disabled = false, className = '' }: SystemCollectionTileProps) {
  return <button type="button" className={`system-collection-tile ${className}`} aria-pressed={selected} disabled={disabled} onClick={onSelect}>
    <span className="system-collection-name">{name}</span><span className="system-collection-access">{accessLabel}</span>
    <span className="system-collection-title">{title}</span><span className="system-collection-count">{countLabel}</span>
    <span className="system-collection-members"><span>{membersLabel}: </span>{memberIds.join(' · ')}</span>
    <span className="system-collection-action">{actionLabel}</span>
  </button>;
}
