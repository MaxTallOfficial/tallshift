import { useId, useState } from 'react';
import { accessProductOffer, accessStatesCopy, type AccessScenario, type AccessStatesLocale } from './access-states-copy';
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
      <article className="as-offer as-offer-free" aria-labelledby={`${id}-free-title`}>
        <header className="as-offer-head">
          <div><span className="as-id">A001</span><p className="as-offer-name">State Relay</p></div>
          <AccessMark kind="free" />
        </header>
        <span className="as-badge as-badge-free">{t.freeAccess}</span>
        <h3 id={`${id}-free-title`} className="as-claim">{t.freeClaim} <span>{t.freeClaimAccent}</span></h3>
        <p className="as-description">{t.freeDescription}</p>
        <ul className="as-benefits">{t.freeBenefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
        <div className="as-free-footer">
          <button type="button" className="sy-button sy-button-primary" onClick={onOpenMaterial}>{t.open}</button>
          <p>{t.freeDelivery}</p>
        </div>
      </article>

      <article className="as-offer as-offer-pro" aria-labelledby={`${id}-pro-title`}>
        <header className="as-offer-head">
          <div><span className="as-id">{accessProductOffer.offerId}</span><p className="as-offer-name">{accessProductOffer.name}</p></div>
          <AccessMark kind="pro" />
        </header>
        <span className="as-badge">{t.planned}</span>
        <h3 id={`${id}-pro-title`} className="as-claim">{t.proClaim} <span>{t.proClaimAccent}</span></h3>
        <p className="as-description">{t.proDescription}</p>
        <ul className="as-benefits">{t.proBenefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
        <details className="as-offer-details"><summary>{t.details}</summary>
        <div className="as-scope"><p>{t.scope}</p><ul aria-label={t.scope}>{accessProductOffer.itemIds.map(itemId => <li key={itemId}><code>{itemId}</code></li>)}</ul></div>
        <dl className="as-offer-facts">
          <div><dt>{t.version}</dt><dd>{t.versionValue}</dd></div>
          <div><dt>{t.license}</dt><dd>{t.licenseValue}</dd></div>
          <div><dt>{t.updates}</dt><dd>{t.updatesValue}</dd></div>
        </dl>
        </details>
        <div className="as-pro-footer"><p className="as-sale-state">{t.notOnSale}</p><p className="as-price-note">{t.priceNote}</p><p className="as-pack-note">{t.packNote}</p></div>
      </article>
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
          const reasonId = `${id}-${value}-action-reason`;
          return <div key={value} className="as-state" data-scenario={value} data-active={active} inert={!active} aria-hidden={!active}>
            <div className="as-state-copy" role={active ? 'status' : undefined} aria-live={active ? 'polite' : undefined} aria-atomic={active ? true : undefined}>
              <span className="as-simulated">{t.simulated}</span>
              <span className="as-state-item" aria-label={t.scenarioItem}>{isFree ? 'A001 · State Relay' : 'PACK-PRODUCT · Product'}</span>
              <span className="as-state-status"><span aria-hidden="true" />{state.status}</span>
              <h3>{state.title}</h3>
              <p>{state.body}</p>
            </div>
            <div className="as-state-action">
              <button type="button" className={`sy-button ${isFree ? 'sy-button-primary' : 'as-button-unavailable'}`} disabled={!isFree} onClick={isFree ? onOpenMaterial : undefined} aria-describedby={reasonId}>{state.action}</button>
              <p id={reasonId}>{state.reason}</p>
            </div>
          </div>;
        })}
      </div>
    </div>
  </section>;
}
