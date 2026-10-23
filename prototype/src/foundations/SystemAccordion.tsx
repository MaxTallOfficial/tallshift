import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import './system-accordion.css';

export interface SystemAccordionItem {
  /** Stable, unique within this accordion. */
  id: string;
  title: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
}
export interface SystemAccordionProps {
  items: readonly SystemAccordionItem[];
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  onToggle?: (id: string, open: boolean) => void;
}
function AccordionItem({ item, headingLevel, onToggle }: { item: SystemAccordionItem; headingLevel: NonNullable<SystemAccordionProps['headingLevel']>; onToggle: SystemAccordionProps['onToggle'] }) {
  const titleId = useId();
  const [open, setOpen] = useState(Boolean(item.defaultOpen));
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return <details open={open || undefined} onToggle={event => { const next = event.currentTarget.open; setOpen(next); onToggle?.(item.id, next); }}>
    <summary><Heading id={titleId}>{item.title}</Heading><span aria-hidden="true" className="system-accordion-mark" /></summary>
    <div className="system-accordion-content" aria-labelledby={titleId}>{item.content}</div>
  </details>;
}
/** Independent native disclosures. Content stays mounted; native details controls visibility. */
export function SystemAccordion({ items, headingLevel = 3, className = '', onToggle }: SystemAccordionProps) {
  return <div className={`system-accordion ${className}`.trim()}>{items.map(item => <AccordionItem key={item.id} item={item} headingLevel={headingLevel} onToggle={onToggle} />)}</div>;
}
