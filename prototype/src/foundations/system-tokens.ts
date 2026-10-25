import { getSaffronTheme, APPROVED_SAFFRON_SHADE_ID } from './tokens.ts';

export type TokenType = 'color' | 'dimension' | 'number' | 'fontFamily' | 'duration' | 'cubicBezier';
export type TokenDefinition = { $type: TokenType; $value: string | number; $description: string };
export type TokenGraph = Record<string, TokenDefinition>;
export type ResolvedToken = { type: TokenType; value: string | number };

/** Strict, local alias format. This is not a claim of full DTCG conformance. */
export function resolveTokenGraph(graph: TokenGraph): Record<string, ResolvedToken> {
  const result: Record<string, ResolvedToken> = Object.create(null);
  const visit = (path: string, trail: string[]): ResolvedToken => {
    if (Object.hasOwn(result, path)) return result[path];
    if (trail.includes(path)) throw new Error(`Token cycle: ${[...trail, path].join(' → ')}`);
    if (!Object.hasOwn(graph, path)) throw new Error(`Unknown token: ${path}`);
    const token = graph[path];
    if (!token.$description.trim()) throw new Error(`Missing token description: ${path}`);
    const alias = typeof token.$value === 'string' ? token.$value.match(/^\{([^{}]+)\}$/) : null;
    if (alias) {
      const target = visit(alias[1], [...trail, path]);
      if (target.type !== token.$type) throw new Error(`Token type mismatch: ${path} → ${alias[1]}`);
      result[path] = { ...target };
    } else {
      if (typeof token.$value === 'string' && /[{}]/.test(token.$value)) throw new Error(`Invalid token alias: ${path}`);
      result[path] = { type: token.$type, value: token.$value };
    }
    return result[path];
  };
  for (const path of Object.keys(graph)) visit(path, []);
  return result;
}

const current = getSaffronTheme(APPROVED_SAFFRON_SHADE_ID);
const graph: TokenGraph = Object.create(null);
const raw = (path: string, type: TokenType, value: string | number, description: string) => {
  graph[path] = { $type: type, $value: value, $description: description };
};
const alias = (path: string, type: TokenType, target: string, description: string) => raw(path, type, `{${target}}`, description);

for (const [key, value] of Object.entries(current)) {
  raw(`primitive.color.${key.replace('--f-', '')}`, 'color', value, `Approved dark Saffron base: ${key}.`);
}
raw('primitive.color.scrim', 'color', '#000000B3', 'Dark backdrop; use behind modal content, never as text foreground.');
raw('primitive.font.ui', 'fontFamily', 'Manrope, Arial, sans-serif', 'Approved family for English, Russian and Vietnamese.');
raw('primitive.font.code', 'fontFamily', 'ui-monospace, SFMono-Regular, Consolas, monospace', 'Local system monospace; no extra web font.');
for (const value of [0, 2, 4, 8, 12, 16, 24, 32, 44, 48, 52, 64, 80]) raw(`primitive.space.${value}`, 'dimension', `${value}px`, 'Spacing scale in CSS pixels.');
for (const value of [4, 8, 12, 16]) raw(`primitive.radius.${value}`, 'dimension', `${value}px`, 'Corner scale in CSS pixels.');
for (const [name, value] of Object.entries({ response: 120, state: 160, panel: 180, off: 0 })) raw(`primitive.duration.${name}`, 'duration', `${value}ms`, 'Motion duration; state does not wait for an animation.');
raw('primitive.ease.standard', 'cubicBezier', 'cubic-bezier(.2,.8,.2,1)', 'Fast start and quiet finish for local state changes.');
for (const [name, value] of Object.entries({ base: 0, sticky: 10, floating: 20, backdrop: 30, modal: 40, toast: 50 })) raw(`primitive.layer.${name}`, 'number', value, 'Named stacking order; native dialog also uses the browser top layer.');

