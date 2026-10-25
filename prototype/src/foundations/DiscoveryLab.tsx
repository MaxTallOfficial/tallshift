import { SystemContentTile } from './SystemContentTile';
import { SystemCatalogToolbar } from './SystemCatalogToolbar';
import { SystemBadge } from './SystemBadge';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { discoveryCopy, type DiscoveryLocale } from './discovery-copy';
import { discoveryMaterials, type DiscoveryCategory, type DiscoveryPreview } from './discovery-data';
import { filterDiscoveryMaterials } from './discovery-filter';
import { SystemSelect } from './SystemSelect';
import { SystemSearchCombobox } from './SystemSearchCombobox';
import { SystemFilterChip } from './SystemFilterChip';
import { SystemCheckbox } from './SystemCheckbox';
import './discovery-lab.css';

type SortOrder = 'featured' | 'name';
const categories = ['all', 'animation', 'component', 'section', 'effect'] as const;

function Icon({ name }: { name: 'search' | 'close' | 'chevron' | 'arrow' | 'check' | 'layers' }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>}
    {name === 'close' && <path d="m6 6 12 12M6 18 18 6" />}
    {name === 'chevron' && <path d="m7 10 5 5 5-5" />}
    {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
    {name === 'check' && <path d="m5 12 4 4L19 6" />}
    {name === 'layers' && <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>}
  </svg>;
}

function SortSelect({ locale, value, onChange }: { locale: DiscoveryLocale; value: SortOrder; onChange: (value: SortOrder) => void }) {
  const t = discoveryCopy[locale];
  return <SystemSelect label={t.sort} value={value} options={[{ value: 'featured', label: t.recommended }, { value: 'name', label: t.alphabetical }]} onChange={next => onChange(next as SortOrder)} />;
}

function Preview({ kind }: { kind: DiscoveryPreview }) {
  return <div className={`dl-preview dl-preview-${kind}`} aria-hidden="true">
    <div className="dl-preview-grid" />
    {kind === 'relay' && <div className="dl-relay-sample"><div className="dl-relay-action"><Icon name="check" /><span>Copied</span></div><div className="dl-relay-track"><i /><span /><i /><span /><i className="dl-dot-current" /></div></div>}
    {kind === 'lines' && <div className="dl-lines-sample"><span>One line.</span><span>Then another.</span><i /></div>}
    {kind === 'hero' && <div className="dl-hero-sample"><div><i /><b /><b /><span /></div><div className="dl-hero-object"><span /><span /><span /></div></div>}
    {kind === 'button' && <div className="dl-button-sample"><span>Get started<Icon name="arrow" /></span><div className="dl-pointer" /></div>}
    {kind === 'bridge' && <div className="dl-bridge-sample"><div><i /><span /><span /><b /></div><Icon name="arrow" /><div><i /><span /><span /><b /></div></div>}
    {kind === 'spotlight' && <div className="dl-spotlight-sample"><i /><div><span /><span /><span /></div></div>}
  </div>;
}

