export type PaletteId = 'berry' | 'acacia' | 'clay' | 'saffron';

export type NeutralRole =
  | '--f-canvas' | '--f-surface' | '--f-raised' | '--f-inset'
  | '--f-text' | '--f-secondary' | '--f-muted'
  | '--f-line' | '--f-control-border' | '--f-code-bg' | '--f-code-text';

export interface Palette {
  readonly id: PaletteId;
  readonly name: string;
  readonly accent: string;
  readonly accentHover: string;
  readonly accentPressed: string;
  readonly selectedBg: string;
  readonly selectedBorder: string;
  readonly selectedText: string;
  readonly neutrals: Readonly<Record<NeutralRole, string>>;
}

export const DEFAULT_PALETTE_ID: PaletteId = 'berry';

/** Candidate sRGB colors. These values are not official Pantone conversions. */
export const palettes: readonly Palette[] = Object.freeze([
  Object.freeze({
    id: 'berry', name: 'Berry', accent: '#DCA5BC',
    accentHover: '#E0B0C4', accentPressed: '#CA98AD',
    selectedBg: '#221F23', selectedBorder: '#AE8298', selectedText: '#F0DAE4',
    neutrals: Object.freeze({
      '--f-canvas': '#0D0B0E', '--f-surface': '#161317',
      '--f-raised': '#1F1B20', '--f-inset': '#09080B',
      '--f-text': '#ECEAED', '--f-secondary': '#C2BEC3', '--f-muted': '#A6A2A7',
      '--f-line': '#3C393E', '--f-control-border': '#817D82',
      '--f-code-bg': '#0B090D', '--f-code-text': '#D9D5DA',
    }),
  }),
  Object.freeze({
    id: 'acacia', name: 'Acacia', accent: '#CFD98B',
    accentHover: '#D5DE99', accentPressed: '#BEC880',
    selectedBg: '#20221D', selectedBorder: '#899957', selectedText: '#E3E9C8',
    neutrals: Object.freeze({
      '--f-canvas': '#0C0D0A', '--f-surface': '#141511',
      '--f-raised': '#1D1E19', '--f-inset': '#080906',
      '--f-text': '#ECEDE8', '--f-secondary': '#C1C3BE', '--f-muted': '#A4A7A2',
      '--f-line': '#3B3E39', '--f-control-border': '#7F837E',
      '--f-code-bg': '#0A0B08', '--f-code-text': '#D7DAD5',
    }),
  }),
  Object.freeze({
    id: 'clay', name: 'Clay', accent: '#D9A38A',
    accentHover: '#E0B29C', accentPressed: '#C8957E',
    selectedBg: '#24211F', selectedBorder: '#B1846E', selectedText: '#F4DFD3',
    neutrals: Object.freeze({
      '--f-canvas': '#0E0C0B', '--f-surface': '#171413',
      '--f-raised': '#1F1C1A', '--f-inset': '#0A0807',
      '--f-text': '#EEEAE9', '--f-secondary': '#C5C1C0', '--f-muted': '#A9A5A4',
      '--f-line': '#3F3B3A', '--f-control-border': '#868281',
      '--f-code-bg': '#0D0A09', '--f-code-text': '#DCD8D7',
    }),
  }),
  Object.freeze({
    id: 'saffron', name: 'Saffron', accent: '#E4C56A',
    accentHover: '#E9CF83', accentPressed: '#CFB25F',
    selectedBg: '#24221F', selectedBorder: '#B69A51', selectedText: '#F4E7BC',
    neutrals: Object.freeze({
      '--f-canvas': '#0D0C09', '--f-surface': '#161512',
      '--f-raised': '#1E1D19', '--f-inset': '#090806',
      '--f-text': '#EDECE8', '--f-secondary': '#C4C3BF', '--f-muted': '#A8A7A3',
      '--f-line': '#3E3D39', '--f-control-border': '#858480',
      '--f-code-bg': '#0C0B07', '--f-code-text': '#DBDAD6',
    }),
  }),
]);

export type SaffronShadeId = 'original' | 'light' | 'muted' | 'gold' | 'amber';

export interface SaffronShade {
  readonly id: SaffronShadeId;
  readonly name: Readonly<Record<'en' | 'ru' | 'vi', string>>;
  readonly note: Readonly<Record<'en' | 'ru' | 'vi', string>>;
  readonly accent: string;
  readonly accentHover: string;
  readonly accentPressed: string;
  readonly selectedBg: string;
  readonly selectedBorder: string;
  readonly selectedText: string;
}

export const APPROVED_SAFFRON_SHADE_ID: SaffronShadeId = 'light';
export const DEFAULT_SAFFRON_SHADE_ID: SaffronShadeId = APPROVED_SAFFRON_SHADE_ID;
const originalSaffron = palettes.find(({ id }) => id === 'saffron')!;

