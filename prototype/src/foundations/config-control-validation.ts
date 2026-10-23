import { contrastRatio } from './tokens.ts';

export const MOTION_DURATION = Object.freeze({ min: 0, max: 400, step: 20, default: 160 });
export const APPROVED_PREVIEW_ACCENT = '#EBD183';

export type DurationError = 'required' | 'number' | 'range' | 'step';
export type DurationResult = { value: number; error: null } | { value: null; error: DurationError };

/** A draft never changes the applied value until the whole number is valid. */
export function validateDurationDraft(draft: string): DurationResult {
  const trimmed = draft.trim();
  if (!trimmed) return { value: null, error: 'required' };
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) return { value: null, error: 'number' };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { value: null, error: 'number' };
  if (value < MOTION_DURATION.min || value > MOTION_DURATION.max) return { value: null, error: 'range' };
  if (!Number.isInteger(value) || value % MOTION_DURATION.step !== 0) return { value: null, error: 'step' };
  return { value: Object.is(value, -0) ? 0 : value, error: null };
}

/** Opaque HEX only. Short HEX is expanded; alpha and CSS expressions stay out. */
export function normalizeHexColor(draft: string): string | null {
  const value = draft.trim();
  if (/^#[\da-f]{6}$/i.test(value)) return value.toUpperCase();
  if (/^#[\da-f]{3}$/i.test(value)) return `#${[...value.slice(1)].map(channel => channel.repeat(2)).join('').toUpperCase()}`;
  return null;
}

export function previewColorContrast(value: string) {
  const background = normalizeHexColor(value);
  if (!background) throw new TypeError('Preview accent must be an opaque HEX color');
  const dark = { foreground: '#101713', label: 'dark' as const, ratio: contrastRatio('#101713', background) };
  const light = { foreground: '#FFFFFF', label: 'light' as const, ratio: contrastRatio('#FFFFFF', background) };
  const black = { foreground: '#000000', label: 'dark' as const, ratio: contrastRatio('#000000', background) };
  const selected = dark.ratio >= 4.5 ? dark : light.ratio >= 4.5 ? light : black;
  return { ...selected, background, passes: selected.ratio >= 4.5 };
}

/** User Off wins; an OS reduction request can never be overridden by controls. */
export function resolveMotionState(duration: number, forceOff: boolean, reduced: boolean) {
  const result = validateDurationDraft(String(duration));
  if (result.error) throw new RangeError('Motion duration must be 0–400 ms in 20 ms steps');
  const reason = forceOff ? 'off' : reduced ? 'reduced' : duration === 0 ? 'instant' : 'active';
  return { reason, effectiveDuration: forceOff || reduced ? 0 : duration, controlsDisabled: forceOff || reduced } as const;
}
