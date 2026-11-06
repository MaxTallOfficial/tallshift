import type {MouseEventHandler} from 'react';
import {MaterialPreview} from '../foundations/MaterialPreview';
import {SystemBadge} from '../foundations/SystemBadge';
import {SystemIcon} from '../foundations/SystemIcon';
import {SystemIconButton} from '../foundations/SystemIconButton';
import {catalogCopy} from './catalog-copy';
import type {Locale,Material} from './catalog-data';
import './catalog.css';
import {materialDisplayName} from './material-presentation';

/** One material representation across catalogue, home and saved materials. */
export function ProductMaterialCard({material,locale,saved,onToggleFavorite,onNavigate,headingLevel=2}:{material:Material;locale:Locale;saved:boolean;onToggleFavorite:(id:string)=>void;onNavigate?:MouseEventHandler<HTMLAnchorElement>;headingLevel?:2|3}) {
 const t=catalogCopy[locale],Heading=headingLevel===3?'h3':'h2';
 const title=materialDisplayName(material,locale);
 return <article className="pc-material" data-material-id={material.id} data-ready={material.available||undefined}>
  <a className="pc-material-link" href={`/${locale}/library/${material.slug}`} onClick={onNavigate} aria-label={`${title} — ${material.available?t.open:t.brief}`}>
   <div className="pc-material-preview"><MaterialPreview kind={material.preview} locale={locale}/><span className="pc-preview-label">{material.available?material.name:`${material.id} / ${t.illustration}`}</span></div>
   <div className="pc-material-content">
    <Heading lang={locale}>{title}</Heading>
    {title!==material.name&&<p className="pc-material-local-title" lang="en">{material.name}</p>}
    <p className="pc-material-description">{material.description[locale]}</p>
    <div className="pc-material-meta"><span>{t[material.type]}</span><SystemBadge>{material.access==='free'?t.free:t.pro}</SystemBadge></div>
    <span className="pc-material-action">{material.available?t.open:t.brief}<SystemIcon name="arrow-right" size={20}/></span>
   </div>
  </a>
  <footer className="pc-material-footer"><div><SystemBadge tone={material.available?'success':'neutral'}>{material.available?t.ready:t.planned}</SystemBadge><p>{material.available?'React + TypeScript':t.plannedNote}</p></div><SystemIconButton variant="quiet" density="compact" icon="bookmark" label={`${saved?t.unsave:t.save}: ${title}`} aria-pressed={saved} onClick={()=>onToggleFavorite(material.id)}/></footer>
 </article>;
}
