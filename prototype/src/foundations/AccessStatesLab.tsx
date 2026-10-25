import { pricingPlansCopy, pricingPlanScopes, pricingPlanTerms } from './pricing-plans';
import { collectionMembers } from './material-labels';
import { useId, useState } from 'react';
import { accessProductOffer, accessStatesCopy, type AccessScenario, type AccessStatesLocale } from './access-states-copy';
import { SystemOffer } from './SystemOffer';
import { SystemEntitlementState } from './SystemEntitlementState';
import { SystemAccordion } from './SystemAccordion';
import './access-states-lab.css';

type AccessStatesLabProps = { locale: AccessStatesLocale; onOpenMaterial: () => void };

const scenarios: readonly AccessScenario[] = ['free', 'no-access', 'pending', 'owner', 'error', 'closed'];


export function AccessStatesLab({ locale, onOpenMaterial }: AccessStatesLabProps) {
  const t = accessStatesCopy[locale];
  const pricing = pricingPlansCopy[locale];
  const id = useId();
  const [scenario, setScenario] = useState<AccessScenario>('free');

  return <section id="access-states" className="as-lab sy-section" aria-labelledby={`${id}-title`}>
    <div className="sy-section-heading">
      <span className="sy-kicker">{t.kicker}</span>
      <h2 id={`${id}-title`}>{pricing.title}</h2>
      <p>{pricing.intro}</p>
    </div>

    <div className="as-specimen-note">
      <span className="as-specimen-label">{t.specimen}</span>
      <p>{t.specimenNote}</p>
    </div>

    <div className="as-offers">
      <SystemOffer offer={{ id: pricingPlanTerms.starter.offerId, name: 'Starter', availability: 'available', badge: t.freeAccess,
        priceAmount: `$${pricingPlanTerms.starter.priceMinor / 100}`, billingLabel: pricing.free, headline: <>{pricing.starterClaim} <span>{pricing.starterAccent}</span></>, description: pricing.starterDescription,
        benefits: pricing.starterBenefits, deliveryNote: pricing.starterStatus }} details={<SystemAccordion headingLevel={4} className="as-offer-details" items={[{id:"starter-scope", title:t.details, content:<div className="as-scope"><p>{pricing.starterScope}</p><ul>{collectionMembers(pricingPlanScopes.starter,locale).map(item=><li key={item.id}>{item.label}</li>)}</ul></div>}]} />} action={{ label: t.open, onAction: onOpenMaterial }} />
      <SystemOffer offer={{ id: accessProductOffer.offerId, name: accessProductOffer.name, availability: 'planned', badge: t.planned,
        priceAmount: `$${pricingPlanTerms.product.priceMinor / 100}`, billingLabel: pricing.once, headline: <>{t.proClaim} <span>{t.proClaimAccent}</span></>, description: t.proDescription,
        benefits: t.proBenefits, priceLabel: t.notOnSale, priceNote: pricing.hypothesis, deliveryNote: t.packNote }} featuredLabel={pricing.recommendation} action={{label:pricing.closed,disabled:true}} details={
        <SystemAccordion className="as-offer-details" headingLevel={4} items={[{ id: 'offer-scope', title: t.details, content: <>
        <div className="as-scope"><p>{t.scope}</p><ul aria-label={t.scope}>{collectionMembers(accessProductOffer.itemIds,locale).map(item => <li key={item.id}>{item.label}</li>)}</ul></div>
        <dl className="as-offer-facts">
          <div><dt>{t.license}</dt><dd>{t.licenseValue}</dd></div>
          <div><dt>{t.updates}</dt><dd>{t.updatesValue}</dd></div>
        </dl>
        </> }]} />
      } />
      <SystemOffer offer={{id:pricingPlanTerms.bundle.offerId,name:'All packs',availability:'planned',badge:t.planned,priceAmount:`$${pricingPlanTerms.bundle.priceMinor / 100}`,billingLabel:pricing.once,
        headline:<>{pricing.bundleClaim} <span>{pricing.bundleAccent}</span></>,description:pricing.bundleDescription,benefits:pricing.bundleBenefits,priceLabel:t.notOnSale,priceNote:pricing.hypothesis,deliveryNote:t.packNote}}
        action={{label:pricing.closed,disabled:true}} details={<SystemAccordion headingLevel={4} className="as-offer-details" items={[{id:'bundle-scope',title:t.details,content:<div className="as-scope"><p>{pricing.bundleScope}</p><ul>{collectionMembers(pricingPlanScopes.bundle,locale).map(item=><li key={item.id}>{item.label}</li>)}</ul></div>}]} />} />
    </div>
    <div className="as-comparison"><h3>{pricing.compareTitle}</h3><div className="as-comparison-scroll" role="region" aria-label={pricing.compareTitle} tabIndex={0}><table><thead><tr><th scope="col">{locale==='ru'?'Условия':locale==='vi'?'Điều kiện':'Terms'}</th><th scope="col">Starter</th><th scope="col">Product</th><th scope="col">All packs</th></tr></thead><tbody>{pricing.rows.map(([label,...values])=><tr key={label}><th scope="row">{label}</th>{values.map((value,index)=><td key={index}>{value}</td>)}</tr>)}</tbody></table></div><p>{pricing.shared}</p><p>{pricing.upgrades}</p><p>{pricing.other}</p></div>

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
            simulationLabel: t.simulated, itemLabel: isFree ? 'State Relay' : 'Product',
            status: state.status, title: state.title, body: state.body,
            action: { label: state.action, reason: state.reason, disabled: !isFree, onAction: isFree ? onOpenMaterial : undefined },
          }} />;
        })}
      </div>
    </div>
  </section>;
}
