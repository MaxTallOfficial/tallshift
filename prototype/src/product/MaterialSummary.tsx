import type {Material} from './catalog-data';
import type {ProductLocale} from './routes';
import {productCopy} from './product-copy';
import {materialDisplayName} from './material-presentation';
import {SystemBadge} from '../foundations/SystemBadge';
import {SystemIcon} from '../foundations/SystemIcon';

/**
 * Server-rendered summary of a material page. It is shown in the HTML response and until the client
 * reads the address bar and local settings, so crawlers, "view source" and slow networks get the title,
 * description and status instead of a bare loading line.
 */
export function MaterialSummary({material,locale}: {material: Material; locale: ProductLocale}) {
  const t = productCopy[locale];
  const displayName = materialDisplayName(material, locale);
  return <div className="tp-material" data-summary="server">
    <a className="tp-back" href={`/${locale}/library`}><SystemIcon name="arrow-left" size={16} />{t.back}</a>
    <header className="tp-material-heading">
      <div><h1 lang={locale}>{displayName}</h1><p>{material.description[locale]}</p>
      <div className="tp-material-metadata"><span>{material.id}</span><span lang="en">{material.name}</span><span>{t[material.type]}</span><SystemBadge tone={material.available ? 'success' : 'neutral'}>{material.available ? t.available : t.planned}</SystemBadge></div></div>
      <div className="tp-material-heading-actions"><SystemBadge>{material.access === 'free' ? t.free : t.paid}</SystemBadge></div>
    </header>
    {!material.available && <p className="tp-panel-explanation">{t.plannedBody}</p>}
    <p className="tp-loading" role="status">{t.loading}</p>
  </div>;
}
