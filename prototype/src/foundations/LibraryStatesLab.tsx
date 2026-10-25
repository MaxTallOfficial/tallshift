import { collectionMembers } from './material-labels';
import { MaterialPreview } from './MaterialPreview';
import { SystemContentTile } from './SystemContentTile';
import { SystemCollectionTile } from './SystemCollectionTile';
import { SystemPagination } from './SystemPagination';
import { paginationRange } from './pagination';
import { SystemSkeleton } from './SystemSkeleton';
import { SystemEmptyState } from './SystemEmptyState';
import { SystemButton } from './SystemButton';
import { useId, useRef, useState } from 'react';
import { discoveryMaterials, type DiscoveryMaterial } from './discovery-data';
import { libraryStateCollections as collections, libraryStatesCopy, libraryText } from './library-states-copy';
import type { LibraryStatesLocale } from './library-states-copy';
import './library-states-lab.css';

type ResultMode = 'results' | 'loading' | 'empty' | 'error';

const modes: readonly ResultMode[] = ['results', 'loading', 'empty', 'error'];
const pageSize = 2;
const resultSets = [
  { id: 'all', materials: discoveryMaterials },
  ...collections.map((collection) => ({ id: collection.id, materials: discoveryMaterials.filter(({ id }) => (collection.ids as readonly string[]).includes(id)) })),
];
const resultPages = resultSets.flatMap((set) => Array.from({ length: Math.max(1, Math.ceil(set.materials.length / pageSize)) }, (_, index) => ({
  collectionId: set.id, page: index + 1, materials: set.materials.slice(index * pageSize, (index + 1) * pageSize),
})));

const collectionPitches: Record<LibraryStatesLocale, Record<(typeof collections)[number]['id'], string>> = {
  en: {
    'FREE-STARTER': 'Start with a working component.',
    'PACK-MOTION': 'Make state changes feel connected.',
    'PACK-PLAYFUL': 'Give the interface a signature.',
  },
  ru: {
    'FREE-STARTER': 'Начните с рабочего компонента.',
    'PACK-MOTION': 'Свяжите состояния плавным движением.',
    'PACK-PLAYFUL': 'Сделайте интерфейс узнаваемым.',
  },
  vi: {
    'FREE-STARTER': 'Bắt đầu với component dùng được.',
    'PACK-MOTION': 'Kết nối các trạng thái bằng chuyển động.',
    'PACK-PLAYFUL': 'Tạo dấu ấn riêng cho giao diện.',
  },
};

