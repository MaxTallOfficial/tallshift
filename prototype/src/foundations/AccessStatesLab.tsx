import { SystemLicenseInfo } from './SystemLicenseInfo';
import { licenseCopy } from './license-copy';
import { SystemDisclosureIcon } from './SystemDisclosureIcon';
import { SystemSelect } from './SystemSelect';
import { summarizeCoverage } from './access-model';
import { extendedAccessCopy, coverageCopy } from './access-extended-copy';
import type { SystemEntitlementKind } from './SystemEntitlementState';
import { pricingPresentation } from './pricing-presentation';
import { quotePricingPlan, type PricingPlan, type PricingOwnership } from './pricing-quote';
import { SystemDialog } from './SystemDialog';
import { SystemButton } from './SystemButton';
import { pricingPlansCopy, pricingPlanScopes, pricingPlanTerms } from './pricing-plans';
import { collectionMembers } from './material-labels';
import { useId, useState } from 'react';
import { accessProductOffer, accessStatesCopy, type AccessStatesLocale } from './access-states-copy';
import { SystemOffer } from './SystemOffer';
import { SystemEntitlementState } from './SystemEntitlementState';
import { SystemAccordion } from './SystemAccordion';
import './access-states-lab.css';

type AccessStatesLabProps = { locale: AccessStatesLocale; onOpenMaterial: () => void; ownership?: PricingOwnership; ownershipStatus?: 'loading' | 'error' | 'verified'; onOpenDownloads?: () => void };

const scenarios: readonly SystemEntitlementKind[] = ['free', 'checking', 'no-access', 'pending', 'provisioning', 'owner', 'partial', 'updates-expired', 'delivery-error', 'error', 'closed'];