const colors: Record<string, string> = {
  'surface.canvas': 'canvas', 'surface.panel': 'surface', 'surface.raised': 'raised', 'surface.inset': 'inset',
  'surface.inverse': 'text', 'surface.scrim': 'scrim',
  'content.primary': 'text', 'content.secondary': 'secondary', 'content.muted': 'muted',
  'content.inverse': 'on-accent', 'content.onAccent': 'on-accent',
  'action.primary.default': 'accent', 'action.primary.hover': 'accent-hover', 'action.primary.pressed': 'accent-pressed',
  'action.secondary.background': 'surface', 'action.secondary.foreground': 'text',
  'action.quiet.foreground': 'secondary', 'action.disabled.background': 'raised', 'action.disabled.foreground': 'muted',
  'link.default': 'accent', 'link.visited': 'accent-pressed',
  'selection.background': 'selected-bg', 'selection.border': 'selected-border', 'selection.foreground': 'selected-text',
  'selection.textBackground': 'accent', 'selection.textForeground': 'on-accent',
  'border.subtle': 'line', 'border.control': 'control-border', 'border.strong': 'muted',
  'focus.ring': 'focus', 'focus.gapColor': 'canvas',
  'code.background': 'code-bg', 'code.foreground': 'code-text', 'code.keyword': 'code-keyword', 'code.string': 'code-string', 'code.number': 'code-number',
  'media.placeholder': 'inset', 'media.checkerLight': 'raised', 'media.checkerDark': 'surface',
};
for (const status of ['success', 'warning', 'error']) {
  colors[`status.${status}.foreground`] = status;
  colors[`status.${status}.icon`] = status;
  colors[`status.${status}.background`] = `${status}-bg`;
  colors[`status.${status}.border`] = `${status}-border`;
}
// Informational copy uses the neutral base, keeping blue out of the brand palette.
Object.assign(colors, { 'status.info.foreground': 'text', 'status.info.icon': 'secondary', 'status.info.background': 'raised', 'status.info.border': 'control-border' });
for (const [name, target] of Object.entries(colors)) alias(`semantic.${name}`, 'color', `primitive.color.${target}`, `Interface role: ${name}.`);

const dimensions: Record<string, string> = {
  'control.height': '52', 'control.height.mobile': '48', 'control.iconGap': '8', 'control.inlinePadding': '16', 'control.stackGap': '12',
  'field.helpGap': '8', 'group.gap': '24', 'card.padding': '24', 'panel.padding': '32',
  'section.gap': '80', 'page.gutter': '32', 'focus.width': '2', 'focus.offset': '4',
};
for (const [name, value] of Object.entries(dimensions)) alias(`semantic.${name}`, 'dimension', `primitive.space.${value}`, `Layout role: ${name}.`);
for (const [name, value] of Object.entries({ control: 8, card: 12, panel: 16, overlay: 16, small: 4 })) alias(`semantic.radius.${name}`, 'dimension', `primitive.radius.${value}`, `Corner role: ${name}.`);
for (const name of ['ui', 'code']) alias(`semantic.font.${name}`, 'fontFamily', `primitive.font.${name}`, `Font role: ${name}.`);
for (const [name, target] of Object.entries({ response: 'response', state: 'state', panel: 'panel', off: 'off' })) alias(`semantic.motion.${name}`, 'duration', `primitive.duration.${target}`, `Motion role: ${name}.`);
alias('semantic.motion.ease', 'cubicBezier', 'primitive.ease.standard', 'Shared state change easing.');
for (const name of ['base', 'sticky', 'floating', 'backdrop', 'modal', 'toast']) alias(`semantic.layer.${name}`, 'number', `primitive.layer.${name}`, `Stacking role: ${name}.`);

