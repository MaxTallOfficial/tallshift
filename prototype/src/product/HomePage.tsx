import {useMemo,useState} from 'react';
import {AfterlightExample} from '../study/AfterlightExample';
import {studyFiles,studyPrompt} from '../study/recipe';
import {renderRelayIcon} from '../foundations/relay-icon-renderer';
import {SystemIcon} from '../foundations/SystemIcon';
import {SystemTabs} from '../foundations/SystemTabs';
import {SystemCodePanel} from '../foundations/SystemCodePanel';
import {SystemPromptPanel} from '../foundations/SystemPromptPanel';
import {IntegrationGuide} from '../foundations/IntegrationGuide';
import {ProductMaterialCard} from './ProductMaterialCard';
import {ProductLink} from './ProductLink';
import {materials,type Locale} from './catalog-data';
import {pageCopy} from './page-copy';
import './pages.css';

export function HomePage({locale,favorites,onToggleFavorite}:{locale:Locale;favorites:readonly string[];onToggleFavorite:(id:string)=>void}) {
 const t=pageCopy[locale],base=`/${locale}/library`,relay=`${base}/state-relay`;
 const [tab,setTab]=useState<'code'|'prompt'|'guide'>('code');
 const configuration=useMemo(()=>({locale,target:'vite' as const,accent:'#EBD183',motion:'expressive' as const,duration:180}),[locale]);
 const files=useMemo(()=>studyFiles(configuration),[configuration]);
 const source=files.find(file=>file.path==='SelectedExample.tsx');
 const guide=files.find(file=>file.path===`INSTALL.${locale}.md`)?.content??'';
 const prompt=useMemo(()=>studyPrompt(configuration),[configuration]);
 const featured=['S004','C001','A003'].map(id=>materials.find(item=>item.id===id)!);
 const ready=materials.filter(item=>item.available).length;
 return <div className="hp-page product-page">
  <section className="hp-hero" aria-labelledby="home-title">
   <div className="hp-hero-copy"><h1 id="home-title">{t.title}</h1><p className="hp-lead">{t.lead}</p><div className="hp-actions"><ProductLink href={base} primary>{t.browse}</ProductLink><a className="hp-text-link" href={relay}>{t.try}</a></div><p className="hp-free">{t.free}</p></div>
   <figure className="hp-demo"><AfterlightExample locale={locale} motion="expressive" accent="#EBD183" duration={180} renderStateIcon={renderRelayIcon} actionIcon={<SystemIcon name="copy" size={16}/>} resetIcon={<SystemIcon name="replay" size={16}/>}/><figcaption><strong>{t.live}</strong><p>{t.liveNote}</p><a href={relay}>{t.open}<SystemIcon name="arrow-right" size={16}/></a></figcaption></figure>
  </section>
  <section className="hp-kit" aria-labelledby="home-kit"><div className="hp-section-heading"><h2 id="home-kit">{t.kit}</h2><p>{t.kitBody}</p><a className="hp-text-link" href={`${relay}?view=${tab==='guide'?'code':tab}`}>{t.full}<SystemIcon name="arrow-right" size={16}/></a></div>
   <SystemTabs label={t.kitLabel} value={tab} onChange={setTab} options={[
    {value:'code',label:t.code,content:<SystemCodePanel label={t.code} filePath={source?.path??'SelectedExample.tsx'} source={source?.content??''}/>},
    {value:'prompt',label:t.prompt,content:<SystemPromptPanel label={t.prompt} prompt={prompt}/>},
    {value:'guide',label:t.guide,content:<div className="hp-guide" tabIndex={0} role="region" aria-label={t.guide}><IntegrationGuide source={guide}/></div>},
   ]}/>
  </section>
  <section className="hp-collection" aria-labelledby="home-collection"><div className="hp-section-heading"><h2 id="home-collection">{t.collection}</h2><p>{t.collectionBody}</p><p className="hp-count">{t.readyLabel}: {ready} / {t.plannedLabel}: {materials.length-ready}</p></div><ul className="pc-material-grid">{featured.map(material=><li key={material.id}><ProductMaterialCard material={material} locale={locale} saved={favorites.includes(material.id)} onToggleFavorite={onToggleFavorite} headingLevel={3}/></li>)}</ul></section>
  <section className="hp-flow" aria-labelledby="home-flow"><h2 id="home-flow">{t.flow}</h2><ol>{t.steps.map(([title,body],index)=><li key={title}><span className="hp-step-number" aria-hidden="true">0{index+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></section>
  <section className="hp-closing" aria-labelledby="home-start"><div><h2 id="home-start">{t.closing}</h2><p>{t.closingBody}</p></div><ProductLink href={relay} primary>{t.try}</ProductLink></section>
 </div>;
}