export function AccessStatesLab({ locale, onOpenMaterial, ownership, ownershipStatus = 'verified', onOpenDownloads }: AccessStatesLabProps) {
  const t = accessStatesCopy[locale];
  const pricing = pricingPlansCopy[locale];
  const presentation = pricingPresentation[locale];
  const c = coverageCopy[locale];
  const scenarioCopy = {...t.scenarios, ...extendedAccessCopy[locale]};
  const ownershipVerified = ownershipStatus === 'verified';
  const [buyer, setBuyer] = useState('new');
  const fixtureOwnership: PricingOwnership = buyer === 'new' ? {itemIds:[]} : buyer === 'partial' ? {itemIds:pricingPlanScopes.bundle.filter(item => !pricingPlanScopes.product.some(productItem => productItem === item))} : {itemIds:pricingPlanScopes.product,productNetPaidMinor:1600,coverage:[{itemIds:pricingPlanScopes.product,functionalUpdatesUntil:buyer === 'expired'?'2026-01-31':'2027-03-31'}]};
  const effectiveOwnership = ownership ?? fixtureOwnership;
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const selectionQuote = selectedPlan && (selectedPlan === 'starter' || ownershipVerified) ? quotePricingPlan(selectedPlan, effectiveOwnership) : null;
  const id = useId();
  const ownedItems = selectedPlan ? pricingPlanScopes[selectedPlan].filter(item => effectiveOwnership.itemIds.includes(item)) : [];
  const coverage = summarizeCoverage(ownedItems, effectiveOwnership.itemIds, effectiveOwnership.coverage);
  const dateFormat = new Intl.DateTimeFormat(locale, {dateStyle:'medium',timeZone:'UTC'});
  const [scenario, setScenario] = useState<SystemEntitlementKind>('free');

  return <section id="access-states" className="as-lab sy-section" aria-labelledby={`${id}-title`}>
    <div className="sy-section-heading">
      <span className="sy-kicker">{t.kicker}</span>
      <h2 id={`${id}-title`}>{pricing.title}</h2>
      <p>{pricing.intro}</p>
    </div>

    <div className="as-specimen-note">
      <span className="as-specimen-label">{t.specimen}</span>
      <p>{t.specimenNote}</p>
      {!ownership && ownershipVerified && <SystemSelect label={locale==='ru'?'Сценарий покупателя · только пример':locale==='vi'?'Tình huống người mua · mô phỏng':'Buyer scenario · review only'} value={buyer} onChange={setBuyer} options={[
        {value:'new',label:locale==='ru'?'Первая покупка':locale==='vi'?'Mua lần đầu':'First purchase'},
        {value:'product',label:locale==='ru'?'Product уже куплен за $16':locale==='vi'?'Đã mua Product với $16':'Product already bought for $16'},
        {value:'expired',label:locale==='ru'?'Product куплен · срок обновлений закончился':locale==='vi'?'Product · hết thời hạn cập nhật':'Product owned · updates ended'},
        {value:'partial',label:locale==='ru'?'После возврата Product · остались 17 материалов':locale==='vi'?'Hoàn tiền Product · còn 17 mục':'Product refunded · 17 materials remain'},
      ]} />}

    </div>

    <div className="as-offers">
      <SystemOffer offer={{ id: pricingPlanTerms.starter.offerId, name: 'Starter', availability: 'available', badge: t.freeAccess,
        priceAmount: `$${pricingPlanTerms.starter.priceMinor / 100}`, billingLabel: pricing.free, headline: <>{pricing.starterClaim} <span>{pricing.starterAccent}</span></>, description: pricing.starterDescription,
        benefits: pricing.starterBenefits, benefitIcons:['layers','code','file'], deliveryNote: pricing.starterStatus }} details={<SystemAccordion headingLevel={4} className="as-offer-details" items={[{id:"starter-scope", title:t.details, content:<div className="as-scope"><p>{pricing.starterScope}</p><ul>{collectionMembers(pricingPlanScopes.starter,locale).map(item=><li key={item.id}>{item.label}</li>)}</ul></div>}]} />} selectionAction={{label:presentation.freeAction,onSelect:()=>setSelectedPlan('starter')}} />
      <SystemOffer offer={{ id: accessProductOffer.offerId, name: accessProductOffer.name, availability: 'planned', badge: presentation.pro,
        priceAmount: `$${pricingPlanTerms.product.priceMinor / 100}`, billingLabel: pricing.once, headline: <>{t.proClaim} <span>{t.proClaimAccent}</span></>, description: presentation.productDescription,
        benefits: t.proBenefits, benefitIcons:['grid','settings','play'], priceNote: presentation.tax, deliveryNote: presentation.note }} featuredLabel={pricing.recommendation} selectionAction={{label:presentation.chooseProduct,onSelect:()=>setSelectedPlan('product')}} details={
        <SystemAccordion className="as-offer-details" headingLevel={4} items={[{ id: 'offer-scope', title: t.details, content: <>
        <div className="as-scope"><p>{presentation.scope}</p><ul aria-label={presentation.scope}>{collectionMembers(accessProductOffer.itemIds,locale).map(item => <li key={item.id}>{item.label}</li>)}</ul></div>
        <dl className="as-offer-facts">
          <div><dt>{presentation.license}</dt><dd>{presentation.licenseValue}</dd></div>
          <div><dt>{presentation.updates}</dt><dd>{presentation.updatesValue}</dd></div>
        </dl>
        </> }]} />
      } />
      <SystemOffer offer={{id:pricingPlanTerms.bundle.offerId,name:'All packs',availability:'planned',badge:presentation.pro,priceAmount:`$${pricingPlanTerms.bundle.priceMinor / 100}`,billingLabel:pricing.once,
        headline:<>{pricing.bundleClaim} <span>{pricing.bundleAccent}</span></>,description:pricing.bundleDescription,benefits:pricing.bundleBenefits,benefitIcons:['layers','grid','code'],priceNote:presentation.tax,deliveryNote:presentation.note}}
        selectionAction={{label:presentation.chooseBundle,onSelect:()=>setSelectedPlan('bundle')}} details={<SystemAccordion headingLevel={4} className="as-offer-details" items={[{id:'bundle-scope',title:t.details,content:<div className="as-scope"><p>{pricing.bundleScope}</p><ul>{collectionMembers(pricingPlanScopes.bundle,locale).map(item=><li key={item.id}>{item.label}</li>)}</ul></div>}]} />} />
    </div>
    <div className="as-comparison"><h3>{pricing.compareTitle}</h3><div className="as-comparison-scroll" role="region" aria-label={pricing.compareTitle} tabIndex={0}><table><thead><tr><th scope="col">{locale==='ru'?'Условия':locale==='vi'?'Điều kiện':'Terms'}</th><th scope="col">Starter</th><th scope="col">Product</th><th scope="col">All packs</th></tr></thead><tbody>{pricing.rows.map(([label,...values])=><tr key={label}><th scope="row">{label}</th>{values.map((value,index)=><td key={index}>{value}</td>)}</tr>)}</tbody></table></div><p>{pricing.shared}</p><p>{pricing.upgrades}</p><p>{pricing.other}</p></div>

    <SystemDialog open={selectedPlan !== null} onOpenChange={open=>{if(!open)setSelectedPlan(null);}} title={presentation.title} closeLabel={presentation.close}
      description={selectedPlan ? `${selectedPlan==='starter'?'Starter':selectedPlan==='product'?'Product':'All packs'} · ${selectedPlan==='starter'?pricing.free:presentation.billing}` : undefined}
      footer={selectedPlan==='starter' ? <SystemButton variant="primary" onClick={()=>{setSelectedPlan(null);onOpenMaterial();}}>{presentation.demo}</SystemButton> : selectionQuote?.kind==='owned' ? <SystemButton disabled={!onOpenDownloads} onClick={onOpenDownloads}>{presentation.downloads}</SystemButton> : <SystemButton disabled aria-describedby={`${id}-order-note`}>{presentation.continue}</SystemButton>}>
      {selectedPlan && !selectionQuote && <p role="status">{c.checking}</p>}
      {selectedPlan && selectionQuote && <div className="as-order-summary">
        <p className="as-order-total"><span>{selectionQuote.kind==='owned'?presentation.owned:selectionQuote.kind==='upgrade'?presentation.due:presentation.subtotal}</span><strong>{new Intl.NumberFormat(locale,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(selectionQuote.amountMinor/100)}</strong></p>
        <p>{presentation.tax}</p><dl><div><dt>{presentation.license}</dt><dd>{selectedPlan==='starter'?licenseCopy[locale].permission:presentation.licenseValue}</dd></div><div><dt>{presentation.updates}</dt><dd>{selectedPlan==='starter'?pricing.rows[4][1]:selectionQuote.kind==='owned'?c.unchanged:c.activation}</dd></div></dl>
        <details className="as-order-items"><summary><SystemDisclosureIcon/>{selectionQuote.kind==='upgrade'||selectionQuote.kind==='partial'?presentation.newItems:presentation.contents} · {selectionQuote.kind==='upgrade'||selectionQuote.kind==='partial'?selectionQuote.missingItemIds.length:pricingPlanScopes[selectedPlan].length}</summary><ul>{collectionMembers(selectionQuote.kind==='upgrade'||selectionQuote.kind==='partial'?selectionQuote.missingItemIds:pricingPlanScopes[selectedPlan],locale).map(item=><li key={item.id}>{item.label}</li>)}</ul></details>
        {selectedPlan !== 'starter' && ownedItems.length > 0 && <section className="as-existing-coverage"><h3>{c.existing} · {ownedItems.length}</h3><p>{c.unchanged}</p>{coverage.groups.map(group => <div key={group.date}><p>{c.until} {dateFormat.format(new Date(group.date))}{group.expired ? ` · ${c.expired}` : ''}</p><details><summary><SystemDisclosureIcon/>{presentation.contents} · {group.itemIds.length}</summary><ul>{collectionMembers(group.itemIds,locale).map(item => <li key={item.id}>{item.label}</li>)}</ul></details></div>)}{coverage.unknownItemIds.length > 0 && <><p>{c.unknown}</p><ul>{collectionMembers(coverage.unknownItemIds,locale).map(item => <li key={item.id}>{item.label}</li>)}</ul></>}</section>}
        {selectedPlan === "starter" && <div className="as-free-license"><span>{licenseCopy[locale].permission}</span><SystemLicenseInfo locale={locale}/></div>}
        <p id={`${id}-order-note`} className="as-order-review">{presentation.review}</p>
      </div>}
    </SystemDialog>

    <div className="as-access-panel">
      <fieldset className="as-scenarios" aria-describedby={`${id}-preview-hint`}>
        <legend>{t.preview}</legend>
        <p id={`${id}-preview-hint`}>{t.previewHint}</p>
        <div className="as-scenario-options">{scenarios.map(value => <label key={value}>
          <input type="radio" name={`${id}-scenario`} value={value} checked={scenario === value} onChange={() => setScenario(value)} />
          <span>{scenarioCopy[value].label}</span>
        </label>)}</div>
      </fieldset>

      <div className="as-state-stack">
        {scenarios.map(value => {
          const active = scenario === value;
          const state = scenarioCopy[value];
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
