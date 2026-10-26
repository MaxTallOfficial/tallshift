/** Presentation projection of verified server data; never an authorization decision. */
export type AccessKind = 'checking' | 'error' | 'no-access' | 'pending' | 'provisioning' | 'partial' | 'owner' | 'updates-expired' | 'delivery-error';
export interface AccessSnapshot {
 verification: 'loading' | 'error' | 'verified';
 requestedItemIds: readonly string[];
 ownedItemIds: readonly string[];
 order?: 'none' | 'pending' | 'paid-awaiting-access';
 delivery?: 'available' | 'unavailable';
 updates?: 'current' | 'expired';
}
export function deriveAccessState(snapshot: AccessSnapshot) {
 const requested = [...new Set(snapshot.requestedItemIds)];
 if (!requested.length) throw new RangeError('Access needs a non-empty material scope');
 const owned = new Set(snapshot.ownedItemIds);
 const ownedItemIds = requested.filter(id => owned.has(id));
 const missingItemIds = requested.filter(id => !owned.has(id));
 let kind: AccessKind;
 if (snapshot.verification === 'loading') kind = 'checking';
 else if (snapshot.verification === 'error') kind = 'error';
 else if (snapshot.order === 'paid-awaiting-access') kind = 'provisioning';
 else if (!ownedItemIds.length) kind = snapshot.order === 'pending' ? 'pending' : 'no-access';
 else if (snapshot.delivery === 'unavailable') kind = 'delivery-error';
 else if (missingItemIds.length) kind = 'partial';
 else kind = snapshot.updates === 'expired' ? 'updates-expired' : 'owner';
 const verified = snapshot.verification === 'verified';
 return { kind, ownedItemIds: verified ? ownedItemIds : [], missingItemIds: verified ? missingItemIds : [],
  ownedCount: verified ? ownedItemIds.length : null, totalCount: requested.length,
  canDownload: verified && ownedItemIds.length > 0 && snapshot.delivery === 'available',
  canPurchase: verified && missingItemIds.length > 0 && snapshot.order !== 'pending' && snapshot.order !== 'paid-awaiting-access' };
}
export interface FunctionalCoverage { itemIds: readonly string[]; functionalUpdatesUntil: string }
export function summarizeCoverage(scope: readonly string[], ownedIds: readonly string[], grants: readonly FunctionalCoverage[] = [], now = new Date()) {
 if (!Number.isFinite(now.getTime())) throw new RangeError('Invalid comparison date');
 const allowed = new Set(ownedIds);
 const dates = new Map<string, string>();
 for (const grant of grants) {
  const date = grant.functionalUpdatesUntil;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new RangeError('Coverage must use a valid YYYY-MM-DD date');
  for (const id of grant.itemIds) if (allowed.has(id) && (!dates.has(id) || date > dates.get(id)!)) dates.set(id, date);
 }
 const groups = new Map<string, string[]>();
 const unknown: string[] = [];
 for (const id of new Set(scope)) {
  if (!allowed.has(id)) continue;
  const date = dates.get(id);
  if (!date) { unknown.push(id); continue; }
  groups.set(date, [...(groups.get(date) ?? []), id]);
 }
 return { groups: [...groups].sort(([a],[b]) => a.localeCompare(b)).map(([date,itemIds]) => ({ date,itemIds,expired: date < now.toISOString().slice(0,10) })), unknownItemIds: unknown };
}
