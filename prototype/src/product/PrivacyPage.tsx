import {privacyCopy} from './privacy-copy';
import type {ProductLocale} from './routes';
import './pages.css';

export function PrivacyPage({locale}:{locale:ProductLocale}) {
  const t=privacyCopy[locale];
  return <article className="product-page pv-page">
    <header className="product-page-heading"><h1>{t.title}</h1><p>{t.lead}</p></header>
    {t.sections.map(section=><section key={section.id} className="pv-section" aria-labelledby={`privacy-${section.id}`}>
      <h2 id={`privacy-${section.id}`}>{section.heading}</h2>
      {section.body?.map(text=><p key={text}>{text}</p>)}
      {section.items&&<dl>{section.items.map(item=><div key={item.term}><dt>{item.term}</dt><dd>{item.text}</dd></div>)}</dl>}
      {section.links&&<ul className="pv-links">{section.links.map(link=><li key={link.href}><a href={link.href} {...(link.href.startsWith('http')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{link.label}</a></li>)}</ul>}
    </section>)}
    <p className="pv-updated">{t.updated}</p>
  </article>;
}