/** Saffron accent candidates, all compared on the same dark neutral base. */
export const saffronShades: readonly SaffronShade[] = Object.freeze([
  Object.freeze({
    id: 'original',
    name: Object.freeze({ en: 'Original', ru: 'Исходный', vi: 'Ban đầu' }),
    note: Object.freeze({
      en: 'The starting shade, kept for comparison.',
      ru: 'Первый оттенок — для сравнения.',
      vi: 'Sắc ban đầu, giữ lại để so sánh.',
    }),
    accent: originalSaffron.accent, accentHover: originalSaffron.accentHover,
    accentPressed: originalSaffron.accentPressed,
    selectedBg: originalSaffron.selectedBg, selectedBorder: originalSaffron.selectedBorder,
    selectedText: originalSaffron.selectedText,
  }),
  Object.freeze({
    id: 'light',
    name: Object.freeze({ en: 'Lighter', ru: 'Светлее', vi: 'Sáng hơn' }),
    note: Object.freeze({
      en: 'Lighter and softer, with the same warm gold tone.',
      ru: 'Светлее и мягче, с тем же тёплым золотистым тоном.',
      vi: 'Sáng và mềm hơn, vẫn giữ sắc vàng ấm.',
    }),
    accent: '#EBD183', accentHover: '#F0DB9B', accentPressed: '#D8BE74',
    selectedBg: '#24221F', selectedBorder: '#BBA361', selectedText: '#F7EBCB',
  }),
  Object.freeze({
    id: 'muted',
    name: Object.freeze({ en: 'Muted', ru: 'Приглушённый', vi: 'Dịu hơn' }),
    note: Object.freeze({
      en: 'Less saturated for a quieter accent.',
      ru: 'Меньше насыщенности — спокойнее акцент.',
      vi: 'Giảm độ bão hòa để màu nhấn dịu hơn.',
    }),
    accent: '#CDB975', accentHover: '#D8C68C', accentPressed: '#BAA768',
    selectedBg: '#24221F', selectedBorder: '#A6945B', selectedText: '#E9DFBF',
  }),
  Object.freeze({
    id: 'gold',
    name: Object.freeze({ en: 'Deep gold', ru: 'Глубокое золото', vi: 'Vàng đậm' }),
    note: Object.freeze({
      en: 'Deeper and more saturated gold.',
      ru: 'Золотой темнее и насыщеннее.',
      vi: 'Sắc vàng đậm và bão hòa hơn.',
    }),
    accent: '#D5B44F', accentHover: '#E0C267', accentPressed: '#C2A342',
    selectedBg: '#24221F', selectedBorder: '#AD9142', selectedText: '#EFE1B0',
  }),
  Object.freeze({
    id: 'amber',
    name: Object.freeze({ en: 'Warm amber', ru: 'Тёплый янтарь', vi: 'Hổ phách ấm' }),
    note: Object.freeze({
      en: 'Warmer, with a touch of amber.',
      ru: 'Теплее, с янтарным оттенком.',
      vi: 'Ấm hơn, pha sắc hổ phách.',
    }),
    accent: '#DDB16A', accentHover: '#E5BF81', accentPressed: '#C9A05E',
    selectedBg: '#24221F', selectedBorder: '#B38E51', selectedText: '#F2DFC1',
  }),
]);

export function getSaffronShade(shadeId: SaffronShadeId = DEFAULT_SAFFRON_SHADE_ID): SaffronShade {
  const shade = saffronShades.find(({ id }) => id === shadeId);
  if (!shade) throw new TypeError(`Unknown Saffron shade: ${String(shadeId)}`);
  return shade;
}

/** Only accent/selection roles change; every shade uses the current Saffron base. */
export function getSaffronTheme(shadeId: SaffronShadeId = DEFAULT_SAFFRON_SHADE_ID): Record<string, string> {
  const shade = getSaffronShade(shadeId);
  return {
    ...getTheme('saffron'),
    '--f-accent': shade.accent,
    '--f-accent-hover': shade.accentHover,
    '--f-accent-pressed': shade.accentPressed,
    '--f-selected-bg': shade.selectedBg,
    '--f-selected-border': shade.selectedBorder,
    '--f-selected-text': shade.selectedText,
  };
}

/**
 * Stable semantic roles shared by every candidate palette. The full neutral
 * scale belongs to each palette, so switching palettes changes the whole base.
 * --f-line is a decorative separator. Meaningful control boundaries must use
 * --f-control-border; a focus ring needs an offset against a neutral surface.
 */
