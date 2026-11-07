export type TabsOrientation = 'horizontal' | 'vertical';

/** Local identity and keyboard rules are shared by the component and its tests. */
export function tabIdentity(tabs: readonly { id: string }[]) {
  if (tabs.length < 2 || tabs.length > 6) throw new RangeError('ContentTabs requires 2–6 tabs');
  const ids = tabs.map(tab => tab.id);
  if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) throw new TypeError('Tab IDs must be nonempty and unique');
  return ids;
}

export function nextTabId(ids: readonly string[], current: string, key: string, orientation: TabsOrientation): string | undefined {
  if (!ids.length) return undefined;
  const index = Math.max(0, ids.indexOf(current));
  if (key === 'Home') return ids[0];
  if (key === 'End') return ids.at(-1);
  if (key === (orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown')) return ids[(index + 1) % ids.length];
  if (key === (orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp')) return ids[(index - 1 + ids.length) % ids.length];
  return undefined;
}
