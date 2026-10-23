export type PresetNameError = 'nameRequired' | 'nameShort' | 'nameLong' | 'nameDuplicate';

export interface PresetNameValidation {
  /** NFC-normalized, trimmed value to store after successful validation. */
  name: string;
  error: PresetNameError | null;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function normalizePresetName(value: string): string {
  return value.normalize('NFC').trim();
}

function nameKey(value: string): string {
  return normalizePresetName(value).toLowerCase();
}

/** Names are compared canonically; limits count visible graphemes, not UTF-16. */
export function validatePresetName(value: string, savedNames: readonly string[] = []): PresetNameValidation {
  const name = normalizePresetName(value);
  if (!name) return { name, error: 'nameRequired' };
  const length = Array.from(graphemes.segment(name)).length;
  if (length < 3) return { name, error: 'nameShort' };
  if (length > 40) return { name, error: 'nameLong' };
  const key = nameKey(name);
  if (savedNames.some((savedName) => nameKey(savedName) === key)) return { name, error: 'nameDuplicate' };
  return { name, error: null };
}