export const baseTokens: Readonly<Record<string, string>> = Object.freeze({
  '--f-on-accent': '#171C1A',
  '--f-focus': '#B8B8B2',
  '--f-success': '#9DC7A8',
  '--f-success-bg': '#1D3026',
  '--f-success-border': '#5F8D6A',
  '--f-error': '#E9A8A3',
  '--f-error-bg': '#362421',
  '--f-error-border': '#A66F68',
  '--f-warning': '#E4C98C',
  '--f-warning-bg': '#332D1E',
  '--f-warning-border': '#9F8C5F',
  '--f-code-keyword': '#B6C8DE',
  '--f-code-string': '#C2D19A',
  '--f-code-number': '#DBB998',
});

/** Returns a new plain object; invalid runtime IDs are explicitly rejected. */
export function getTheme(paletteId: PaletteId = DEFAULT_PALETTE_ID): Record<string, string> {
  const palette = palettes.find((candidate) => candidate.id === paletteId);
  if (!palette) throw new TypeError(`Unknown Afterlight palette: ${String(paletteId)}`);
  return {
    ...baseTokens,
    ...palette.neutrals,
    '--f-accent': palette.accent,
    '--f-accent-hover': palette.accentHover,
    '--f-accent-pressed': palette.accentPressed,
    '--f-selected-bg': palette.selectedBg,
    '--f-selected-border': palette.selectedBorder,
    '--f-selected-text': palette.selectedText,
  };
}

function relativeLuminance(hex: string): number {
  if (!/^#[\da-f]{6}$/i.test(hex)) {
    throw new TypeError('Contrast colors must be opaque #RRGGBB values');
  }
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

/** WCAG relative luminance ratio, unrounded so threshold checks stay exact. */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export interface ContrastCheck {
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  minimum: number;
  passes: boolean;
}

/**
 * Intended foreground/background pairings only; this is a color audit,
 * not a claim that every component or page passes an accessibility audit.
 */
export function contrastChecks(paletteId: PaletteId = DEFAULT_PALETTE_ID): ContrastCheck[] {
  return checksForTheme(getTheme(paletteId));
}

export function saffronContrastChecks(shadeId: SaffronShadeId = DEFAULT_SAFFRON_SHADE_ID): ContrastCheck[] {
  return checksForTheme(getSaffronTheme(shadeId));
}

function checksForTheme(theme: Record<string, string>): ContrastCheck[] {
  const checks: ContrastCheck[] = [];
  const add = (label: string, foregroundToken: string, backgroundToken: string, minimum: number) => {
    const foreground = theme[foregroundToken];
    const background = theme[backgroundToken];
    const ratio = contrastRatio(foreground, background);
    checks.push({ label, foreground, background, ratio, minimum, passes: ratio >= minimum });
  };
  const surfaces = ['canvas', 'surface', 'raised', 'inset'];
  for (const surface of surfaces) {
    for (const text of ['text', 'secondary', 'muted']) {
      add(`${text} / ${surface}`, `--f-${text}`, `--f-${surface}`, 4.5);
    }
    add(`Accent text / ${surface}`, '--f-accent', `--f-${surface}`, 4.5);
    add(`Control boundary / ${surface}`, '--f-control-border', `--f-${surface}`, 3);
    add(`Focus ring / ${surface}`, '--f-focus', `--f-${surface}`, 3);
  }
  add('Large display text / canvas', '--f-text', '--f-canvas', 3);
  for (const accent of ['accent', 'accent-hover', 'accent-pressed']) {
    add(`Button label / ${accent}`, '--f-on-accent', `--f-${accent}`, 4.5);
  }
  add('Selected label / selected background', '--f-selected-text', '--f-selected-bg', 4.5);
  add('Selected boundary / selected background', '--f-selected-border', '--f-selected-bg', 3);
  add('Selected boundary / surface', '--f-selected-border', '--f-surface', 3);
  add('Selected boundary / raised', '--f-selected-border', '--f-raised', 3);
  add('Focus ring / selected background', '--f-focus', '--f-selected-bg', 3);
  for (const status of ['success', 'error', 'warning']) {
    add(`${status} label / status background`, `--f-${status}`, `--f-${status}-bg`, 4.5);
    add(`${status} boundary / status background`, `--f-${status}-border`, `--f-${status}-bg`, 3);
    add(`${status} boundary / surface`, `--f-${status}-border`, '--f-surface', 3);
    add(`Focus ring / ${status} background`, '--f-focus', `--f-${status}-bg`, 3);
  }
  for (const syntax of ['text', 'keyword', 'string', 'number']) {
    add(`Code ${syntax} / code background`, `--f-code-${syntax}`, '--f-code-bg', 4.5);
  }
  return checks;
}
