import { SystemIcon } from './SystemIcon';
import { MaterialPreview } from './MaterialPreview';
import { SystemContentTile } from './SystemContentTile';
import { SystemCatalogToolbar } from './SystemCatalogToolbar';
import { SystemBadge } from './SystemBadge';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { discoveryCopy, type DiscoveryLocale } from './discovery-copy';
import { discoveryMaterials, type DiscoveryCategory } from './discovery-data';
import { filterDiscoveryMaterials } from './discovery-filter';
import { SystemSelect } from './SystemSelect';
import { SystemSearchCombobox } from './SystemSearchCombobox';
import { SystemFilterChip } from './SystemFilterChip';
import { SystemCheckbox } from './SystemCheckbox';
import './discovery-lab.css';

type SortOrder = 'featured' | 'name';
const categories = ['all', 'animation', 'component', 'section'] as const;

function Icon({name}:{name:'search'|'close'|'chevron'|'arrow'|'check'|'layers'}) { return <SystemIcon name={name==='chevron'?'chevron-down':name==='arrow'?'arrow-right':name}/>; }

function SortSelect({ locale, value, onChange }: { locale: DiscoveryLocale; value: SortOrder; onChange: (value: SortOrder) => void }) {
  const t = discoveryCopy[locale];
  return <SystemSelect label={t.sort} value={value} options={[{ value: 'featured', label: t.recommended }, { value: 'name', label: t.alphabetical }]} onChange={next => onChange(next as SortOrder)} />;
}


