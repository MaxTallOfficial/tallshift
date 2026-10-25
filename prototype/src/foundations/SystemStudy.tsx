import { SystemNavigationShell } from './SystemNavigationShell';
import { SystemBrandMark } from './SystemBrandMark';
import { SystemLocaleControl } from './SystemLocaleControl';
import { SystemTypography } from './SystemTypography';
import { SystemCodePanel } from './SystemCodePanel';
import { SystemPromptPanel, SystemCopyFallback } from './SystemPromptPanel';
import { SystemDownloadAction } from './SystemDownloadAction';
import { CompletionStatesSpecimen } from './CompletionStatesSpecimen';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AfterlightExample } from '../study/AfterlightExample';
import { PromptDocument } from '../study/PromptDocument';
import { studyArchive, studyFiles, studyPrompt } from '../study/recipe';
import { words as baseWords, type Locale } from './copy';
import { getSaffronTheme, saffronContrastChecks } from './tokens';
import { DiscoveryLab } from './DiscoveryLab';
import { InteractionLab } from './InteractionLab';
import { TypeLayoutSpecimen } from './TypeLayoutSpecimen';
import { SystemButton } from './SystemButton';
import { SystemTabList } from './SystemTabs';
import { ModalSpecimen } from './ModalSpecimen';
import { FloatingSpecimen } from './FloatingSpecimen';
import { FeedbackSpecimen } from './FeedbackSpecimen';
import { SystemToastRegion } from './SystemToastRegion';
import { SystemTextLink } from './SystemTextLink';
import { ActionSpecimen } from './ActionSpecimen';
import { ControlAuditSpecimen } from './ControlAuditSpecimen';
import { SystemRadioGroup } from './SystemRadioGroup';
import { SystemTextarea } from './SystemTextField';
import { SystemSelect } from './SystemSelect';
import { SystemCheckbox } from './SystemCheckbox';
import { LibraryStatesLab } from './LibraryStatesLab';
import { AccessStatesLab } from './AccessStatesLab';
import { SourceNavigator } from './SourceNavigator';
import { SystemIcon } from './SystemIcon';
import { IconSpecimen } from './IconSpecimen';
import { SystemColorControl, SystemHexColorField } from './SystemColorControl';
import { SystemMotionControls } from './SystemMotionControls';
import { ProgressSpecimen } from './ProgressSpecimen';
import { SystemPreviewViewport } from './SystemPreviewViewport';
import { systemReview } from './system-meta';
import { systemScale, typographyScale } from './system-scale';
import { systemCssVariables, systemTokenGraph, resolvedSystemTokens, systemCssText } from './system-tokens';
import { systemCoverage } from './system-registry';
import { systemWords } from './system-copy';
import './system-study.css';

type View = 'demo' | 'source' | 'prompt';
const views: View[] = ['demo', 'source', 'prompt'];
const theme = getSaffronTheme();
const checks = saffronContrastChecks();
const navIds = ['discovery', 'library-states', 'workbench', 'access-states', 'controls', 'actions', 'modals', 'floating', 'feedback', 'system-type', 'roles', 'handoff'] as const;
const emptyCopy = { key: '', state: 'idle' as 'idle' | 'busy' | 'done' | 'error', value: '' };

