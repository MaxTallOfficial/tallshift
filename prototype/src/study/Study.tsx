import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { StudyPreview, studyArchive, studyFiles, studyPrompt } from './recipe';
import { PromptDocument } from './PromptDocument';
import { FileSelect } from './FileSelect';
import { words, languages, type Locale } from './copy';
import type { RecipeConfiguration } from '../recipes/state-relay';

const accents = [
  { id: 'acacia', name: 'Acacia', color: '#CFD98B' },
  { id: 'berry', name: 'Berry', color: '#DCA5BC' },
  { id: 'waterfall', name: 'Waterfall', color: '#8DCABF' },
];

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}
function CopyIcon({ done = false }: { done?: boolean }) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{done ? <path d="m4 10 4 4 8-9" /> : <><rect x="7" y="6" width="9" height="11" rx="2" /><path d="M12 3H5a2 2 0 0 0-2 2v8" /></>}</svg>;
}
function SourceCode({ source }: { source: string }) {
  return <code>{source.split(/("[^"\n]*"|'[^'\n]*'|\b(?:import|from|export|default|function|return|const|as|true|false)\b|\b\d+\b)/g).map((part, index) => <span key={index} className={/^['"]/.test(part) ? 'syntax-string' : /^\d+$/.test(part) ? 'syntax-number' : /^(import|from|export|default|function|return|const|as|true|false)$/.test(part) ? 'syntax-keyword' : undefined}>{part}</span>)}</code>;
}

