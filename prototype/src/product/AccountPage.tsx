import {useId,useRef} from 'react';
import {SystemTabList} from '../foundations/SystemTabs';
import {SystemEmptyState} from '../foundations/SystemEmptyState';
import {ProductMaterialCard} from './ProductMaterialCard';
import {ProductLink} from './ProductLink';
import {materials,type Locale} from './catalog-data';
import {pageCopy} from './page-copy';
import './pages.css';

export function AccountPage({locale,search,onSearchChange,favorites,onToggleFavorite}:{locale:Locale;search:string;onSearchChange:(search:string)=>void;favorites:readonly string[];onToggleFavorite:(id:string)=>void}) {
 const t=pageCopy[locale],id=useId(),root=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const tabs=['saved','purchases','orders','updates'] as const;
 const query=new URLSearchParams(search),tab=tabs.find(value=>value===query.get('tab'))??'saved';
 const saved=materials.filter(item=>favorites.includes(item.id));
 function remove(itemId:string) {onToggleFavorite(itemId);requestAnimationFrame(()=>{(root.current?.querySelector<HTMLAnchorElement>('.pc-material-link')??heading.current)?.focus({preventScroll:true});});}
 const empty={saved:[t.emptySaved,t.savedBody],purchases:[t.emptyPurchases,t.purchasesBody],orders:[t.emptyOrders,t.ordersBody],updates:[t.emptyUpdates,t.updatesBody]}[tab];
 return <div className="product-page ap-page" ref={root}>
  <header className="product-page-heading"><h1 ref={heading} tabIndex={-1}>{t.accountTitle}</h1><p>{t.accountLead}</p></header>
  <p className="product-preview-note">{t.local}</p>
  <SystemTabList label={t.account} value={tab} onChange={next=>{const params=new URLSearchParams(search);params.set('tab',next);onSearchChange(`?${params}`);}} options={tabs.map(value=>({value,label:value==='saved'?`${t.saved} (${saved.length})`:t[value],tabId:`${id}-${value}`,panelId:`${id}-panel`}))}/>
  <section className="ap-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}>
   {tab==='saved'&&saved.length>0?<ul className="pc-material-grid">{saved.map(material=><li key={material.id}><ProductMaterialCard material={material} locale={locale} saved onToggleFavorite={remove}/></li>)}</ul>:<SystemEmptyState headingLevel={2} icon={tab==='saved'?'bookmark':tab==='orders'?'file':tab==='updates'?'replay':'download'} title={empty[0]} action={<ProductLink href={`/${locale}/${tab==='saved'?'library':tab==='purchases'?'library/state-relay':'pricing'}`}>{tab==='saved'?t.browse:tab==='purchases'?t.try:t.viewPlans}</ProductLink>}><p>{empty[1]}</p></SystemEmptyState>}
  </section>
 </div>;
}
