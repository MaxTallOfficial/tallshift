import { useId, type ReactNode } from 'react';
import { SystemButton } from './SystemButton';
import './access-states-lab.css';
import { SystemIcon, type SystemIconName } from './SystemIcon';
export interface SystemOfferAction { label: string; onAction?: () => void; disabled?: boolean; reason?: string }
export interface SystemOfferData {
  id: string; name: string; availability: 'available' | 'planned' | 'closed'; badge: string;
  headline: ReactNode; description: string; benefits: readonly string[]; benefitIcons?: readonly SystemIconName[];
  /** A caller-provided, explicit price or sale-status label; never inferred from a price hypothesis. */
  priceAmount?: string; billingLabel?: string; priceState?: 'purchase'|'owned'|'upgrade'|'unknown';
  priceLabel?: string; priceNote?: string; deliveryNote?: string;
}
export interface SystemOfferProps { offer: SystemOfferData; action?: SystemOfferAction; illustration?: ReactNode; details?: ReactNode; children?: ReactNode; className?: string; featuredLabel?: string; selectionAction?: { label:string; onSelect:()=>void } }
export function SystemOffer({ offer, action, illustration, details, children, className = '', featuredLabel, selectionAction }: SystemOfferProps) {
  const id = useId(); const blocked = offer.availability !== 'available' || action?.disabled || !action?.onAction;
  return <article className={`as-offer as-offer-${offer.availability === 'available' ? 'free' : 'pro'} ${className}`.trim()} aria-labelledby={`${id}-title`} data-price-state={offer.priceState} data-availability={offer.availability} data-featured={featuredLabel ? true : undefined}>
    {featuredLabel && <p className="as-recommendation">{featuredLabel}</p>}
    <header className="as-offer-head"><div className="as-offer-identity">{illustration && <span className="as-offer-symbol" aria-hidden="true">{illustration}</span>}<p className="as-offer-name">{offer.name}</p></div><span className={`as-badge ${offer.availability === 'available' ? 'as-badge-free' : ''}`}>{offer.badge}</span></header>
    {offer.priceAmount && <div className="as-price"><strong>{offer.priceAmount}</strong><span>{offer.billingLabel}</span></div>}
    <h3 id={`${id}-title`} className="as-claim">{offer.headline}</h3><p className="as-description">{offer.description}</p>
    <ul className="as-benefits">{offer.benefits.map((benefit,index) => <li key={`${index}-${benefit}`}><SystemIcon name={offer.benefitIcons?.[index] ?? 'layers'} size={20} /><span>{benefit}</span></li>)}</ul>{details}
    <div className={offer.availability === 'available' ? 'as-free-footer' : 'as-pro-footer'}>
      {offer.priceLabel && <p className="as-sale-state">{offer.priceLabel}</p>}{offer.priceNote && <p className="as-price-note">{offer.priceNote}</p>}
      {selectionAction && <SystemButton variant={featuredLabel ? 'primary' : 'secondary'} onClick={selectionAction.onSelect}>{selectionAction.label}</SystemButton>}
      {!selectionAction && action && <SystemButton variant={offer.availability === 'available' ? 'primary' : 'secondary'} disabled={blocked} onClick={action.onAction} aria-describedby={action.reason ? `${id}-reason` : undefined}>{action.label}</SystemButton>}
      {action?.reason && <p id={`${id}-reason`}>{action.reason}</p>}{offer.deliveryNote && <p className="as-pack-note">{offer.deliveryNote}</p>}{children}
    </div>
  </article>;
}
