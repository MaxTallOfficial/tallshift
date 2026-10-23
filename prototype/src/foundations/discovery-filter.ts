import { discoverySearchText, type DiscoveryCategory, type DiscoveryMaterial } from './discovery-data.ts';

export type DiscoveryFilters = {
  query: string;
  category: 'all' | DiscoveryCategory;
  access: readonly ('free' | 'pro')[];
  availability: readonly ('ready' | 'planned')[];
};

/** OR within a filter group, AND between groups and individual search terms. */
export function filterDiscoveryMaterials(materials: readonly DiscoveryMaterial[], filters: DiscoveryFilters): DiscoveryMaterial[] {
  const terms = discoverySearchText(filters.query).trim().split(/\s+/).filter(Boolean);
  return materials.filter(material => {
    if (filters.category !== 'all' && material.category !== filters.category) return false;
    if (filters.access.length > 0 && !filters.access.includes(material.access)) return false;
    const availability = material.available ? 'ready' : 'planned';
    if (filters.availability.length > 0 && !filters.availability.includes(availability)) return false;
    const haystack = discoverySearchText([
      material.name, material.id, material.category,
      ...Object.values(material.pitch), ...Object.values(material.description), ...material.aliases,
    ].join(' '));
    return terms.every(term => haystack.includes(term));
  });
}