export function DiscoveryLab({ locale, onOpenMaterial }: { locale: DiscoveryLocale; onOpenMaterial: () => void }) {
  const t = discoveryCopy[locale];
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | DiscoveryCategory>('all');
  const [sort, setSort] = useState<SortOrder>('featured');
  const [access, setAccess] = useState<('free' | 'pro')[]>([]);
  const [availability, setAvailability] = useState<('ready' | 'planned')[]>([]);
  const filterTrigger = useRef<HTMLElement>(null);
  const chipButtons = useRef(new Map<string, HTMLButtonElement>());
  const nextFocus = useRef<string | null>(null);
  const criteria = { query, category, access, availability };
  const materialList = useMemo(() => {
    const matches = filterDiscoveryMaterials(discoveryMaterials, { query, category, access, availability });
    return sort === 'name' ? matches.sort((a, b) => a.name.localeCompare(b.name, locale)) : matches;
  }, [query, category, access, availability, sort, locale]);
  const activeFilters = [
    ...(category !== 'all' ? [{ key: `category-${category}`, group: t.category, label: t[category], remove: () => setCategory('all') }] : []),
    ...access.map(value => ({ key: `access-${value}`, group: t.accessLabel, label: value === 'free' ? t.free : t.paid, remove: () => setAccess(values => values.filter(item => item !== value)) })),
    ...availability.map(value => ({ key: `availability-${value}`, group: t.availabilityLabel, label: value === 'ready' ? t.ready : t.planned, remove: () => setAvailability(values => values.filter(item => item !== value)) })),
  ];
  useLayoutEffect(() => {
    if (nextFocus.current === null) return;
    (chipButtons.current.get(nextFocus.current) ?? filterTrigger.current)?.focus();
    nextFocus.current = null;
  }, [category, access, availability]);

  function removeFilter(index: number) {
    nextFocus.current = activeFilters[index + 1]?.key ?? activeFilters[index - 1]?.key ?? '';
    activeFilters[index].remove();
  }

  function resetFilters() {
    setQuery('');
    setCategory('all');
    setAccess([]);
    setAvailability([]);
    inputRef.current?.focus();
  }

  return <section id="discovery" className="dl-lab" aria-labelledby={`${id}-title`}>
    <header className="dl-heading"><div><p className="dl-eyebrow">Discovery / 01</p><h2 id={`${id}-title`}>{t.title}</h2><p className="dl-intro">{t.intro}</p></div><span className="dl-scope"><i />{t.scope}</span></header>
    <SystemCatalogToolbar label={t.filters} search={<SystemSearchCombobox label={t.search} placeholder={t.placeholder} value={query} onChange={setQuery} inputRef={inputRef} clearLabel={t.clear} listLabel={t.suggestions} emptyText={t.noSuggestions} hint={t.searchHelp} options={filterDiscoveryMaterials(discoveryMaterials, criteria).map(material => ({ value: material.id, label: material.name, detail: t[material.category], meta: material.available ? t.ready : t.planned }))} />} sort={<SortSelect locale={locale} value={sort} onChange={setSort} />}>
    <div className="dl-filter-shell">
      <div className="dl-filterbar"><fieldset className="dl-categories"><legend className="dl-sr-only">{t.category}</legend>{categories.map(item => <label key={item} className={`dl-chip${category === item ? ' dl-chip-selected' : ''}`}><input type="radio" name={`${id}-category`} value={item} checked={category === item} onChange={() => setCategory(item)} /><span>{t[item]}</span></label>)}</fieldset><p className="dl-result-count" role="status" aria-live="polite" aria-atomic="true">{t.count(materialList.length)}</p></div>
      <details className="dl-extra-filters"><summary ref={filterTrigger}><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 5h14M5 10h10M8 15h4" /></svg>{t.filters}<span>{access.length + availability.length || ''}</span><Icon name="chevron" /></summary><div className="dl-filter-options"><fieldset><legend>{t.accessLabel}</legend><SystemCheckbox label={t.free} checked={access.includes('free')} onChange={checked => setAccess(values => checked ? [...values, 'free'] : values.filter(value => value !== 'free'))} /><SystemCheckbox label={t.paid} checked={access.includes('pro')} onChange={checked => setAccess(values => checked ? [...values, 'pro'] : values.filter(value => value !== 'pro'))} /></fieldset><fieldset><legend>{t.availabilityLabel}</legend><SystemCheckbox label={t.ready} checked={availability.includes('ready')} onChange={checked => setAvailability(values => checked ? [...values, 'ready'] : values.filter(value => value !== 'ready'))} /><SystemCheckbox label={t.planned} checked={availability.includes('planned')} onChange={checked => setAvailability(values => checked ? [...values, 'planned'] : values.filter(value => value !== 'planned'))} /></fieldset><p>{t.filterHint}</p></div></details>
      <div className="dl-applied"><div role="group" aria-label={t.activeFilters}>{activeFilters.length ? activeFilters.map((filter, index) => <SystemFilterChip key={filter.key} label={`${filter.group}: ${filter.label}`} removeLabel={t.removeFilter(filter.group, filter.label)} onRemove={() => removeFilter(index)} buttonRef={button => { if (button) chipButtons.current.set(filter.key, button); else chipButtons.current.delete(filter.key); }} />) : <span className="dl-no-filters">{t.noFilters}</span>}</div><button type="button" className="dl-reset-filters" disabled={!query && !activeFilters.length} onClick={resetFilters}>{t.filterReset}</button></div>
    </div>
    </SystemCatalogToolbar>
    <p id={`${id}-hint`} className="dl-search-hint">{t.hint}</p>
    {materialList.length > 0 ? <div className="dl-material-grid">{materialList.map(material => <SystemContentTile density="compact" key={material.id}
      name={material.name} title={material.pitch[locale]} description={material.description[locale]}
      preview={<Preview kind={material.preview} />}
      metadata={<><span>{t[material.category]}</span><SystemBadge>{material.access === 'free' ? t.free : t.pro}</SystemBadge></>}
      status={<><span className={material.available ? 'dl-status-ready' : 'dl-status-planned'}>{material.available ? t.available : t.planned}</span><span>{material.available ? t.license : t.licensePending}</span></>}
      action={material.available ? { state: 'ready', label: t.open, onOpen: onOpenMaterial } : { state: 'planned', label: t.unavailable, reason: t.plannedNote }}
      footnote={material.available ? 'React + TypeScript' : undefined}
    />)}</div> : <div className="dl-empty"><span className="dl-empty-icon"><Icon name="layers" /></span><h3>{t.emptyTitle}</h3><p>{t.emptyBody}</p><button type="button" className="dl-reset" onClick={resetFilters}>{t.reset}</button></div>}
  </section>;
}
