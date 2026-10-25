import { useId, type ReactNode } from 'react';
import { SystemButton } from './SystemButton';
import './access-states-lab.css';
export interface SystemOfferAction { label: string; onAction?: () => void; disabled?: boolean; reason?: string }
export interface SystemOfferData {
  id: string; name: string; availability: 'available' | 'planned' | 'closed'; badge: string;
  headline: ReactNode; description: string; benefits: readonly string[];
  /** A caller-provided, explicit price or sale-status label; never inferred from a price hypothesis. */
  priceLabel?: string; priceNote?: string; deliveryNote?: string;
}
export interface SystemOfferProps { offer: SystemOfferData; action?: SystemOfferAction; illustration?: ReactNode; details?: ReactNode; children?: ReactNode; className?: string }
export function SystemOffer({ offer, action, illustration, details, children, className = '' }: SystemOfferProps) {
  const id = useId(); const blocked = offer.availability !== 'available' || action?.disabled || !action?.onAction;
  return <article className={`as-offer as-offer-${offer.availability === 'available' ? 'free' : 'pro'} ${className}`.trim()} aria-labelledby={`${id}-title`} data-availability={offer.availability}>
    <header className="as-offer-head"><div><p className="as-offer-name">{offer.name}</p></div>{illustration}</header>
    <span className={`as-badge ${offer.availability === 'available' ? 'as-badge-free' : ''}`}>{offer.badge}</span>
    <h3 id={`${id}-title`} className="as-claim">{offer.headline}</h3><p className="as-description">{offer.description}</p>
    <ul className="as-benefits">{offer.benefits.map((benefit,index) => <li key={`${index}-${benefit}`}>{benefit}</li>)}</ul>{details}
    <div className={offer.availability === 'available' ? 'as-free-footer' : 'as-pro-footer'}>
      {offer.priceLabel && <p className="as-sale-state">{offer.priceLabel}</p>}{offer.priceNote && <p className="as-price-note">{offer.priceNote}</p>}
      {action && <SystemButton variant={offer.availability === 'available' ? 'primary' : 'secondary'} disabled={blocked} onClick={action.onAction} aria-describedby={action.reason ? `${id}-reason` : undefined}>{action.label}</SystemButton>}
      {action?.reason && <p id={`${id}-reason`}>{action.reason}</p>}{offer.deliveryNote && <p className="as-pack-note">{offer.deliveryNote}</p>}{children}
    </div>
  </article>;
}
