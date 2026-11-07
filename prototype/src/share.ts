export interface SharedAppearance { accent?: string; motion?: 'off' | 'subtle' | 'expressive'; duration?: number }
export type ShareItemId = 'A001' | 'C001' | 'C002' | 'E001' | 'S003' | 'S001' | 'S002' | 'A003' | 'A006';
export function shareEnvelope(config: SharedAppearance, itemId: ShareItemId = 'A001') {
  const configProjection = ['E001','A003','A006'].includes(itemId) ? { motion: config.motion, duration: config.duration } : config;
  return { schemaVersion: '1.0.0', itemId, itemVersion: '0.1.0-prototype', configSchemaVersion: '1.0.0', shareMode: 'appearance', configProjection };
}
export function parseShare(hash: string, itemId: ShareItemId = 'A001'): SharedAppearance | null {
  if (hash.length > 4096) return null;
  try {
    const raw = new URLSearchParams(hash.replace(/^#/, '')).get('share');
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const expected = shareEnvelope({}, itemId);
    if (Object.keys(value).length !== Object.keys(expected).length || Object.keys(value).some(key => !(key in expected))) return null;
    for (const key of ['schemaVersion', 'itemId', 'itemVersion', 'configSchemaVersion', 'shareMode'] as const) if (value[key] !== expected[key]) return null;
    const appearance = value.configProjection;
    if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance) || Object.keys(appearance).some(key => !(['E001','A003','A006'].includes(itemId) ? ['motion', 'duration'] : ['accent', 'motion', 'duration']).includes(key))) return null;
    if ('accent' in appearance && (typeof appearance.accent !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(appearance.accent))) return null;
    if ('motion' in appearance && !['off', 'subtle', 'expressive'].includes(appearance.motion)) return null;
    if ('duration' in appearance && (!Number.isInteger(appearance.duration) || appearance.duration < 0 || appearance.duration > (itemId === 'E001' ? 600 : 480))) return null;
    return appearance;
  } catch { return null; }
}
