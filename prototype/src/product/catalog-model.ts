import { materials, catalogPacks, type Locale, type Material, type MaterialType } from './catalog-data.ts';
import {materialDisplayName} from './material-presentation.ts';

export interface CatalogFilters {
  q: string;
  type: 'all' | MaterialType;
  pack: string;
  access: 'all' | 'free' | 'pro';
  availability: 'all' | 'ready' | 'planned';
  saved: boolean;
  sort: 'featured' | 'name';
}
export const catalogDefaults: CatalogFilters = { q: '', type: 'all', pack: 'all', access: 'all', availability: 'all', saved: false, sort: 'featured' };

export function readCatalogFilters(search: string): CatalogFilters {
  const query = new URLSearchParams(search);
  const type = query.get('type');
  const pack = query.get('pack');
  const access = query.get('access');
  const availability = query.get('availability');
  return {
    q: (query.get('q') ?? '').slice(0, 200),
    type: type === 'section' || type === 'component' || type === 'effect' || type === 'animation' ? type : 'all',
    pack: catalogPacks.some(entry => entry.id === pack) ? pack! : 'all',
    access: access === 'free' || access === 'pro' ? access : 'all',
    availability: availability === 'ready' || availability === 'planned' ? availability : 'all',
    saved: query.get('saved') === '1', sort: query.get('sort') === 'name' ? 'name' : 'featured',
  };
}

export function writeCatalogFilters(filters: CatalogFilters): string {
  const query = new URLSearchParams();
  for (const key of ['q', 'type', 'pack', 'access', 'availability', 'sort'] as const) {
    if (filters[key] !== catalogDefaults[key]) query.set(key, filters[key]);
  }
  if (filters.saved) query.set('saved', '1');
  return query.size ? `?${query}` : '';
}

export function catalogSearchText(value: string) {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLocaleLowerCase();
}

export function filterCatalog(filters: CatalogFilters, favorites: readonly string[], locale: Locale, source: readonly Material[] = materials): Material[] {
  const words = catalogSearchText(filters.q.trim()).split(/\s+/).filter(Boolean);
  const matches = source.filter(material => {
    if (filters.type === 'animation' ? material.type !== 'animation' && material.type !== 'effect' : filters.type !== 'all' && material.type !== filters.type) return false;
    if (filters.pack !== 'all' && !material.packs.includes(filters.pack)) return false;
    if (filters.access !== 'all' && material.access !== filters.access) return false;
    if (filters.availability === 'ready' && !material.available || filters.availability === 'planned' && material.available) return false;
    if (filters.saved && !favorites.includes(material.id)) return false;
    const displayNames=(['en','ru','vi'] as const).map(language=>materialDisplayName(material,language));
    const text = catalogSearchText([material.id, material.slug, material.name, ...displayNames, ...Object.values(material.title), ...Object.values(material.description), ...(material.searchAliases ?? [])].join(' '));
    return words.every(word => text.includes(word));
  });
  if (filters.sort === 'name') return matches.sort((left, right) => left.title[locale].localeCompare(right.title[locale], locale));
  return matches.sort((left, right) => Number(right.available) - Number(left.available));
}