export function Study() {
  const query = new URLSearchParams(location.search);
  const [locale, setLocale] = useState<Locale>(() => {
    const requested = query.get('lang');
    return requested === 'ru' || requested === 'vi' ? requested : 'en';
  });
  const [accentId, setAccentId] = useState(accents.some(a => a.id === query.get('accent')) ? query.get('accent')! : 'acacia');
  const [duration, setDuration] = useState(240);
  const [target, setTarget] = useState<'next' | 'vite'>('next');
  const [motion, setMotion] = useState(true);
  const [view, setView] = useState<'demo' | 'source' | 'prompt'>(query.get('view') === 'prompt' ? 'prompt' : query.get('view') === 'source' ? 'source' : 'demo');
  const [filePath, setFilePath] = useState('SelectedExample.tsx');
  const [context, setContext] = useState('');
  const [mode, setMode] = useState<'preserve' | 'adapt'>('preserve');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const compact = useMedia('(max-width: 900px)');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const copyRevision = useRef(0);
  const t = words[locale];
  const accent = accents.find(a => a.id === accentId)!;
  const config: RecipeConfiguration = { locale, target, accent: accent.color, motion: !motion || reduced ? 'off' : 'expressive', duration: !motion || reduced ? 0 : duration };
  const files = useMemo(() => studyFiles(config), [locale, target, accent.color, motion, reduced, duration]);
  const prompt = useMemo(() => studyPrompt({ ...config, context, mode }), [locale, target, accent.color, motion, reduced, duration, context, mode]);
  const selectedFile = files.find(f => f.path === filePath) ?? files.find(f => f.path === 'SelectedExample.tsx')!;
  const copyValue = view === 'source' ? selectedFile.content : prompt;
  const copyLabel = view === 'prompt' ? t.copyPrompt : /\.(tsx?|css|json)$/.test(selectedFile.path) ? t.copyCode : t.copyText;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = ['demo', 'source', 'prompt'] as const;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.pageDescription);
    const url = new URL(location.href);
    url.searchParams.set('lang', locale); url.searchParams.set('accent', accentId); url.searchParams.set('view', view);
    try { history.replaceState({}, '', url); } catch { /* File history can be restricted. */ }
  }, [locale, accentId, view]);
  useEffect(() => { document.documentElement.dataset.motion = config.motion; return () => { delete document.documentElement.dataset.motion; }; }, [config.motion]);
  useEffect(() => { copyRevision.current += 1; setCopyState('idle'); }, [copyValue, view]);

  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % 3;
    else if (event.key === 'ArrowLeft') next = (index + 2) % 3;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 2;
    else return;
    event.preventDefault(); setView(tabs[next]); tabRefs.current[next]?.focus();
  }
  async function copyText() {
    if (copyState === 'copying') return;
    const revision = ++copyRevision.current;
    setCopyState('copying');
    try { await navigator.clipboard.writeText(copyValue); if (revision === copyRevision.current) setCopyState('copied'); }
    catch { if (revision === copyRevision.current) setCopyState('error'); }
  }
  async function download() {
    if (busy) return;
    setBusy(true); setNotice('');
    try {
      const bytes = await studyArchive({ ...config, context, mode });
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
      const link = document.createElement('a'); link.href = url;
      link.download = 'A001-afterlight-' + target + '-' + locale + '.zip'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000); setNotice(t.downloaded);
    } catch { setNotice(t.downloadError); } finally { setBusy(false); }
  }

  return <div className="study" data-motion={config.motion} style={{ '--accent': accent.color } as CSSProperties}>
    <a href="#material" className="skip-link">{t.material}</a>
    <header className="site-header page-width">
      <a className="brand" href="#" aria-label={t.name}>formrift<span aria-hidden="true" /></a>
      <nav aria-label={t.navLabel}><a href="#material">{t.material}</a><a href="#idea">{t.kit}</a></nav>
      <div className="header-controls"><button type="button" aria-label={!motion ? t.motionOff : reduced ? t.reduced : t.motionOn} aria-pressed={motion && !reduced} onClick={() => setMotion(!motion)}><span className="motion-symbol" aria-hidden="true">{config.motion === 'off' ? 'Ⅱ' : '≋'}</span><span className="motion-word">{!motion ? t.motionOff : reduced ? t.reduced : t.motionOn}</span></button><div className="language-picker" role="group" aria-label={t.languageLabel}>{languages.map(language => <button type="button" key={language.id} lang={language.id} aria-label={language.label} title={language.label} aria-pressed={locale === language.id} onClick={() => setLocale(language.id)}>{language.short}</button>)}</div></div>
    </header>
    <main className="page-width" id="top">
      <section className="hero" aria-labelledby="hero-title"><p className="eyebrow">{t.kicker}</p><h1 id="hero-title">{t.title}<br /><span>{t.second}</span></h1><p className="hero-lead">{t.lead}</p></section>
      <section id="material" className="workbench" aria-labelledby="material-title">
        <header className="workbench-heading"><div><div className="material-label"><span>A001</span><span className="availability">{t.free} · MIT</span></div><h2 id="material-title">State Relay</h2><p>{t.materialDescription}</p></div><span className="working-label"><i />{t.example}</span></header>
        <div className="workbench-toolbar"><div className="view-tabs" role="tablist" aria-label={t.panelName}>{tabs.map((tab, index) => <button key={tab} type="button" id={'tab-' + tab} role="tab" aria-controls={'panel-' + tab} aria-selected={view === tab} tabIndex={view === tab ? 0 : -1} onClick={() => setView(tab)} onKeyDown={event => changeTab(event, index)} ref={el => { tabRefs.current[index] = el; }}>{t[tab]}</button>)}</div>{view !== 'demo' && <div className="copy-slot"><span className="copy-feedback" role="status" aria-live="polite">{copyState === 'copied' ? t.copied : ''}</span><button className="primary-action copy-action" type="button" aria-disabled={copyState === 'copying'} aria-busy={copyState === 'copying'} onClick={() => void copyText()}><CopyIcon done={copyState === 'copied'} />{copyState === 'copying' ? t.copying : copyState === 'copied' ? t.copied : copyLabel}</button></div>}</div>
        <div className="workbench-body"><aside className="settings-panel" aria-label={t.settings}><div className="settings-inner"><h3>{t.settings}</h3><button className="settings-toggle" type="button" aria-expanded={settingsOpen} aria-controls="settings-content" onClick={() => setSettingsOpen(!settingsOpen)}><span>{t.settings}</span><span aria-hidden="true">{settingsOpen ? '−' : '+'}</span></button><div className="settings-content" id="settings-content" hidden={compact && !settingsOpen}><fieldset><legend>{t.target}</legend><div className="segmented">{(['next', 'vite'] as const).map(item => <button type="button" aria-pressed={target === item} key={item} onClick={() => setTarget(item)}>{item === 'next' ? 'Next.js' : 'Vite'}</button>)}</div></fieldset><fieldset className="accent-options"><legend>{t.accent}</legend><div>{accents.map(a => <button key={a.id} type="button" aria-label={a.name + ' ' + a.color} aria-pressed={a.id === accentId} onClick={() => setAccentId(a.id)} style={{ '--swatch': a.color } as CSSProperties}><i aria-hidden="true">{a.id === accentId ? '✓' : ''}</i><span>{a.name}</span></button>)}</div></fieldset><label className="tempo-control"><span>{t.tempo}<output>{config.duration} ms</output></span><input type="range" min="60" max="480" step="20" value={duration} disabled={config.motion === 'off'} onChange={event => setDuration(Number(event.target.value))} /></label>{view === 'prompt' && <><fieldset className="mode-options"><legend>{t.mode}</legend><div className="mode-buttons"><button type="button" aria-pressed={mode === 'preserve'} onClick={() => setMode('preserve')}>{t.preserve}</button><button type="button" aria-pressed={mode === 'adapt'} onClick={() => setMode('adapt')}>{t.adapt}</button></div></fieldset><label className="context-field">{t.context}<textarea maxLength={4000} value={context} onChange={event => setContext(event.target.value)} placeholder={t.contextPlaceholder} /><small>{t.contextNote}</small></label></>}<p className="settings-note">{t.settingsNote}</p></div></div></aside><div className="representation" data-view={view}>
          {copyState === 'error' && view !== 'demo' && <div className="manual-copy" role="alert"><p>{t.copyError}</p><label>{t.manual}<textarea readOnly value={copyValue} onFocus={event => event.currentTarget.select()} /></label></div>}
          <div id="panel-demo" className="preview-panel" role="tabpanel" aria-labelledby="tab-demo" hidden={view !== 'demo'}><h3 className="panel-title">{t.demoTitle}</h3><StudyPreview {...config} /></div>
          <div id="panel-source" className="source-panel" role="tabpanel" aria-labelledby="tab-source" hidden={view !== 'source'}><div className="file-toolbar"><FileSelect label={t.sourceFile} value={selectedFile.path} options={files.map(file => ({ value: file.path, label: file.path }))} onChange={setFilePath} accent={accent.color} /></div><pre className="source-code" tabIndex={0}><SourceCode source={selectedFile.content} /></pre><p className="panel-note">{t.sourceNote}</p></div>
          <div id="panel-prompt" className="prompt-panel" role="tabpanel" aria-labelledby="tab-prompt" hidden={view !== 'prompt'}><div className="document-heading"><h3>{t.promptTitle}</h3><p>{t.promptNote}</p></div><PromptDocument prompt={prompt} locale={locale} files={files} /></div>
        </div></div>
        <footer className="workbench-footer"><p><span>React + TypeScript</span><span>{target === 'next' ? 'Next.js' : 'Vite'}</span><span>{config.duration} ms</span></p><button className="secondary-action" type="button" aria-disabled={busy} aria-busy={busy} onClick={() => void download()}>{busy ? t.preparing : t.download}<span aria-hidden="true">↓</span></button></footer>
      </section>
      <section id="idea" className="kit" aria-labelledby="kit-title"><h2 id="kit-title">{t.kitTitle}</h2><p className="kit-lead">{t.kitNote}</p><div className="kit-contents">{[[t.sourceTitle, t.sourceBody], [t.promptKitTitle, t.promptBody], [t.guideTitle, t.guideBody]].map(([title, description]) => <div key={title}><h3>{title}</h3><p>{description}</p></div>)}</div></section>
    </main>
    {notice && <div className="floating-notice"><p role="status" aria-live="polite">{notice}</p><button type="button" aria-label={t.dismiss} onClick={() => setNotice('')}>×</button></div>}
    <footer className="site-footer page-width"><span>{t.footer}</span><span>{t.status}</span></footer>
  </div>;
}

