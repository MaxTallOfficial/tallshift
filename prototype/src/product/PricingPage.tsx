import {useId,useState} from 'react';
import {SystemOffer} from '../foundations/SystemOffer';
import {SystemSelect} from '../foundations/SystemSelect';
import {SystemDialog} from '../foundations/SystemDialog';
import {SystemAccordion} from '../foundations/SystemAccordion';
import {SystemDisclosureIcon} from '../foundations/SystemDisclosureIcon';
import {pricingPlansCopy,pricingPlanScopes,pricingPlanTerms} from '../foundations/pricing-plans';
import {pricingPresentation} from '../foundations/pricing-presentation';
import {quotePricingPlan,type PricingPlan} from '../foundations/pricing-quote';
import {buyerScenarioOwnership,type BuyerScenario} from '../foundations/buyer-scenario';
import {licenseCopy} from '../foundations/license-copy';
import {summarizeCoverage} from '../foundations/access-model';
import {coverageCopy} from '../foundations/access-extended-copy';
import {materials,type Locale} from './catalog-data';
import {ProductLink} from './ProductLink';
import {pageCopy} from './page-copy';
import {checkoutCopy} from './checkout-copy';
import {materialDisplayName} from './material-presentation';
import './pages.css';

/** Review-only commerce surface: canonical example calculations, no orders or grants. */
export function PricingPage({locale,search='',onSearchChange}:{locale:Locale;search?:string;onSearchChange?:(search:string)=>void}) {
 const t=pageCopy[locale],p=pricingPlansCopy[locale],presentation=pricingPresentation[locale],id=useId();
 const [localBuyer,setLocalBuyer]=useState<BuyerScenario>('new');
 const query=new URLSearchParams(search);
 const buyer=onSearchChange?(['new','product','expired','partial'] as const).find(value=>value===query.get('example'))??'new':localBuyer;
 function setBuyer(value:BuyerScenario) {setLocalBuyer(value);if(onSearchChange){const next=new URLSearchParams(search);if(value==='new')next.delete('example');else next.set('example',value);onSearchChange(next.size?`?${next}`:'');}}
 const [selected,setSelected]=useState<PricingPlan|null>(null);
 const ownership=buyerScenarioOwnership(buyer);
 const format=(amount:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(amount/100);
 const names={starter:'Starter',product:'Product',bundle:'All packs'};
 const heads={starter:t.starter,product:t.product,bundle:t.bundle};
 const descriptions=t.planDescriptions;
 const benefits=t.planBenefits;
 const quote=selected?quotePricingPlan(selected,ownership):null;
 const coverage=selected?summarizeCoverage(pricingPlanScopes[selected],ownership.itemIds,ownership.coverage):null;
 const c=coverageCopy[locale];
 function contents(plan:PricingPlan,ids:readonly string[]=pricingPlanScopes[plan]) {
  return <ul className="pp-contents">{ids.map(itemId=>{const item=materials.find(material=>material.id===itemId)!;return <li key={item.id}><a href={`/${locale}/library/${item.slug}`}>{materialDisplayName(item,locale)}</a></li>;})}</ul>;
 }
 return <div className="product-page pp-page">
  <header className="product-page-heading"><h1>{t.priceTitle}</h1><p>{t.priceLead}</p></header>
  <aside className="product-preview-note"><p>{t.review}</p><details className="pp-review-controls"><summary><SystemDisclosureIcon/>{t.accessExamples}</summary><SystemSelect label={t.ownership} value={buyer} onChange={value=>setBuyer(value as BuyerScenario)} options={[{value:'new',label:t.new},{value:'product',label:t.owned},{value:'expired',label:t.expired},{value:'partial',label:t.partial}]}/></details></aside>
  <section aria-labelledby="pricing-packs"><h2 className="product-section-title" id="pricing-packs">{t.packs}</h2><div className="as-offers pp-offers">{(['starter','product','bundle'] as const).map(plan=>{
   const price=quotePricingPlan(plan,ownership),owned=price.kind==='owned',discounted=price.kind==='upgrade'||price.kind==='partial';
   return <SystemOffer key={plan} offer={{id:pricingPlanTerms[plan].offerId,name:names[plan],availability:plan==='starter'?'available':'planned',badge:owned?t.yours:plan==='starter'?p.free:presentation.pro,priceAmount:owned?t.yours:format(price.amountMinor),priceState:owned?'owned':discounted?'upgrade':'purchase',billingLabel:owned?t.noRepeat:discounted?`${price.missingItemIds.length} ${t.newItems}`:plan==='starter'?p.free:p.once,headline:heads[plan],description:descriptions[plan],benefits:benefits[plan],benefitIcons:['layers','code','book'],deliveryNote:buyer==='expired'&&plan==='product'?t.oldUpdates:owned||discounted?t.coverage:t.planDelivery[plan]}}
    featuredLabel={plan==='product'?p.recommendation:undefined} selectionAction={{label:owned?t.viewAccess:discounted?t.viewUpgrade:t.choose,onSelect:()=>setSelected(plan)}}
    details={<SystemAccordion className="pp-card-details" headingLevel={4} items={[{id:`${plan}-contents`,title:`${t.contents} / ${pricingPlanScopes[plan].length}`,content:contents(plan)}]}/>}/>;
  })}</div></section>
  <section className="pp-terms" aria-label={presentation.productTerms}><div><h2>{t.terms}</h2><p>{t.termsBody}</p></div><div><h2>{t.updateTitle}</h2><p>{t.updateBody}</p></div><SystemAccordion headingLevel={3} items={[{id:'upgrade',title:t.upgradeTitle,content:<><p>{t.upgradeBody}</p><p>{t.coverage}</p></>}]}/><p className="pp-tax">{t.otherPacks}</p></section>
  <SystemDialog open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}} title={selected?`${t.summary}: ${names[selected]}`:t.summary} closeLabel={t.close} footer={selected==='starter'?<ProductLink href={`/${locale}/library/state-relay`} primary>{t.try}</ProductLink>:selected?<ProductLink href={`/${locale}/checkout?plan=${selected}&example=${buyer}`} primary={quote?.kind!=='owned'}>{quote?.kind==='owned'?t.viewAccess:checkoutCopy[locale].review}</ProductLink>:undefined}>
   {selected&&quote&&<div className="pp-summary">
    <dl><div><dt>{quote.kind==='owned'?t.yours:quote.kind==='upgrade'||quote.kind==='partial'?t.upgrade:t.subtotal}</dt><dd className="pp-total">{format(quote.amountMinor)}</dd></div><div><dt>{presentation.license}</dt><dd>{selected==='starter'?licenseCopy[locale].summary:t.termsBody}</dd></div><div><dt>{presentation.updates}</dt><dd>{selected==='starter'?p.rows[4][1]:t.updateBody}</dd></div></dl>
    {selected!=='starter'&&<p>{t.coverage}</p>}
    {coverage&&coverage.groups.length>0&&<section className="pp-existing"><h3>{c.existing}</h3>{coverage.groups.map(group=><p key={group.date}>{group.itemIds.length} / {c.until} {new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(group.date))}{group.expired?` / ${c.expired}`:''}</p>)}</section>}
    {(quote.kind==='upgrade'||quote.kind==='partial')&&<SystemAccordion headingLevel={3} items={[{id:'new-items',title:`${quote.missingItemIds.length} ${t.newItems}`,content:contents(selected,quote.missingItemIds)}]}/>}
    <SystemAccordion headingLevel={3} items={[{id:'selection-contents',title:`${t.contents} / ${pricingPlanScopes[selected].length}`,content:contents(selected)}]}/>
    <p>{presentation.tax}</p><p id={`${id}-payment-note`} className="product-preview-note">{t.paymentNote}</p>
   </div>}
  </SystemDialog>
 </div>;
}
