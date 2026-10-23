export interface SharedAppearance { accent?: string; motion?: 'off' | 'subtle' | 'expressive'; duration?: number }
export function shareEnvelope(config: SharedAppearance) {
  return { schemaVersion: '1.0.0', itemId: 'A001', itemVersion: '0.1.0-prototype', configSchemaVersion: '1.0.0', shareMode: 'appearance', configProjection: config };
}
export function parseShare(hash: string): SharedAppearance | null {
  if (hash.length > 4096) return null;
  try {
    const raw = new URLSearchParams(hash.replace(/^#/, '')).get('share');
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const expected = shareEnvelope({});
    if (Object.keys(value).length !== Object.keys(expected).length || Object.keys(value).some(key => !(key in expected))) return null;
    for (const key of ['schemaVersion', 'itemId', 'itemVersion', 'configSchemaVersion', 'shareMode'] as const) if (value[key] !== expected[key]) return null;
    const appearance = value.configProjection;
    if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance) || Object.keys(appearance).some(key => !['accent', 'motion', 'duration'].includes(key))) return null;
    if ('accent' in appearance && (typeof appearance.accent !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(appearance.accent))) return null;
    if ('motion' in appearance && !['off', 'subtle', 'expressive'].includes(appearance.motion)) return null;
    if ('duration' in appearance && (!Number.isInteger(appearance.duration) || appearance.duration < 0 || appearance.duration > 480)) return null;
    return appearance;
  } catch { return null; }
}