function CopyIcon({ done = false }: { done?: boolean }) {
  return <SystemIcon name={done ? 'check' : 'copy'} size={20} />;
}
function saveFile(bytes: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function SystemStudy() {
  const query = new URLSearchParams(location.search);
  const [locale, setLocale] = useState<Locale>(() => query.get('lang') === 'ru' ? 'ru' : query.get('lang') === 'vi' ? 'vi' : 'en');
  const [view, setView] = useState<View>(() => query.get('view') === 'source' ? 'source' : query.get('view') === 'prompt' ? 'prompt' : 'demo');
  const [target, setTarget] = useState<'next' | 'vite'>(() => query.get('target') === 'vite' ? 'vite' : 'next');
  const [width, setWidth] = useState<'full' | 'tablet' | 'mobile'>('full');
  const [filePath, setFilePath] = useState('SelectedExample.tsx');
  const [context, setContext] = useState('');
  const [wrap, setWrap] = useState(false);
  const [duration, setDuration] = useState(160);
  const [previewAccent, setPreviewAccent] = useState(theme['--f-accent']);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [forceOff, setForceOff] = useState(false);
  const [motionProfile, setMotionProfile] = useState<'subtle' | 'expressive'>('subtle');
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [copy, setCopy] = useState(emptyCopy);
  const [copyPending, setCopyPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeKey, setNoticeKey] = useState(0);
  const notify = (message: string) => { setNotice(message); setNoticeKey(key => key + 1); };
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError,setZipError] = useState('');
  const [active, setActive] = useState('');
  const workHeading = useRef<HTMLHeadingElement>(null);
  const copying = useRef(false);
  const archiveBusy = useRef(false);
  const revision = useRef(0);
  const alive = useRef(true);
  const off = forceOff || reduced;
  const t = systemWords[locale];
  const b = baseWords[locale];
  const config = useMemo(() => ({ locale, target, accent: previewAccent, motion: off ? 'off' as const : motionProfile, duration: off ? 0 : duration }), [locale, target, previewAccent, off, motionProfile, duration]);
  const files = useMemo(() => studyFiles(config), [config]);
  const sourceFiles = files.filter(file => /\.(tsx?|css)$/.test(file.path));
  const selectedFile = sourceFiles.find(file => file.path === filePath) ?? sourceFiles[0];
  const prompt = useMemo(() => studyPrompt({ ...config, context, mode: 'preserve' }), [config, context]);
  const style = { ...theme, ...systemCssVariables, '--sy-display': `${typographyScale.display.desktopSize}px`, '--sy-display-mobile': `${typographyScale.display.mobileSize}px` } as CSSProperties;
  const navLabels = [t.discovery, t.libraryStates, t.workbench, t.access, t.controls, t.actions, t.modals, t.floating, t.feedback, t.type, t.roles, t.handoff];

  useEffect(() => {
    alive.current = true;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => { alive.current = false; media.removeEventListener('change', update); };
  }, []);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--f-page-canvas');
    const meta = document.querySelector('meta[name="theme-color"]');
    const oldMeta = meta?.getAttribute('content');
    root.style.setProperty('--f-page-canvas', theme['--f-canvas']); meta?.setAttribute('content', theme['--f-canvas']);
    return () => { if (previous) root.style.setProperty('--f-page-canvas', previous); else root.style.removeProperty('--f-page-canvas'); if (oldMeta) meta?.setAttribute('content', oldMeta); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = 'Tallshift UI — Afterlight interface system';
    const url = new URL(location.href);
    for (const [key, value] of Object.entries({ lang: locale, view, target, accent: 'saffron', shade: 'light', font: 'manrope' })) url.searchParams.set(key, value);
    try { history.replaceState({}, '', url); } catch { /* File previews can restrict history. */ }
  }, [locale, view, target]);
  useLayoutEffect(() => { revision.current++; setCopy(emptyCopy); }, [locale, view, target, duration, previewAccent, off, motionProfile, filePath, context]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const threshold = Math.min(240, innerHeight * .25);
      let current = '';
      for (const id of navIds) {
        if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= threshold) current = id;
      }
      setActive(previous => previous === current ? previous : current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    const main = document.querySelector('.system-study main');
    if (main) observer.observe(main);
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    let anchor = '';
    try { anchor = decodeURIComponent(location.hash.slice(1)); } catch { /* Ignore malformed external fragments. */ }
    if (navIds.some(id => id === anchor)) document.getElementById(anchor)?.scrollIntoView();
    schedule();
    return () => { observer.disconnect(); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); cancelAnimationFrame(frame); };
  }, []);

  async function copyText(value: string) {
    if (copying.current) return;
    const ticket = ++revision.current;
    copying.current = true; setCopyPending(true); setCopy({ key: 'work', state: 'busy', value });
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (alive.current && ticket === revision.current) setCopy({ key: 'work', state: 'done', value });
    } catch { if (alive.current && ticket === revision.current) setCopy({ key: 'work', state: 'error', value }); }
    finally { copying.current = false; if (alive.current) setCopyPending(false); }
  }
  async function downloadArchive() {
    if (archiveBusy.current) return;
    archiveBusy.current = true; setZipBusy(true); setZipError('');
    const captured = { ...config, context, mode: 'preserve' as const };
    try {
      const bytes = await studyArchive(captured);
      saveFile(new Uint8Array(bytes).buffer, 'application/zip', `A001-${captured.target}-${captured.locale}-${captured.accent === theme['--f-accent'] ? 'saffron-lighter' : captured.accent.slice(1).toLowerCase()}.zip`);
      if (alive.current) notify(t.zipDone);
    } catch { if (alive.current) { setZipError(t.zipError); notify(t.zipError); } }
    finally { archiveBusy.current = false; if (alive.current) setZipBusy(false); }
  }
  function exportSystem() {
    saveFile(JSON.stringify({
      schemaVersion: 1, format: 'tallshift-system-token-graph', reviewVersion: systemReview.id, status: 'visual-review', productionReady: false,
      approved: { direction: 'afterlight', typeface: 'Manrope', color: { family: 'saffron', shade: 'light', value: '#EBD183' } },
      locale, tokens: systemTokenGraph, resolved: resolvedSystemTokens, css: systemCssText(), scales: systemScale,
      specimenConfig: { material: 'A001', accent: previewAccent, duration: off ? 0 : duration, motion: off ? 'off' : motionProfile },
      motion: { responseMs: 120, stateMs: 160, panelMs: 180, reduced: 'No spatial or repeating motion', modeOff: true },
      coverage: systemCoverage, contrast: checks, limitations: ['Specimens are under visual review.', 'Only A001 is an interactive library material.', 'No checkout, account or server entitlements are implemented here.'],
    }, null, 2) + '\n', 'application/json', systemReview.tokenFilename);
    notify(t.exported);
  }
  function openMaterial() {
    setView('demo'); document.getElementById('workbench')?.scrollIntoView({ behavior: off ? 'auto' : 'smooth' }); workHeading.current?.focus({ preventScroll: true });
  }

  return <div id="top" className="system-study" style={style} data-motion={off ? 'off' : 'on'}>
    <SystemNavigationShell className="sy-width" brand={<SystemBrandMark aria-label={locale === 'ru' ? 'Tallshift — на главную' : locale === 'vi' ? 'Tallshift — trang chủ' : 'Tallshift — home'} />} edition={t.edition} localeControl={<SystemLocaleControl locale={locale} onChange={setLocale} label={b.languageLabel} />} label={t.nav} items={navIds.map((id,i)=>({id,href:`#${id}`,label:navLabels[i]}))} activeId={active} skipLink={{href:'#discovery',label:t.discovery}} menuLabels={{open:locale==='ru'?'Навигация':locale==='vi'?'Điều hướng':'Navigation',close:locale==='ru'?'Закрыть навигацию':locale==='vi'?'Đóng điều hướng':'Close navigation'}} />
    <main className="sy-width">
      <section className="sy-intro"><div><p className="sy-kicker">AFTERLIGHT / SYSTEM STUDY</p><SystemTypography as="h1" textRole="display">{t.title}<span>{t.titleSecond}</span></SystemTypography><p className="sy-lead">{t.intro}</p></div><aside className="sy-decisions" aria-label={t.approved}><span>{t.approved}</span><strong><i aria-hidden="true" />{t.introColor}</strong><p>{t.introType}</p><p>{t.introBase}</p><span className="sy-review">{t.review}</span></aside></section>
      <DiscoveryLab locale={locale} onOpenMaterial={openMaterial} />
      <LibraryStatesLab locale={locale} onOpenMaterial={openMaterial} />
      <section id="workbench" className="sy-section" aria-labelledby="sy-work-title"><header className="sy-section-heading"><span className="sy-kicker">{t.workbench}</span><h2 id="sy-work-title" tabIndex={-1} ref={workHeading}>{t.workTitle}</h2><p>{t.workIntro}</p></header>
        <div className="sy-workbench">
          <header className="sy-work-header"><div><span className="sy-kicker">{t.workTitle}</span><h3>State Relay</h3></div><span className="sy-license">Free · MIT</span></header>
          <div className="sy-workbar"><SystemTabList className="sy-tabs" label={b.viewLabel} value={view} onChange={setView} options={views.map(item => ({ value: item, label: b[item], tabId: `sy-tab-${item}`, panelId: `sy-panel-${item}` }))} /><SystemButton variant="primary" className="sy-button sy-button-primary" loading={view === 'demo' ? zipBusy : copyPending} onClick={() => { if (view === 'demo') void downloadArchive(); else void copyText(view === 'source' ? selectedFile.content : prompt); }}>{view === 'demo' ? <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3v9m-4-4 4 4 4-4M4 13v4h12v-4" /></svg> : <CopyIcon done={copy.state === 'done'} />}{view === 'demo' ? t.getFiles : copy.state === 'done' ? b.copied : view === 'source' ? t.copySource : b.copyPrompt}</SystemButton></div>
          <div className="sy-work-body"><div className="sy-representations">
            <div id="sy-panel-demo" role="tabpanel" aria-labelledby="sy-tab-demo" inert={view !== 'demo'} aria-hidden={view !== 'demo'}><SystemPreviewViewport locale={locale} label="State Relay" width={width} onWidthChange={setWidth} motionOff={off}><AfterlightExample key={previewRevision} {...config} /></SystemPreviewViewport></div>
            <div id="sy-panel-source" role="tabpanel" aria-labelledby="sy-tab-source" inert={view !== 'source'} aria-hidden={view !== 'source'}><SystemCodePanel label={t.file} source={selectedFile.content} filePath={selectedFile.path} wrap={wrap} toolbar={<div className="sy-filebar"><SystemSelect label={t.file} value={selectedFile.path} options={sourceFiles.map(file=>({value:file.path,label:file.path}))} onChange={setFilePath}/><SystemCheckbox className="sy-check" label={t.wrap} checked={wrap} onChange={setWrap}/></div>} navigation={<SourceNavigator locale={locale} files={sourceFiles} selectedPath={selectedFile.path} onSelect={setFilePath} onCopy={()=>void copyText(selectedFile.content)} copyBusy={copyPending}/>} description={t.fileNote}/></div>
            <div id="sy-panel-prompt" role="tabpanel" aria-labelledby="sy-tab-prompt" inert={view !== 'prompt'} aria-hidden={view !== 'prompt'}><SystemPromptPanel label={b.copyPrompt} prompt={prompt}><PromptDocument locale={locale} files={files} prompt={prompt} /></SystemPromptPanel></div>
          </div><aside className="sy-work-settings"><div className="sy-configuration"><SystemRadioGroup layout="inline" label={t.target} value={target} onChange={setTarget} options={[{value:'next',label:'Next.js'},{value:'vite',label:'Vite'}]} /><SystemHexColorField locale={locale} value={previewAccent} onChange={setPreviewAccent} /></div><SystemTextarea className="sy-context" label={t.context} description={t.contextNote} maxLength={4000} value={context} onChange={event => setContext(event.target.value)} placeholder={t.contextPlaceholder} /><div className="sy-export-footer"><SystemDownloadAction variant="primary" label={t.zip} onDownload={downloadArchive} loading={zipBusy} error={zipError} failureMessage={t.zipError}/><span className="sy-work-identity"><i aria-hidden="true" style={{ background: previewAccent }} />{previewAccent === theme['--f-accent'] ? 'Saffron Lighter' : previewAccent} / Manrope</span></div></aside></div>
        </div>
        {copy.state === 'error' && <SystemCopyFallback title={b.copyError} label={b.manualCopy} value={copy.value}/>}
      </section>
      <AccessStatesLab locale={locale} onOpenMaterial={openMaterial} />
      <InteractionLab locale={locale} motionOff={off} />
      <ActionSpecimen locale={locale} motionOff={off} />
      <ModalSpecimen locale={locale} />
      <FloatingSpecimen locale={locale} />
      <FeedbackSpecimen locale={locale} motionOff={off} />
      <ControlAuditSpecimen locale={locale} />
      <CompletionStatesSpecimen locale={locale}/>
      <IconSpecimen locale={locale} />
      <ProgressSpecimen locale={locale} motionOff={off} />
      <div className="sy-foundations"><TypeLayoutSpecimen locale={locale} /></div>
      <section id="roles" className="sy-section" aria-labelledby="sy-roles-title"><header className="sy-section-heading"><span className="sy-kicker">FOUNDATIONS / COLOR + MOTION</span><h2 id="sy-roles-title">{t.rolesTitle}</h2><p>{t.rolesIntro}</p></header>
        <div className="sy-color-layers">{(['canvas', 'panel', 'raised', 'inset'] as const).map(role => <div key={role} style={{ background: theme[`--f-${role === 'panel' ? 'surface' : role}`] }}><span>{t[role]}</span><code>{theme[`--f-${role === 'panel' ? 'surface' : role}`]}</code></div>)}</div>
        <div className="sy-role-row">{(['default', 'hover', 'pressed'] as const).map((role, index) => <div key={role} className="sy-action-sample" style={{ background: theme[['--f-accent', '--f-accent-hover', '--f-accent-pressed'][index]] }}><span>{t[role]}</span><code>{theme[['--f-accent', '--f-accent-hover', '--f-accent-pressed'][index]]}</code></div>)}</div><p className="sy-help">{t.sampleNote}</p>
        <SystemColorControl locale={locale} value={previewAccent} onChange={setPreviewAccent} />
        <SystemMotionControls locale={locale} duration={duration} onDurationChange={setDuration} forceOff={forceOff} onForceOffChange={setForceOff} reduced={reduced} profile={motionProfile} onProfileChange={setMotionProfile} onReplay={() => setPreviewRevision(value => value + 1)} />
        <details className="sy-contrast"><summary>{b.contrastTitle} · {checks.filter(check => check.passes).length}/{checks.length}</summary><p>{b.contrastNote}</p><div className="sy-table-scroll" tabIndex={0}><table><thead><tr><th>{b.pair}</th><th>{b.ratio}</th><th>{b.required}</th></tr></thead><tbody>{checks.map(check => <tr key={check.label}><td>{check.label}</td><td>{check.ratio.toFixed(2)}:1</td><td>{check.minimum}:1 <SystemIcon name={check.passes ? 'check' : 'close'} size={16} label={check.passes ? 'Pass' : 'Fail'} /></td></tr>)}</tbody></table></div></details>
      </section>
      <section id="handoff" className="sy-section" aria-labelledby="sy-handoff-title"><header className="sy-section-heading"><span className="sy-kicker">SYSTEM / HANDOFF</span><h2 id="sy-handoff-title">{t.handoffTitle}</h2><p>{t.handoffIntro}</p></header><div className="sy-handoff-panel"><div><span className="sy-kicker">{t.alias}</span><p>{t.graph}</p><code>primitive.color.accent<br />→ semantic.action.primary.default<br />→ component.button.primary.background</code><span className="sy-help">{Object.keys(systemTokenGraph).length} tokens · {t.approvedNote}</span></div><SystemButton variant="primary" className="sy-button sy-button-primary" onClick={exportSystem}>{t.export}</SystemButton></div><details className="sy-coverage"><summary>{t.coverage} · {systemCoverage.length}</summary><p>{t.coverageNote}</p><div className="sy-table-scroll" tabIndex={0}><table><thead><tr><th>ID</th><th>{t.family}</th><th>{t.implementation}</th><th>{t.state}</th></tr></thead><tbody>{systemCoverage.map(item => <tr key={item.id}><td>{item.id}</td><td><SystemTextLink href={`#${item.specimen}`} onClick={() => { if (item.view) setView(item.view); }}>{item.name}</SystemTextLink></td><td>{item.implementation === 'shared-api' ? t.sharedApi : item.implementation === 'composed-api' ? t.composedApi : t.localApi}{item.api && <small className="sy-api-name">{item.api}</small>}</td><td>{item.status === 'review-specimen' ? t.inspect : item.status === 'partial-specimen' ? t.partial : t.contract}</td></tr>)}</tbody></table></div></details></section>
    </main>
    <footer className="sy-footer sy-width"><span>Tallshift UI / Afterlight / System {systemReview.version} · by Max Tall</span><SystemTextLink href={`${systemReview.archive}?lang=${locale}&shade=light`}>{t.archive}</SystemTextLink></footer>
    <span className="sy-announcement" role="status" aria-live="polite">{copy.state === 'done' ? b.copied : ''}</span>
    <div className="sy-toast-host"><SystemToastRegion label={t.notifications} dismissLabel={t.close} items={notice ? [{id:'system-notice',title:notice}] : []} announcement={notice} announcementKey={noticeKey} onDismiss={() => setNotice('')} /></div>
  </div>;
}
