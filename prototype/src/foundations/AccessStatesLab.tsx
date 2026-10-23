import { useId, useState } from 'react';
import { accessProductOffer, accessStatesCopy, type AccessScenario, type AccessStatesLocale } from './access-states-copy';
import { SystemOffer } from './SystemOffer';
import { SystemEntitlementState } from './SystemEntitlementState';
import { SystemAccordion } from './SystemAccordion';
import './access-states-lab.css';

type AccessStatesLabProps = { locale: AccessStatesLocale; onOpenMaterial: () => void };

const scenarios: readonly AccessScenario[] = ['free', 'no-access', 'pending', 'owner', 'error', 'closed'];

function AccessMark({ kind }: { kind: 'free' | 'pro' }) {
  return <svg className="as-mark" viewBox="0 0 88 72" fill="none" aria-hidden="true">
    {kind === 'free' ? <>
      <path d="M12 36h18m28 0h18" />
      <rect x="29" y="21" width="30" height="30" rx="8" />
      <path d="m38 36 5 5 9-11" />
      <circle cx="12" cy="36" r="3" /><circle cx="76" cy="36" r="3" />
    </> : <>
      <rect x="14" y="11" width="26" height="21" rx="4" />
      <rect x="48" y="11" width="26" height="21" rx="4" />
      <rect x="14" y="40" width="26" height="21" rx="4" />
      <rect x="48" y="40" width="26" height="21" rx="4" />
      <path d="M23 21h8m25 0h10M24 50h7m26 0h9" />
    </>}
  </svg>;
}

export function AccessStatesLab({ locale, onOpenMaterial }: AccessStatesLabProps) {
  const t = accessStatesCopy[locale];
  const id = useId();
  const [scenario, setScenario] = useState<AccessScenario>('free');

  return <section id="access-states" className="as-lab sy-section" aria-labelledby={`${id}-title`}>
    <div className="sy-section-heading">
      <span className="sy-kicker">{t.kicker}</span>
      <h2 id={`${id}-title`}>{t.title}</h2>
      <p>{t.intro}</p>
    </div>

    <div className="as-specimen-note">
      <span className="as-specimen-label">{t.specimen}</span>
      <p>{t.specimenNote}</p>
    </div>

    <div className="as-offers">
      <SystemOffer offer={{ id: 'A001', name: 'State Relay', availability: 'available', badge: t.freeAccess,
        headline: <>{t.freeClaim} <span>{t.freeClaimAccent}</span></>, description: t.freeDescription,
        benefits: t.freeBenefits, deliveryNote: t.freeDelivery }} illustration={<AccessMark kind="free" />} action={{ label: t.open, onAction: onOpenMaterial }} />
      <SystemOffer offer={{ id: accessProductOffer.offerId, name: accessProductOffer.name, availability: 'planned', badge: t.planned,
        headline: <>{t.proClaim} <span>{t.proClaimAccent}</span></>, description: t.proDescription,
        benefits: t.proBenefits, priceLabel: t.notOnSale, priceNote: t.priceNote, deliveryNote: t.packNote }} illustration={<AccessMark kind="pro" />} details={
        <SystemAccordion className="as-offer-details" headingLevel={4} items={[{ id: 'offer-scope', title: t.details, content: <>
        <div className="as-scope"><p>{t.scope}</p><ul aria-label={t.scope}>{accessProductOffer.itemIds.map(itemId => <li key={itemId}><code>{itemId}</code></li>)}</ul></div>
        <dl className="as-offer-facts">
          <div><dt>{t.version}</dt><dd>{t.versionValue}</dd></div>
          <div><dt>{t.license}</dt><dd>{t.licenseValue}</dd></div>
          <div><dt>{t.updates}</dt><dd>{t.updatesValue}</dd></div>
        </dl>
        </> }]} />
      } />
    </div>

    <div className="as-access-panel">
      <fieldset className="as-scenarios" aria-describedby={`${id}-preview-hint`}>
        <legend>{t.preview}</legend>
        <p id={`${id}-preview-hint`}>{t.previewHint}</p>
        <div className="as-scenario-options">{scenarios.map(value => <label key={value}>
          <input type="radio" name={`${id}-scenario`} value={value} checked={scenario === value} onChange={() => setScenario(value)} />
          <span>{t.scenarios[value].label}</span>
        </label>)}</div>
      </fieldset>

      <div className="as-state-stack">
        {scenarios.map(value => {
          const active = scenario === value;
          const state = t.scenarios[value];
          const isFree = value === 'free';
          return <SystemEntitlementState key={value} active={active} announce state={{ kind: value,
            simulationLabel: t.simulated, itemLabel: isFree ? 'A001 · State Relay' : 'PACK-PRODUCT · Product',
            status: state.status, title: state.title, body: state.body,
            action: { label: state.action, reason: state.reason, disabled: !isFree, onAction: isFree ? onOpenMaterial : undefined },
          }} />;
        })}
      </div>
    </div>
  </section>;
}