/** A bounded system specimen: local paging and explicit appearance examples only. */
export function LibraryStatesLab({ locale, onOpenMaterial }: { locale: LibraryStatesLocale; onOpenMaterial: () => void }) {
  const t = libraryStatesCopy[locale];
  const id = useId();
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [collectionId, setCollectionId] = useState('all');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ResultMode>('results');
  const [announcement, setAnnouncement] = useState<'page' | 'restored' | 'mode' | null>(null);
  const collection = collections.find(({ id: itemId }) => itemId === collectionId);
  const materials = collection ? discoveryMaterials.filter(({ id: materialId }) => (collection.ids as readonly string[]).includes(materialId)) : discoveryMaterials;
  const { pages: pageCount, current: currentPage, first, last } = paginationRange(materials.length, pageSize, page);
  const range = libraryText(t.range, { first, last, total: materials.length });
  const pageLabel = libraryText(t.page, { page: currentPage, pages: pageCount });
  const liveText = !announcement ? '' : mode === 'loading' ? `${t.loadingTitle}. ${t.loadingBody}` : mode === 'empty' ? `${t.emptyTitle}. ${t.emptyBody}` : mode === 'error' ? `${t.errorTitle}. ${t.errorBody}` : `${announcement === 'restored' ? `${t.restored} ` : ''}${collection?.name ?? t.all}. ${range}. ${pageLabel}.`;

  const selectCollection = (nextId: string) => {
    setCollectionId(nextId); setPage(1); setMode('results'); setAnnouncement('page');
  };
  const selectPage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(nextPage, pageCount))); setAnnouncement('page');
  };
  const restoreResults = () => {
    setPage(1); setMode('results'); setAnnouncement('restored');
    requestAnimationFrame(() => resultHeading.current?.focus({ preventScroll: true }));
  };

  const renderMaterials = (items: readonly DiscoveryMaterial[]) => <ul className="ls-materials">
    {items.map((material) => <li key={material.id}><SystemContentTile density="compact" headingLevel={4}
      name={material.name} title={material.pitch[locale]} description={material.description[locale]}
      preview={<MaterialPreview kind={material.preview} locale={locale} />}
      metadata={<><span>{t.categories[material.category]}</span><span>{material.access === 'free' ? t.free : t.pro}</span></>}
      status={<span className={material.available ? 'ls-readiness ls-readiness-ready' : 'ls-readiness'}>{material.available ? t.ready : t.notBuilt}</span>}
      action={material.available ? { state: 'ready', label: t.open, onOpen: onOpenMaterial } : { state: 'planned', label: t.planned, reason: t.notBuilt }}
    /></li>)}
  </ul>;

  return <section id="library-states" className="ls-lab" aria-labelledby={`${id}-title`} lang={locale}>
    <header className="ls-heading">
      <span className="ls-eyebrow">{t.eyebrow}</span>
      <h2 id={`${id}-title`}>{t.title}</h2>
      <p>{t.intro}</p>
    </header>

    <div className="ls-collections-heading">
      <h3 id={`${id}-collections`}>{t.collections}</h3>
      <button type="button" className="ls-button ls-all" aria-pressed={collectionId === 'all'} onClick={() => selectCollection('all')}>{t.all}</button>
    </div>
    <p className="ls-caption" id={`${id}-collection-note`}>{t.collectionScope}</p>
    <div className="ls-collections" role="group" aria-labelledby={`${id}-collections`} aria-describedby={`${id}-collection-note`}>
      {collections.map((entry) => {
        const count = discoveryMaterials.filter(({ id: materialId }) => (entry.ids as readonly string[]).includes(materialId)).length;
        return <SystemCollectionTile key={entry.id} name={entry.name} title={collectionPitches[locale][entry.id]}
          accessLabel={`${entry.access === 'free' ? t.free : t.pro} · ${t.planned}`}
          countLabel={libraryText(t.plannedItems, { count: entry.ids.length })}
          membersLabel={t.members} members={collectionMembers(entry.ids,locale)}
          actionLabel={libraryText(t.sampleMatches, { count })}
          selected={entry.id === collectionId} onSelect={() => selectCollection(entry.id)} />;
      })}
    </div>

    <div className="ls-results-panel">
      <fieldset className="ls-state-picker" aria-describedby={`${id}-state-note`}>
        <legend>{t.state}</legend>
        <div>{modes.map((item) => <label className="ls-state-option" key={item}>
          <input type="radio" name={`${id}-mode`} value={item} checked={mode === item} onChange={() => { setMode(item); setAnnouncement('mode'); }} />
          <span>{t.modes[item]}</span>
        </label>)}</div>
      </fieldset>
      <p className="ls-caption ls-mode-note" id={`${id}-state-note`}>{t.modeNote}</p>
      <div className="ls-result-header"><h3 id={`${id}-results`} ref={resultHeading} tabIndex={-1}>{t.results}</h3><span className={mode === 'results' ? undefined : 'ls-concealed'} aria-hidden={mode !== 'results' || undefined}>{range}</span></div>
      <div className="ls-results-region" role="region" aria-labelledby={`${id}-results`} aria-busy={mode === 'loading'}>
        {/* Each finite page/state contributes its natural height. Only the current one is exposed or interactive. */}
        <div className="ls-results-stack">
          {resultPages.map((entry) => {
            const active = mode === 'results' && entry.collectionId === collectionId && entry.page === currentPage;
            return <div className="ls-result-frame" key={`${entry.collectionId}-${entry.page}`} data-state="results" data-collection={entry.collectionId} data-page={entry.page} data-active={active} aria-hidden={!active || undefined} inert={!active || undefined}>{renderMaterials(entry.materials)}</div>;
          })}
          <div className="ls-result-frame" data-state="loading" data-active={mode === 'loading'} aria-hidden={mode !== 'loading' || undefined} inert={mode !== 'loading' || undefined}>
          <div className="ls-skeletons" aria-hidden="true">{[0, 1].map((key) => <div className="ls-skeleton" key={key}><SystemSkeleton width="35%" height={8} /><SystemSkeleton width="70%" height={24} /><SystemSkeleton /><SystemSkeleton width="55%" /></div>)}</div>
          <div className="ls-state-copy"><h4>{t.loadingTitle}</h4><p>{t.loadingBody}</p></div>
          </div>
          {(['empty', 'error'] as const).map((state) => <div className="ls-result-frame" key={state} data-state={state} data-active={mode === state} aria-hidden={mode !== state || undefined} inert={mode !== state || undefined}>
            <SystemEmptyState headingLevel={4} title={state === 'empty' ? t.emptyTitle : t.errorTitle} icon={state === 'empty' ? 'search' : 'warning'} action={<SystemButton onClick={restoreResults}>{t.restore}</SystemButton>}><p>{state === 'empty' ? t.emptyBody : t.errorBody}</p></SystemEmptyState>
          </div>)}
        </div>
        <div className="ls-pagination-stack">
          {resultSets.map((set) => {
            const active = mode === 'results' && collectionId === set.id;
            const selectedPage = collectionId === set.id ? currentPage : 1;
            return <div key={set.id} className="ls-pagination-frame" data-active={active} aria-hidden={!active || undefined} inert={!active || undefined}>
              <SystemPagination total={set.materials.length} pageSize={pageSize} page={selectedPage} onPageChange={selectPage}
                label={t.pagination} previousLabel={t.previous} nextLabel={t.next}
                pageLabel={(number, pages) => libraryText(t.page, { page: number, pages })} />
            </div>;
          })}
        </div>
      </div>
    </div>
    <p className="ls-caption ls-scope">{t.scope}</p>
    <p className="ls-sr-only" role="status" aria-live="polite" aria-atomic="true">{liveText}</p>
  </section>;
}
