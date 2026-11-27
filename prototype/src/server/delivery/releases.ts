import {planCovers,type CurrentAccess} from '../orders/subscription.ts';

/**
 * Server-only registry of reviewed, immutable paid releases.
 *
 * An entry is added only together with an exact ZIP already uploaded to the private
 * bucket: `sha256` and `byteLength` describe those bytes, `objectKey` is derived from
 * them. Nothing here is imported by client components, RSC payloads or public assets.
 */
export type PaidReleaseKind = 'initial' | 'functional' | 'security';
export interface PaidRelease {
  itemId: string;
  version: string;
  sha256: string;
  byteLength: number;
  objectKey: string;
  /** Unix seconds; the newest release of an item is the one a new download gets by default. */
  publishedAt: number;
  kind: PaidReleaseKind;
}

/** Empty on purpose: all 23 paid materials are still planned. No placeholder releases. */
export const paidReleaseRegistry: readonly PaidRelease[] = Object.freeze([]);

export const maxPaidReleaseBytes = 5 * 1024 * 1024;
const itemPattern = /^[SCEA]\d{3}$/;
const versionPattern = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/;
const shaPattern = /^[a-f0-9]{64}$/;

export function paidReleaseObjectKey(itemId: string, version: string, sha256: string) {
  if (!itemPattern.test(itemId) || !versionPattern.test(version) || !shaPattern.test(sha256)) throw new Error('INVALID_RELEASE');
  return `paid/${itemId}/${version}/${sha256}.zip`;
}

/** Throws on any malformed, duplicated or inconsistent entry; callers fail closed. */
export function validatePaidReleases(registry: readonly PaidRelease[]): readonly PaidRelease[] {
  const hashes = new Set<string>(), versions = new Set<string>();
  for (const release of registry) {
    if (!release || typeof release !== 'object' || !itemPattern.test(release.itemId) || !versionPattern.test(release.version)
      || !shaPattern.test(release.sha256) || !Number.isSafeInteger(release.byteLength) || release.byteLength < 22
      || release.byteLength > maxPaidReleaseBytes || !Number.isSafeInteger(release.publishedAt) || release.publishedAt <= 0
      || !['initial', 'functional', 'security'].includes(release.kind)
      || release.objectKey !== paidReleaseObjectKey(release.itemId, release.version, release.sha256)) throw new Error('INVALID_RELEASE');
    const version = `${release.itemId}@${release.version}`;
    if (hashes.has(release.sha256) || versions.has(version)) throw new Error('DUPLICATE_RELEASE');
    hashes.add(release.sha256); versions.add(version);
  }
  return registry;
}

/** Newest published release per item (the one a new quote snapshots). */
export function currentReleaseHashes(registry: readonly PaidRelease[]): Readonly<Record<string, string>> {
  const latest = new Map<string, PaidRelease>();
  for (const release of validatePaidReleases(registry)) {
    const previous = latest.get(release.itemId);
    if (!previous || release.publishedAt > previous.publishedAt || (release.publishedAt === previous.publishedAt && release.sha256 > previous.sha256)) latest.set(release.itemId, release);
  }
  return Object.freeze(Object.fromEntries([...latest].map(([itemId, release]) => [itemId, release.sha256])));
}

export type ReleaseAccess = 'available' | 'revoked' | 'not_covered' | 'inactive';

/**
 * Access to one release. While a level is open, every release of an item it covers. A security
 * fix of an example the owner already downloaded stays available after the subscription ends and
 * outside the current level (Max Tall, 27.11.2026); nothing else is served without the level, and
 * code downloaded earlier stays with the customer. Revocation always wins.
 */
export function releaseAccess(release: PaidRelease, access: Pick<CurrentAccess, 'plan'> | null, revoked: ReadonlySet<string>, downloaded: ReadonlySet<string>): ReleaseAccess {
  const covered = access !== null && planCovers(access.plan, release.itemId);
  if (!covered && !(release.kind === 'security' && downloaded.has(release.itemId))) return access ? 'not_covered' : 'inactive';
  return revoked.has(release.sha256) ? 'revoked' : 'available';
}

/** Calendar months in UTC with end-of-month clamp (e.g. 31 Jan + 1 month -> 28/29 Feb). */
export function addUtcMonths(seconds: number, months: number) {
  if (!Number.isSafeInteger(seconds) || seconds < 0 || !Number.isSafeInteger(months) || months < 1 || months > 120) throw new RangeError('INVALID_DATE');
  const date = new Date(seconds * 1000);
  const year = date.getUTCFullYear(), month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return Math.floor(Date.UTC(year, month, day, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()) / 1000);
}

/** Inclusive YYYY-MM-DD for an exclusive end timestamp, computed once on the server. */
export function inclusiveUtcDate(exclusiveEnd: number) {
  if (!Number.isSafeInteger(exclusiveEnd) || exclusiveEnd <= 0) throw new RangeError('INVALID_DATE');
  return new Date((exclusiveEnd - 1) * 1000).toISOString().slice(0, 10);
}