export function DiscoveryLab({ locale, onOpenMaterial }: { locale: DiscoveryLocale; onOpenMaterial: () => void }) {
  const t = discoveryCopy[locale];
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | DiscoveryCategory>('all');
  const [motionType, setMotionType] = useState<'all'|'recipe'|'effect'>('all');
  const [sort, setSort] = useState<SortOrder>('featured');
  const [access, setAccess] = useState<('free' | 'pro')[]>([]);
  const [availability, setAvailability] = useState<('ready' | 'planned')[]>([]);
  const filterTrigger = useRef<HTMLElement>(null);
  const chipButtons = useRef(new Map<string, HTMLButtonElement>());
  const nextFocus = useRef<string | null>(null);
  const criteria = { query, category, access, availability, motionType };
  const materialList = useMemo(() => {
    const matches = filterDiscoveryMaterials(discoveryMaterials, { query, category, access, availability, motionType });
    return sort === 'name' ? matches.sort((a, b) => a.name.localeCompare(b.name, locale)) : matches;
  }, [query, category, access, availability, motionType, sort, locale]);
  const activeFilters = [
    ...(category === 'animation' && motionType !== 'all' ? [{key:'motion-type',group:t.category,label:motionType === 'effect'?t.effect:t.animation,remove:()=>setMotionType('all')}] : []),
    ...(category !== 'all' ? [{ key: `category-${category}`, group: t.category, label: t[category], remove: () => setCategory('all') }] : []),
    ...access.map(value => ({ key: `access-${value}`, group: t.accessLabel, label: value === 'free' ? t.free : t.paid, remove: () => setAccess(values => values.filter(item => item !== value)) })),
    ...availability.map(value => ({ key: `availability-${value}`, group: t.availabilityLabel, label: value === 'ready' ? t.ready : t.planned, remove: () => setAvailability(values => values.filter(item => item !== value)) })),
  ];
  useLayoutEffect(() => {
    if (nextFocus.current === null) return;
    (chipButtons.current.get(nextFocus.current) ?? filterTrigger.current)?.focus();
    nextFocus.current = null;
  }, [category, access, availability, motionType]);

  function removeFilter(index: number) {
    nextFocus.current = activeFilters[index + 1]?.key ?? activeFilters[index - 1]?.key ?? '';
    activeFilters[index].remove();
  }

  function resetFilters() {
    setQuery('');
    setCategory('all');
    setMotionType('all');
    setAccess([]);
    setAvailability([]);
    inputRef.current?.focus();
  }

  return <section id="discovery" className="dl-lab" aria-labelledby={`${id}-title`}>
    <header className="dl-heading"><div><h2 id={`${id}-title`}>{t.title}</h2><p className="dl-intro">{t.intro}</p></div><span className="dl-scope">{t.scope}</span></header>
    <SystemCatalogToolbar label={t.filters} search={<SystemSearchCombobox label={t.search} placeholder={t.placeholder} value={query} onChange={setQuery} inputRef={inputRef} clearLabel={t.clear} listLabel={t.suggestions} emptyText={t.noSuggestions} hint={t.searchHelp} options={filterDiscoveryMaterials(discoveryMaterials, criteria).map(material => ({ value: material.id, label: material.name, detail: t[material.category], meta: material.available ? t.ready : t.planned }))} />} sort={<SortSelect locale={locale} value={sort} onChange={setSort} />}>
    <div className="dl-filter-shell">
      <div className="dl-filterbar"><fieldset className="dl-categories"><legend className="dl-sr-only">{t.category}</legend>{categories.map(item => <label key={item} className={`dl-chip${category === item ? ' dl-chip-selected' : ''}`}><input type="radio" name={`${id}-category`} value={item} checked={category === item} onChange={() => {setCategory(item);setMotionType('all');}} /><span>{t[item]}</span></label>)}</fieldset>{category === 'animation' && <SystemSelect label={locale==='ru'?'Вид анимации':locale==='vi'?'Loại chuyển động':'Motion type'} value={motionType} onChange={value => setMotionType(value as typeof motionType)} options={[{value:'all',label:t.all},{value:'recipe',label:locale==='ru'?'Анимационные сценарии':locale==='vi'?'Kịch bản chuyển động':'Animation recipes'},{value:'effect',label:t.effect}]} />}<p className="dl-result-count" role="status" aria-live="polite" aria-atomic="true">{t.count(materialList.length)}</p></div>
      <details className="dl-extra-filters"><summary ref={filterTrigger}><SystemIcon name="filter"/>{t.filters}<span>{access.length + availability.length || ''}</span><Icon name="chevron" /></summary><div className="dl-filter-options"><fieldset><legend>{t.accessLabel}</legend><div className="dl-filter-choices"><SystemCheckbox label={t.free} checked={access.includes('free')} onChange={checked => setAccess(values => checked ? [...values, 'free'] : values.filter(value => value !== 'free'))} /><SystemCheckbox label={t.paid} checked={access.includes('pro')} onChange={checked => setAccess(values => checked ? [...values, 'pro'] : values.filter(value => value !== 'pro'))} /></div></fieldset><fieldset><legend>{t.availabilityLabel}</legend><div className="dl-filter-choices"><SystemCheckbox label={t.ready} checked={availability.includes('ready')} onChange={checked => setAvailability(values => checked ? [...values, 'ready'] : values.filter(value => value !== 'ready'))} /><SystemCheckbox label={t.planned} checked={availability.includes('planned')} onChange={checked => setAvailability(values => checked ? [...values, 'planned'] : values.filter(value => value !== 'planned'))} /></div></fieldset><p>{t.filterHint}</p></div></details>
      <div className="dl-applied"><div role="group" aria-label={t.activeFilters}>{activeFilters.length ? activeFilters.map((filter, index) => <SystemFilterChip key={filter.key} label={`${filter.group}: ${filter.label}`} removeLabel={t.removeFilter(filter.group, filter.label)} onRemove={() => removeFilter(index)} buttonRef={button => { if (button) chipButtons.current.set(filter.key, button); else chipButtons.current.delete(filter.key); }} />) : <span className="dl-no-filters">{t.noFilters}</span>}</div><button type="button" className="dl-reset-filters" disabled={!query && !activeFilters.length} onClick={resetFilters}>{t.filterReset}</button></div>
    </div>
    </SystemCatalogToolbar>
    <p id={`${id}-hint`} className="dl-search-hint">{t.hint}</p>
    {materialList.length > 0 ? <div className="dl-material-grid">{materialList.map(material => <SystemContentTile density="compact" key={material.id}
      name={material.name} title={material.pitch[locale]} description={material.description[locale]}
      preview={<MaterialPreview kind={material.preview} locale={locale} />}
      metadata={<><span>{t[material.category]}</span><SystemBadge>{material.access === 'free' ? t.free : t.pro}</SystemBadge></>}
      status={<><span className={material.available ? 'dl-status-ready' : 'dl-status-planned'}>{material.available ? t.available : t.planned}</span><span>{material.available ? t.license : t.licensePending}</span></>}
      action={material.available ? { state: 'ready', label: t.open, onOpen: onOpenMaterial } : { state: 'planned', label: t.unavailable, reason: t.plannedNote }}
      footnote={material.available ? 'React + TypeScript' : undefined}
    />)}</div> : <div className="dl-empty"><span className="dl-empty-icon"><Icon name="layers" /></span><h3>{t.emptyTitle}</h3><p>{t.emptyBody}</p><button type="button" className="dl-reset" onClick={resetFilters}>{t.reset}</button></div>}
  </section>;
}
