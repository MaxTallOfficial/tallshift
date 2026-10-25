import { SystemIcon } from './SystemIcon';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { AfterlightExample } from '../study/AfterlightExample';
import { PromptDocument } from '../study/PromptDocument';
import { studyFiles, studyPrompt } from '../study/recipe';
import { words as productWords, languages } from '../study/copy';
import { words, type Locale } from './copy';
import { palettes, saffronShades, getSaffronShade, getSaffronTheme, saffronContrastChecks, DEFAULT_SAFFRON_SHADE_ID, APPROVED_SAFFRON_SHADE_ID, type SaffronShadeId } from './tokens';
import { TypographySpecimen } from './TypographySpecimen';

const typeface = 'manrope';
const palette = palettes.find(item => item.id === 'saffron')!;
const approvedShade = getSaffronShade(APPROVED_SAFFRON_SHADE_ID);
type View = 'demo' | 'source' | 'prompt';
type CopyResult = { key: string; state: 'idle' | 'busy' | 'done' | 'error'; value: string };
const emptyCopy: CopyResult = { key: '', state: 'idle', value: '' };
const views: View[] = ['demo', 'source', 'prompt'];

function CopyIcon({ done = false }: { done?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">{done ? <path d="m4 10 4 4 8-9" /> : <><rect x="7" y="6" width="9" height="11" rx="2" /><path d="M12 3H5a2 2 0 0 0-2 2v8" /></>}</svg>;
}
function Highlight({ text }: { text: string }) {
  return <code>{text.split(/("[^"\n]*"|'[^'\n]*'|\b(?:import|from|export|default|function|return|const|as|true|false)\b|\b\d+\b)/g).map((part, i) => <span key={i} className={/^['"]/.test(part) ? 'f-string' : /^\d+$/.test(part) ? 'f-number' : /^(import|from|export|default|function|return|const|as|true|false)$/.test(part) ? 'f-keyword' : undefined}>{part}</span>)}</code>;
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function Foundations() {
  const query = new URLSearchParams(location.search);
  const [locale, setLocale] = useState<Locale>(() => query.get('lang') === 'ru' ? 'ru' : query.get('lang') === 'vi' ? 'vi' : 'en');
  const [shadeId, setShade] = useState<SaffronShadeId>(() => saffronShades.find(item => item.id === query.get('shade'))?.id ?? DEFAULT_SAFFRON_SHADE_ID);
  const [view, setView] = useState<View>(query.get('view') === 'prompt' ? 'prompt' : query.get('view') === 'source' ? 'source' : 'demo');
  const [context, setContext] = useState('');
  const [copy, setCopy] = useState<CopyResult>(emptyCopy);
  const [notice, setNotice] = useState('');
  const [forceOff, setForceOff] = useState(false);
  const reduced = useReducedMotion();
  const copyRevision = useRef(0);
  const copying = useRef(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const t = words[locale];
  const p = productWords[locale];
  const shade = getSaffronShade(shadeId);
  const theme = getSaffronTheme(shadeId);
  const off = reduced || forceOff;
  const config = useMemo(() => ({ locale, accent: shade.accent, target: 'next' as const, motion: off ? 'off' as const : 'subtle' as const, duration: off ? 0 : 160 }), [locale, shade.accent, off]);
  const source = useMemo(() => studyFiles(config).find(file => file.path === 'SelectedExample.tsx')!.content, [config]);
  const files = useMemo(() => studyFiles(config), [config]);
  const prompt = useMemo(() => studyPrompt({ ...config, context, mode: 'preserve' }), [config, context]);
  const checks = saffronContrastChecks(shadeId);
  const passed = checks.filter(check => check.passes).length;
  const style = { ...theme, '--f-font': 'Manrope, Arial, sans-serif' } as CSSProperties;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `Tallshift — ${t.title}`;
    const url = new URL(location.href);
    url.searchParams.set('lang', locale); url.searchParams.set('accent', 'saffron'); url.searchParams.set('shade', shadeId);
    url.searchParams.set('font', typeface); url.searchParams.set('view', view);
    try { history.replaceState({}, '', url); } catch { /* File previews can restrict history. */ }
  }, [locale, shadeId, view, t.title]);
  const canvas = theme['--f-canvas'];
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--f-page-canvas');
    const meta = document.querySelector('meta[name="theme-color"]');
    const previousMeta = meta?.getAttribute('content');
    root.style.setProperty('--f-page-canvas', canvas);
    meta?.setAttribute('content', canvas);
    return () => {
      if (previous) root.style.setProperty('--f-page-canvas', previous);
      else root.style.removeProperty('--f-page-canvas');
      if (meta && previousMeta !== undefined && previousMeta !== null) meta.setAttribute('content', previousMeta);
    };
  }, [canvas]);
  useEffect(() => { copyRevision.current += 1; setCopy(emptyCopy); }, [locale, shadeId, view, context, off]);
  useEffect(() => {
    document.documentElement.dataset.motion = off ? 'off' : 'on';
    return () => { delete document.documentElement.dataset.motion; };
  }, [off]);

  async function copyText(value: string, key: string) {
    if (copying.current) return;
    const revision = ++copyRevision.current;
    copying.current = true;
    setCopy({ key, state: 'busy', value });
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (revision === copyRevision.current) setCopy({ key, state: 'done', value });
    } catch {
      if (revision === copyRevision.current) setCopy({ key, state: 'error', value });
    } finally { copying.current = false; }
  }
  function copyLabel(key: string, fallback: string) {
    return copy.key !== key ? fallback : copy.state === 'done' ? t.copied : copy.state === 'busy' ? t.copying : fallback;
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
    if (next < 0) return;
    event.preventDefault(); setView(views[next]); tabRefs.current[next]?.focus();
  }
  function downloadChoice() {
    const snapshot = {
      schemaVersion: 1, reviewVersion: 'foundations-04', status: 'design-system-in-progress', direction: 'afterlight',
      approvedColor: { familyId: palette.id, shadeId: approvedShade.id, accent: approvedShade.accent },
      palette: { id: palette.id, name: palette.name, status: shadeId === approvedShade.id ? 'approved-color' : 'comparison-candidate', approvedShadeId: approvedShade.id, accent: shade.accent, shade: { id: shade.id, name: shade.name, accent: shade.accent, status: shadeId === approvedShade.id ? 'approved' : 'candidate' }, neutrals: palette.neutrals },
      typeface, locale, typography: { status: 'approved-family', display: { size: 48, mobileSize: 32, weight: 550, lineHeight: 1.2 }, body: { size: 15, weight: 400, lineHeight: 1.7 }, ui: { size: 14, weight: 600 }, families: { en: 'Manrope', ru: 'Manrope', vi: 'Manrope' }, fallback: 'Manrope, Arial, sans-serif', code: 'ui-monospace, SFMono-Regular, Consolas, monospace' },
      tokens: theme, contrast: checks, item: 'A001',
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `afterlight-saffron-${shadeId}-${typeface}.tokens.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000); setNotice(t.downloadDone);
  }

  return <div id="top" className="foundations" style={style} data-motion={off ? 'off' : 'on'} data-palette="saffron" data-shade={shadeId} data-typeface={typeface}>
    <a className="f-skip" href="#preview">{t.previewTitle}</a>
    <header className="f-header f-width">
      <a className="f-brand" href="#top">tallshift<span aria-hidden="true" /></a>
      <span className="f-edition">AFTERLIGHT / 04</span>
      <nav aria-label={t.navLabel}><a href="#colors">{t.paletteCompareTitle}</a><a href="#type">{t.typographyTitle}</a></nav>
      <div className="f-languages" role="group" aria-label={t.languageLabel}>{languages.map(language => <button type="button" key={language.id} lang={language.id} aria-label={language.label} title={language.label} aria-pressed={locale === language.id} onClick={() => setLocale(language.id)}>{language.short}</button>)}</div>
    </header>
    <main className="f-width">
      <section className="f-intro"><div><p className="f-eyebrow">FOUNDATIONS / SAFFRON</p><h1>{t.title}</h1><p>{t.intro}</p><div className="f-approved-color" style={{ '--approved-accent': approvedShade.accent } as CSSProperties}><i aria-hidden="true" /><span>{t.approvedColor}: <strong>Saffron Lighter</strong></span><code>{approvedShade.accent}</code></div></div><a className="f-back" href={`../foundations-03.html?lang=${locale}&accent=saffron`}>← {t.back}</a></section>
      <div className="f-toolbar">
        <fieldset className="f-picker"><legend>{t.paletteLabel}</legend><div>{saffronShades.map(item => <label key={item.id} className="f-palette-option" style={{ '--option-accent': item.accent } as CSSProperties}><input type="radio" name="shade" value={item.id} checked={shadeId === item.id} onChange={() => setShade(item.id)} /><i aria-hidden="true" /><span>{item.name[locale]}</span></label>)}</div></fieldset>
        <div className="f-fixed-type"><span>{t.typeLabel}</span><strong>Manrope</strong><span>{t.typeConfirmed}</span></div>
        <label className="f-motion"><input type="checkbox" checked={off} disabled={reduced} onChange={event => setForceOff(event.target.checked)} /><span>{t.reducedLabel}</span></label>
      </div>
      <section className="f-workbench" id="preview" aria-labelledby="f-preview-title">
        <header className="f-workbench-heading"><div><p className="f-eyebrow">{t.liveLabel}</p><h2 id="f-preview-title">State Relay <span>A001</span></h2><p>{p.materialDescription}</p></div><span className="f-license">{p.free} · MIT</span></header>
        <div className="f-viewbar"><div className="f-tabs" role="tablist" aria-label={t.viewLabel}>{views.map((item, i) => <button type="button" key={item} id={`f-tab-${item}`} role="tab" aria-selected={view === item} aria-controls={`f-panel-${item}`} tabIndex={view === item ? 0 : -1} ref={el => { tabRefs.current[i] = el; }} onClick={() => setView(item)} onKeyDown={event => tabKey(event, i)}>{t[item]}</button>)}</div>{view !== 'demo' && <button type="button" className="f-primary" aria-disabled={copy.state === 'busy'} aria-busy={copy.key === 'workspace' && copy.state === 'busy'} onClick={() => void copyText(view === 'source' ? source : prompt, 'workspace')}><CopyIcon done={copy.key === 'workspace' && copy.state === 'done'} />{copyLabel('workspace', view === 'source' ? t.copyCode : t.copyPrompt)}</button>}</div>
        <div className="f-workbench-body">
          <div className="f-representations">
            <div id="f-panel-demo" role="tabpanel" aria-labelledby="f-tab-demo" hidden={view !== 'demo'} className="f-demo"><AfterlightExample {...config} /></div>
            <div id="f-panel-source" role="tabpanel" aria-labelledby="f-tab-source" hidden={view !== 'source'} className="f-code-panel"><h3>SelectedExample.tsx</h3><p>{t.sourceNote}</p><pre className="f-source" tabIndex={0}><Highlight text={source} /></pre></div>
            <div id="f-panel-prompt" role="tabpanel" aria-labelledby="f-tab-prompt" hidden={view !== 'prompt'} className="f-prompt-panel"><h3>{t.promptTitle}</h3><p>{t.promptNote}</p><div className="f-document"><PromptDocument locale={locale} files={files} prompt={prompt} /></div></div>
          </div>
          <aside className="f-inspector" aria-label={t.controlsTitle}>
            <div className="f-current-accent"><i aria-hidden="true" /><div><span>Saffron · {t.activePalette}</span><strong>{shade.name[locale]}</strong><code>{shade.accent}</code></div></div>
            <div className="f-current-type"><span>{t.typeLabel}</span><strong>Manrope</strong><p>{t.previewNote}</p></div>
            <label className="f-project-note">{t.inputLabel}<textarea maxLength={4000} value={context} onChange={event => setContext(event.target.value)} placeholder={t.inputPlaceholder} /></label>
            <div className="f-export"><button type="button" className="f-secondary" onClick={downloadChoice}>{t.downloadChoice}<span aria-hidden="true">↓</span></button><p>{t.choiceNote}</p></div>
          </aside>
        </div>
      </section>
      {copy.state === 'error' && <div className="f-manual-copy" role="alert"><p>{t.copyError}</p><label>{t.manualCopy}<textarea readOnly value={copy.value} onFocus={event => event.currentTarget.select()} /></label></div>}
      <section className="f-section" id="colors" aria-labelledby="f-colors-title"><header className="f-section-heading"><p className="f-eyebrow">01 / SAFFRON</p><h2 id="f-colors-title">{t.paletteCompareTitle}</h2><p>{t.paletteCompareNote}</p></header><div className="f-palette-grid">{saffronShades.map((item, index) => {
        const cardConfig = { ...config, accent: item.accent };
        const code = studyFiles(cardConfig).find(file => file.path === 'SelectedExample.tsx')!.content;
        const key = `card-${item.id}`;
        return <article className="f-color-card" key={item.id} data-shade={item.id} data-active={shadeId === item.id} style={getSaffronTheme(item.id) as CSSProperties}>
          <div className="f-shade-swatch"><span aria-hidden="true">0{index + 1}</span>{item.id === approvedShade.id && <span>{t.approved}</span>}</div>
          <header><h3>{item.name[locale]}</h3><code>{item.accent}</code></header>
          <p className="f-shade-note">{item.note[locale]}</p>
          <div className="f-card-preview"><div><span>A001</span><span>{p.free} · MIT</span></div><h4>State Relay</h4><p>{p.materialDescription}</p><button type="button" className="f-primary" aria-label={`${t.copyCode} · ${item.name[locale]}`} aria-disabled={copy.state === 'busy'} onClick={() => void copyText(code, key)}><CopyIcon done={copy.key === key && copy.state === 'done'} />{copyLabel(key, t.copyCode)}</button><code className="f-card-code"><span className="f-keyword">accent</span> <span className="f-string">'{item.accent}'</span></code></div>
          <button type="button" className="f-choose" aria-pressed={shadeId === item.id} onClick={() => setShade(item.id)}><span>{shadeId === item.id ? t.activePalette : t.usePalette}</span><span aria-hidden="true"><SystemIcon name={shadeId === item.id ? 'check' : 'plus'} size={16} /></span></button>
        </article>;
      })}</div></section>
      <section className="f-section" id="type"><p className="f-eyebrow">02 / TYPE</p><TypographySpecimen locale={locale} /></section>
      <section className="f-section" aria-labelledby="f-role-title"><header className="f-section-heading"><p className="f-eyebrow">03 / ROLES</p><h2 id="f-role-title">{t.surfacesTitle}</h2><p>{t.surfacesNote}</p></header><div className="f-surfaces">{(['canvas', 'surface', 'raised', 'inset'] as const).map(role => <div key={role} style={{ background: theme[`--f-${role}`] }}><span>{t[role]}</span><code>{theme[`--f-${role}`]}</code></div>)}</div>
        <div className="f-status-section"><header><h3>{t.statusTitle}</h3><p>{t.statusNote}</p></header><div className="f-status-examples">{(['success', 'error', 'warning'] as const).map(status => <div className={`f-status f-status-${status}`} key={status}><span aria-hidden="true"><SystemIcon name={status === 'success' ? 'check' : status === 'error' ? 'error' : 'warning'} size={20} /></span>{t[status]}</div>)}<button type="button" className="f-focus-sample" onClick={event => event.currentTarget.focus()}>{t.focus}</button><button type="button" className="f-secondary" disabled>{t.disabled}</button></div></div>
      </section>
      <section className="f-section f-audit" aria-labelledby="f-audit-title"><header className="f-section-heading"><p className="f-eyebrow">04 / CONTRAST</p><h2 id="f-audit-title">{t.contrastTitle}<span>{passed}/{checks.length}</span></h2><p>{t.contrastNote}</p></header><details><summary>Saffron · {shade.name[locale]} · {passed}/{checks.length} <span aria-hidden="true">+</span></summary><div className="f-audit-table"><table><thead><tr><th>{t.pair}</th><th>{t.ratio}</th><th>{t.required}</th></tr></thead><tbody>{checks.map(check => <tr key={check.label}><td><i aria-hidden="true" style={{ background: check.foreground }} />{check.label}</td><td>{check.ratio.toFixed(2)}:1</td><td>{check.minimum}:1 <span aria-label={check.passes ? 'Pass' : 'Fail'}><SystemIcon name={check.passes ? 'check' : 'close'} size={16} /></span></td></tr>)}</tbody></table></div></details></section>
    </main>
    <p className="f-announcement" role="status" aria-live="polite">{copy.state === 'done' ? t.copied : ''}</p>
    {notice && <div className="f-toast"><p role="status">{notice}</p><button type="button" aria-label={t.dismiss} onClick={() => setNotice('')}>×</button></div>}
    <footer className="f-footer f-width"><span>{t.footer}</span><span>EN / RU / VI · sRGB · Saffron Lighter</span></footer>
  </div>;
}
