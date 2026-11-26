import {maxPaidReleaseBytes,type PaidRelease} from './releases.ts';

/** Minimal R2 surface used here; the real binding is a private bucket with no public access. */
export interface R2ObjectBodyLike {size: number; arrayBuffer(): Promise<ArrayBuffer>}
export interface R2BucketLike {get(key: string): Promise<R2ObjectBodyLike | null>}

export class ArtifactError extends Error {
  readonly code: 'ARTIFACT_MISSING' | 'ARTIFACT_INTEGRITY' | 'STORAGE_UNAVAILABLE';
  constructor(code: ArtifactError['code']) {super(code); this.code = code;}
}

/** Read-only private storage. Keys come only from the server registry, never from requests. */
export interface PrivateArtifactStore {
  /** Returns the exact registered bytes or throws; never partial or unverified data. */
  read(release: PaidRelease): Promise<Uint8Array<ArrayBuffer>>;
}

const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');

/**
 * R2 adapter. Bundles are small (<= 5 MiB), so the whole object is read and its SHA-256
 * and size are checked against the registry before any byte is returned to a response.
 */
export function createR2ArtifactStore(bucket: R2BucketLike): PrivateArtifactStore {
  return {
    async read(release) {
      let object: R2ObjectBodyLike | null;
      try {object = await bucket.get(release.objectKey);} catch {throw new ArtifactError('STORAGE_UNAVAILABLE');}
      if (!object) throw new ArtifactError('ARTIFACT_MISSING');
      if (object.size !== release.byteLength || object.size > maxPaidReleaseBytes) throw new ArtifactError('ARTIFACT_INTEGRITY');
      let buffer: ArrayBuffer;
      try {buffer = await object.arrayBuffer();} catch {throw new ArtifactError('STORAGE_UNAVAILABLE');}
      if (buffer.byteLength !== release.byteLength || hex(await crypto.subtle.digest('SHA-256', buffer)) !== release.sha256) throw new ArtifactError('ARTIFACT_INTEGRITY');
      return new Uint8Array(buffer);
    },
  };
}