const componentAliases: Record<string, string> = {
  'button.primary.background': 'action.primary.default', 'button.primary.hover': 'action.primary.hover', 'button.primary.pressed': 'action.primary.pressed',
  'button.primary.foreground': 'content.onAccent', 'button.secondary.background': 'surface.panel', 'button.secondary.foreground': 'content.primary',
  'button.secondary.border': 'border.control', 'button.disabled.background': 'action.disabled.background', 'button.disabled.foreground': 'action.disabled.foreground',
  'input.background': 'surface.inset', 'input.foreground': 'content.primary', 'input.border': 'border.control', 'input.errorBorder': 'status.error.border',
  'select.background': 'surface.inset', 'select.foreground': 'content.primary', 'select.border': 'border.control',
  'select.popup.background': 'surface.raised', 'select.popup.border': 'border.control', 'select.option.selected': 'selection.background',
  'search.popup.background': 'surface.raised', 'search.popup.border': 'border.control',
  'search.option.activeBackground': 'selection.background', 'search.option.activeForeground': 'selection.foreground',
  'filterChip.background': 'surface.inset', 'filterChip.foreground': 'content.secondary', 'filterChip.border': 'border.control',
  'segmented.background': 'surface.inset', 'segmented.border': 'border.control', 'segmented.selectedBackground': 'selection.background', 'segmented.selectedForeground': 'selection.foreground', 'segmented.selectedBorder': 'selection.border',
  'progress.track.background': 'surface.inset', 'progress.fill.background': 'action.primary.default', 'progress.success': 'status.success.foreground', 'progress.error': 'status.error.foreground',
  'preview.background': 'surface.inset', 'preview.border': 'border.subtle',
  'tabs.selected.background': 'selection.background', 'tabs.selected.foreground': 'selection.foreground', 'tabs.selected.border': 'selection.border',
  'card.background': 'surface.panel', 'card.border': 'border.subtle', 'card.title': 'content.primary',
  'dialog.background': 'surface.raised', 'dialog.scrim': 'surface.scrim',
  'popover.background': 'surface.raised', 'popover.border': 'border.control',
  'menu.background': 'surface.raised', 'menu.border': 'border.control', 'menu.item.activeBackground': 'surface.inset',
  'sheet.background': 'surface.panel', 'sheet.border': 'border.control',
  'skeleton.background': 'surface.inset', 'skeleton.shape': 'surface.raised',
  'collection.background': 'surface.panel', 'collection.border': 'border.control',
  'fileTree.background': 'surface.panel', 'fileTree.foreground': 'content.secondary', 'fileTree.selectedBackground': 'surface.inset',
  'offer.background': 'surface.panel', 'offer.border': 'border.subtle', 'offer.price': 'content.primary',
  'entitlement.availableForeground': 'status.success.foreground', 'entitlement.pendingForeground': 'status.warning.foreground', 'entitlement.errorForeground': 'status.error.foreground',
  'pagination.currentBackground': 'surface.raised', 'pagination.currentForeground': 'content.primary',
  'toast.success.background': 'status.success.background', 'toast.success.foreground': 'status.success.foreground',
  'code.background': 'code.background', 'code.foreground': 'code.foreground', 'prompt.background': 'surface.inset', 'prompt.foreground': 'content.secondary',
};
for (const [name, target] of Object.entries(componentAliases)) alias(`component.${name}`, 'color', `semantic.${target}`, `Component role: ${name}.`);
for (const name of ['button', 'input', 'select']) {
  alias(`component.${name}.height`, 'dimension', 'semantic.control.height', 'Stable control hit area across states.');
  alias(`component.${name}.radius`, 'dimension', 'semantic.radius.control', 'Shared control corner.');
}
alias('component.card.padding', 'dimension', 'semantic.card.padding', 'Comfortable card padding.');
alias('component.dialog.radius', 'dimension', 'semantic.radius.overlay', 'Overlay corner.');
alias('component.button.transition', 'duration', 'semantic.motion.response', 'Feedback starts immediately; no artificial pending delay.');

export const systemTokenGraph: Readonly<TokenGraph> = Object.freeze(Object.fromEntries(Object.entries(graph).map(([key, value]) => [key, Object.freeze(value)])));
export const resolvedSystemTokens = Object.freeze(resolveTokenGraph(systemTokenGraph));
const cssName = (path: string) => `--sy-${path.replace(/^semantic\./, '').replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replaceAll('.', '-')}`;
export const systemCssVariables: Readonly<Record<string, string | number>> = Object.freeze(Object.fromEntries(
  Object.entries(resolvedSystemTokens).filter(([path]) => /^(semantic|component)\./.test(path)).map(([path, token]) => [cssName(path), token.value]),
));
export function systemCssText(): string {
  const variables = { ...current, '--f-font': 'Manrope, Arial, sans-serif', ...systemCssVariables };
  return `.system-study {\n${Object.entries(variables).map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}\n`;
}
