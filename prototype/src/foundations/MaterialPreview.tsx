import { SystemIcon } from './SystemIcon';
import type { DiscoveryPreview } from './discovery-data';
import type { DiscoveryLocale } from './discovery-copy';
import './material-preview.css';

function Icon({name}:{name:'arrow'|'check'}) { return <SystemIcon name={name==='arrow'?'arrow-right':name}/>; }

/** Visual thumbnail; planned materials remain explicitly unavailable on the parent card. */
export function MaterialPreview({ kind, locale }: { kind: DiscoveryPreview; locale: DiscoveryLocale }) {
  const text = { en: {copied:'Copied', first:'One line.', second:'Then another.', action:'Get started'}, ru: {copied:'Скопировано', first:'Сначала строка.', second:'Затем — ещё.', action:'Начать'}, vi: {copied:'Đã sao chép', first:'Từng dòng.', second:'Nối tiếp nhau.', action:'Bắt đầu'} }[locale];
  return <div className={`dl-preview dl-preview-${kind}`} aria-hidden="true">
    <div className="dl-preview-grid" />
    {kind === 'relay' && <div className="dl-relay-sample"><div className="dl-relay-action"><Icon name="check" /><span>{text.copied}</span></div><div className="dl-relay-track"><i /><span /><i /><span /><i className="dl-dot-current" /></div></div>}
    {kind === 'lines' && <div className="dl-lines-sample"><span>{text.first}</span><span>{text.second}</span><i /></div>}
    {kind === 'hero' && <div className="dl-hero-sample"><div><i /><b /><b /><span /></div><div className="dl-hero-object"><span /><span /><span /></div></div>}
    {kind === 'button' && <div className="dl-button-sample"><span>{text.action}<Icon name="arrow" /></span><div className="dl-pointer" /></div>}
    {kind === 'bridge' && <div className="dl-bridge-sample"><div><i /><span /><span /><b /></div><Icon name="arrow" /><div><i /><span /><span /><b /></div></div>}
    {kind === 'spotlight' && <div className="dl-spotlight-sample"><i /><div><span /><span /><span /></div></div>}
  </div>;
}

