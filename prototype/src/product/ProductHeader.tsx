import {SystemBrandMark} from '../foundations/SystemBrandMark';
import {SystemNavigationShell} from '../foundations/SystemNavigationShell';
import {SystemLocaleControl} from '../foundations/SystemLocaleControl';
import {SystemIcon} from '../foundations/SystemIcon';
import {productCopy} from './product-copy';
import {pageCopy} from './page-copy';
import type {ProductLocale,ProductRoute} from './routes';
import './product-header.css';
import {docsUiCopy} from './docs-content';

export function ProductHeader({route,catalogSearch,savedCount,onLocaleChange}:{route:ProductRoute;catalogSearch:string;savedCount:number;onLocaleChange:(locale:ProductLocale)=>void}) {
 const {locale}=route,t=productCopy[locale];
 const saved=route.page==='account'&&!['purchases','orders','updates'].includes(new URLSearchParams(route.search).get('tab')??'');
 const active=route.notFound?undefined:route.page==='docs'?'docs':route.page==='pricing'?'pricing':saved?'saved':!route.page?'library':undefined;
 const savedHref=`/${locale}/account?tab=saved`;
 return <div className="tp-header-frame"><div className="tp-shell-wrap"><SystemNavigationShell layout="inline" className="tp-shell tp-product-shell" label={t.nav} activeId={active}
  brand={<SystemBrandMark href={`/${locale}`} aria-label={t.homeLabel} aria-current={route.page==='home'?'page':undefined}/>}
  items={[{id:'library',href:`/${locale}/library${catalogSearch}`,label:t.navCatalog},{id:'pricing',href:`/${locale}/pricing`,label:pageCopy[locale].pricing},{id:'docs',href:`/${locale}/docs`,label:docsUiCopy[locale].navLabel},{id:'saved',href:savedHref,label:`${t.navSaved}${savedCount?` (${savedCount})`:''}`,visibility:'mobile'}]}
  localeControl={<SystemLocaleControl locale={locale} onChange={onLocaleChange} variant="compact" label={t.languageLabel} className="tp-language-trigger"/>}
  utilityAction={<a className="tp-saved-link" href={savedHref} aria-label={`${t.navSaved}${savedCount>0?`: ${savedCount}`:''}`} aria-current={saved?'location':undefined}><SystemIcon name="bookmark" size={20}/><span>{t.navSaved}{savedCount>0&&<span className="tp-saved-count">{savedCount}</span>}</span></a>}
  primaryAction={<a className="system-button tp-demo-link" data-variant="primary" href={`/${locale}/library/state-relay`}><span className="system-button-label">{t.try}</span><span className="tp-demo-icon"><SystemIcon name="play" size={20}/></span></a>}
  menuLabels={{label:t.menuLabel,open:t.menuLabel,close:t.closeMenuLabel}} skipLink={{href:'#product-main',label:t.skip}}
 /></div></div>;
}
