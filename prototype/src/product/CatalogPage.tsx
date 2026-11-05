import { useId, useRef, type MouseEvent } from 'react';
import { MaterialPreview } from '../foundations/MaterialPreview';
import { SystemBadge } from '../foundations/SystemBadge';
import { SystemButton } from '../foundations/SystemButton';
import { SystemCatalogToolbar } from '../foundations/SystemCatalogToolbar';
import { SystemCheckbox } from '../foundations/SystemCheckbox';
import { SystemEmptyState } from '../foundations/SystemEmptyState';
import { SystemFilterChip } from '../foundations/SystemFilterChip';
import { SystemIcon } from '../foundations/SystemIcon';
import { SystemIconButton } from '../foundations/SystemIconButton';
import { SystemSelect } from '../foundations/SystemSelect';
import { SystemTextInput } from '../foundations/SystemTextField';
import { catalogPacks, materials, type Locale, type Material } from './catalog-data';
import { catalogDefaults, filterCatalog, readCatalogFilters, writeCatalogFilters, type CatalogFilters } from './catalog-model';
import { catalogCopy } from './catalog-copy';
import './catalog.css';

export interface CatalogPageProps {
  locale: Locale;
  search: string;
  onSearchChange: (search: string) => void;
  onNavigate: (href: string) => void;
  favorites: readonly string[];
  onToggleFavorite: (id: string) => void;
}

