import { useId } from 'react';
import { SystemAccordion } from '../foundations/SystemAccordion';
import { SystemBadge } from '../foundations/SystemBadge';
import { SystemButton } from '../foundations/SystemButton';
import { SystemEmptyState } from '../foundations/SystemEmptyState';
import { SystemIcon } from '../foundations/SystemIcon';
import { summarizeCoverage } from '../foundations/access-model';
import { buyerScenarioOwnership, type BuyerScenario } from '../foundations/buyer-scenario';
import { pricingPlanScopes, pricingPlanTerms } from '../foundations/pricing-plans';
import { quotePricingPlan } from '../foundations/pricing-quote';
import { materials, type Locale } from './catalog-data';
import { checkoutCopy } from './checkout-copy';
import { materialDisplayName } from './material-presentation';
import { ProductLink } from './ProductLink';
import './pages.css';
import './checkout.css';

/** Local purchase review only. URL examples never become account rights or a payment quote. */
export function CheckoutPage({ locale, search }: { locale: Locale; search: string }) {
  const t = checkoutCopy[locale];
  const id = useId();
  const query = new URLSearchParams(search);
  const plan = (['product', 'bundle'] as const).find(value => value === query.get('plan'));
  const buyer: BuyerScenario = (['new', 'product', 'expired', 'partial'] as const).find(value => value === query.get('example')) ?? 'new';
  const pricingHref = `/${locale}/pricing${buyer === 'new' ? '' : `?example=${buyer}`}`;
  if (!plan) return <div className="product-page cp-page">
    <header className="product-page-heading"><h1>{t.title}</h1></header>
    <SystemEmptyState headingLevel={2} icon="layers" title={t.invalidTitle} action={<ProductLink href={pricingHref} primary>{t.choose}</ProductLink>}><p>{t.invalidBody}</p></SystemEmptyState>
  </div>;

  const ownership = buyerScenarioOwnership(buyer);
  const quote = quotePricingPlan(plan, ownership);
  const scope = pricingPlanScopes[plan];
  const missing = new Set(quote.missingItemIds);
  const existing = scope.filter(itemId => !missing.has(itemId));
  const coverage = summarizeCoverage(scope, ownership.itemIds, ownership.coverage);
  const owned = quote.kind === 'owned';
  const format = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount / 100);
  const reduction = pricingPlanTerms[plan].priceMinor - quote.amountMinor;
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

  function materialList(itemIds: readonly string[]) {
    return <ul className="cp-material-list">{itemIds.map(itemId => {
      const material = materials.find(item => item.id === itemId)!;
      return <li key={itemId}>
        <div><a href={`/${locale}/library/${material.slug}`}>{materialDisplayName(material, locale)}</a><span>{t[material.type]}</span></div>
        <SystemBadge>{material.available ? t.ready : t.planned}</SystemBadge>
      </li>;
    })}</ul>;
  }

  return <div className="product-page cp-page">
    <a className="cp-back" href={pricingHref}><SystemIcon name="arrow-left" size={16} />{t.back}</a>
    <header className="product-page-heading"><h1>{t.title}</h1><p>{t.lead}</p></header>
    <aside className="cp-preview" aria-labelledby={`${id}-preview`}><h2 id={`${id}-preview`}>{t.preview}</h2><p>{t.previewBody}</p><dl><div><dt>{t.example}</dt><dd>{t.scenarios[buyer]}</dd></div></dl></aside>
    <div className="cp-layout">
      <aside className="cp-order" aria-labelledby={`${id}-total`}>
        <h2 id={`${id}-total`}>{t.names[plan]}</h2><p className="cp-total-label">{t.subtotal}</p><p className="cp-amount">{format(quote.amountMinor)}</p><p className="cp-billing">{owned ? t.ownedTitle : t.once}</p>
        {owned ? <p className="cp-payment-reason">{t.ownedBody}</p> : <p id={`${id}-payment-reason`} className="cp-payment-reason">{t.paymentReason}</p>}
        <dl className="cp-price-lines"><div><dt>{t.fullPrice}</dt><dd>{format(pricingPlanTerms[plan].priceMinor)}</dd></div>{reduction > 0 && <div><dt>{t.adjustment}</dt><dd>{format(reduction)}</dd></div>}<div><dt>{t.newMaterials}</dt><dd>{quote.missingItemIds.length}</dd></div></dl>
        <p className="cp-tax">{t.tax}</p>
        {owned ? <ProductLink href={`/${locale}/account?tab=purchases`}>{t.account}</ProductLink> : <SystemButton variant="primary" disabled aria-describedby={`${id}-payment-reason`}>{t.paymentUnavailable}</SystemButton>}
        <a className="cp-free" href={`/${locale}/library/state-relay`}>{t.free}<SystemIcon name="arrow-right" size={16} /></a>
      </aside>
      <div className="cp-details">
        <section className="cp-selection" aria-labelledby={`${id}-selection`}>
          <p className="cp-label">{t.selection}</p><h2 id={`${id}-selection`}>{t.names[plan]}</h2><p>{t.descriptions[plan]}</p>
          <dl className="cp-counts"><div><dt>{t.totalMaterials}</dt><dd>{scope.length}</dd></div><div><dt>{t.newMaterials}</dt><dd>{quote.missingItemIds.length}</dd></div><div><dt>{t.existingMaterials}</dt><dd>{existing.length}</dd></div></dl>
        </section>
        {!owned && <section className="cp-items" aria-labelledby={`${id}-new`}><h2 id={`${id}-new`}>{t.newHeading} <span>({quote.missingItemIds.length})</span></h2><p>{t.newBody}</p>{materialList(quote.missingItemIds)}</section>}
        {existing.length > 0 && <SystemAccordion className="cp-existing" headingLevel={2} items={[{ id: 'existing', title: `${t.existingHeading} (${existing.length})`, content: <><p>{t.existingBody}</p>{materialList(existing)}</> }]} />}
        {existing.length > 0 && <section className="cp-coverage" aria-labelledby={`${id}-coverage`}><h2 id={`${id}-coverage`}>{t.coverage}</h2>{coverage.groups.map(group => <div key={group.date}><p><strong>{group.itemIds.length}</strong> / {t.through} <time dateTime={group.date}>{date(group.date)}</time></p>{group.expired && <p>{t.expired}</p>}</div>)}{coverage.unknownItemIds.length > 0 && <p>{t.unknownDates}</p>}<p>{t.noRenewal}</p></section>}
        <section className="cp-terms" aria-labelledby={`${id}-terms`}><h2 id={`${id}-terms`}>{t.terms}</h2><p>{t.license}</p>{!owned && <p>{t.updates}</p>}<p>{t.future}</p></section>
      </div>
    </div>
  </div>;
}