export function CatalogPage({ locale, search, onSearchChange, onNavigate, favorites, onToggleFavorite }: CatalogPageProps) {
  const id = useId();
  const t = catalogCopy[locale];
  const input = useRef<HTMLInputElement>(null);
  const filters = readCatalogFilters(search);
  const result = filterCatalog(filters, favorites, locale);
  const available = result.filter(material => material.available).length;
  const countLabel = locale === 'ru' ? ({ one: 'материал', few: 'материала', many: 'материалов', other: 'материалов', zero: 'материалов', two: 'материала' }[new Intl.PluralRules('ru').select(result.length)]) : locale === 'en' && result.length === 1 ? 'material' : t.results;
  const savedCount = materials.filter(material => favorites.includes(material.id)).length;
  const update = (change: Partial<CatalogFilters>) => onSearchChange(writeCatalogFilters({ ...filters, ...change }));
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(event.currentTarget.getAttribute('href')!);
  };
  const reset = () => { onSearchChange(''); requestAnimationFrame(() => input.current?.focus()); };
  const chips = [
    ...(filters.type !== 'all' ? [{ key: 'type', label: `${t.type}: ${t[filters.type]}`, clear: () => update({ type: 'all' }) }] : []),
    ...(filters.pack !== 'all' ? [{ key: 'pack', label: `${t.pack}: ${catalogPacks.find(pack => pack.id === filters.pack)?.name[locale]}`, clear: () => update({ pack: 'all' }) }] : []),
    ...(filters.access !== 'all' ? [{ key: 'access', label: `${t.access}: ${t[filters.access]}`, clear: () => update({ access: 'all' }) }] : []),
    ...(filters.availability !== 'all' ? [{ key: 'availability', label: `${t.availability}: ${t[filters.availability]}`, clear: () => update({ availability: 'all' }) }] : []),
    ...(filters.saved ? [{ key: 'saved', label: t.saved, clear: () => update({ saved: false }) }] : []),
  ];

  function renderMaterial(material: Material) {
    const isSaved = favorites.includes(material.id);
    const href = `/${locale}/library/${material.slug}`;
    return <li key={material.id}>
      <article className="pc-material" data-material-id={material.id} data-ready={material.available || undefined}>
        <a className="pc-material-link" href={href} onClick={navigate} aria-label={`${material.name} — ${material.available ? t.open : t.brief}`}>
          <div className="pc-material-preview"><MaterialPreview kind={material.preview} locale={locale} /><span className="pc-preview-label">{material.available ? 'A001 / STATE RELAY' : `${material.id} / ${t.illustration}`}</span></div>
          <div className="pc-material-content">
            <div className="pc-material-meta"><span>{t[material.type]}</span><SystemBadge>{material.access === 'free' ? t.free : t.pro}</SystemBadge></div>
            <h2 lang="en">{material.name}</h2>
            {locale !== 'en' && <p className="pc-material-local-title">{material.title[locale]}</p>}
            <p className="pc-material-description">{material.description[locale]}</p>
            <span className="pc-material-action">{material.available ? t.open : t.brief}<SystemIcon name="arrow-right" size={20} /></span>
          </div>
        </a>
        <footer className="pc-material-footer"><div><SystemBadge tone={material.available ? 'success' : 'neutral'}>{material.available ? t.ready : t.planned}</SystemBadge><p>{material.available ? 'React + TypeScript' : t.plannedNote}</p></div><SystemIconButton variant="quiet" density="compact" icon="bookmark" label={`${isSaved ? t.unsave : t.save}: ${material.name}`} aria-pressed={isSaved} onClick={() => onToggleFavorite(material.id)} /></footer>
      </article>
    </li>;
  }

  return <section className="pc-page" aria-labelledby={`${id}-title`}>
    <header className="pc-intro">
      <div className="pc-intro-copy"><p className="pc-eyebrow">{t.eyebrow}</p><h1 id={`${id}-title`}>{t.title.split('\n').map(line => <span key={line}>{line}</span>)}</h1><p className="pc-intro-text">{t.intro}</p><p className="pc-scope"><span aria-hidden="true" />{t.scope}</p><p className="pc-scope-note">{t.scopeNote}</p></div>
      <a className="pc-featured" href={`/${locale}/library/state-relay`} onClick={navigate}><div className="pc-featured-top"><span>{t.featuredLabel}</span><SystemIcon name="external" size={20} /></div><MaterialPreview kind="relay" locale={locale} /><div className="pc-featured-content"><span className="pc-eyebrow">A001 / STATE RELAY</span><h2>{t.featuredTitle}</h2><p>{t.featuredBody}</p><span className="pc-featured-action">{t.featuredAction}<SystemIcon name="arrow-right" size={20} /></span></div></a>
    </header>

    <div className="pc-catalog" id="catalog-results">
      <SystemCatalogToolbar label={t.filters}
        search={<SystemTextInput ref={input} type="search" label={t.search} placeholder={t.placeholder} maxLength={200} value={filters.q} onChange={event => update({ q: event.target.value })} prefix={<SystemIcon name="search" size={20} />} />}
        sort={<SystemSelect label={t.sort} value={filters.sort} options={[{ value: 'featured', label: t.featured }, { value: 'name', label: t.alphabetical }]} onChange={sort => update({ sort: sort as CatalogFilters['sort'] })} />}>
        <div className="pc-filter-body">
          <div className="pc-filter-row">
            <SystemSelect label={t.type} value={filters.type === 'effect' ? 'animation' : filters.type} options={(['all', 'section', 'component', 'animation'] as const).map(value => ({ value, label: t[value] }))} onChange={type => update({ type: type as CatalogFilters['type'] })} />
            <SystemSelect label={t.pack} value={filters.pack} options={[{ value: 'all', label: t.allPacks }, ...catalogPacks.map(pack => ({ value: pack.id, label: pack.name[locale] }))]} onChange={pack => update({ pack })} />
            <SystemSelect label={t.access} value={filters.access} options={[{ value: 'all', label: t.allAccess }, { value: 'free', label: t.free }, { value: 'pro', label: t.pro }]} onChange={access => update({ access: access as CatalogFilters['access'] })} />
            <SystemSelect label={t.availability} value={filters.availability} options={[{ value: 'all', label: t.allAvailability }, { value: 'ready', label: t.ready }, { value: 'planned', label: t.planned }]} onChange={availability => update({ availability: availability as CatalogFilters['availability'] })} />
          </div>
          <div className="pc-filter-bottom"><SystemCheckbox label={`${t.saved} (${savedCount})`} checked={filters.saved} onChange={saved => update({ saved })} /><SystemButton variant="quiet" size="small" disabled={!filters.q && !chips.length && filters.sort === catalogDefaults.sort} onClick={reset}>{t.reset}</SystemButton></div>
          {chips.length > 0 && <div className="pc-active-filters" role="group" aria-label={t.active}>{chips.map(chip => <SystemFilterChip key={chip.key} label={chip.label} removeLabel={`${t.remove}: ${chip.label}`} onRemove={() => { chip.clear(); requestAnimationFrame(() => input.current?.focus({ preventScroll: true })); }} />)}</div>}
        </div>
      </SystemCatalogToolbar>
      <div className="pc-results-heading"><p role="status" aria-live="polite" aria-atomic="true"><strong>{result.length}</strong> {countLabel}<span className="pc-results-summary">{t.readyResult}: {available} · {t.plannedResult}: {result.length - available}</span></p><span>REACT + TYPESCRIPT</span></div>
      {result.length > 0 ? <ul className="pc-material-grid" aria-label={t.all}>{result.map(renderMaterial)}</ul> : <div className="pc-empty"><SystemEmptyState headingLevel={2} title={filters.saved && savedCount === 0 ? t.emptySaved : t.empty} icon={filters.saved ? 'bookmark' : 'search'} action={<SystemButton onClick={reset}>{filters.saved && savedCount === 0 ? t.showAll : t.reset}</SystemButton>}><p>{filters.saved && savedCount === 0 ? t.emptySavedBody : t.emptyBody}</p></SystemEmptyState></div>}
    </div>
  </section>;
}
