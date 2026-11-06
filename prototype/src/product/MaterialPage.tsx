import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SystemBadge } from '../foundations/SystemBadge';
import { SystemButton } from '../foundations/SystemButton';
import { SystemCheckbox } from '../foundations/SystemCheckbox';
import { SystemCodePanel } from '../foundations/SystemCodePanel';
import { SystemCopyFallback, SystemPromptPanel } from '../foundations/SystemPromptPanel';
import { SystemDownloadAction } from '../foundations/SystemDownloadAction';
import { SystemDurationControl } from '../foundations/SystemMotionControls';
import { SystemHexColorField } from '../foundations/SystemColorControl';
import { SystemIcon } from '../foundations/SystemIcon';
import { SystemIconButton } from '../foundations/SystemIconButton';
import { SystemRadioGroup } from '../foundations/SystemRadioGroup';
import { SystemSegmentedControl } from '../foundations/SystemSegmentedControl';
import { SystemSelect } from '../foundations/SystemSelect';
import { SystemSheet } from '../foundations/SystemSheet';
import { SystemTabList } from '../foundations/SystemTabs';
import { SystemTextarea } from '../foundations/SystemTextField';
import { SystemToastRegion } from '../foundations/SystemToastRegion';
import { SystemPreviewViewport } from '../foundations/SystemPreviewViewport';
import { SourceNavigator } from '../foundations/SourceNavigator';
import { IntegrationGuide } from '../foundations/IntegrationGuide';
import { MaterialPreview } from '../foundations/MaterialPreview';
import { renderRelayIcon } from '../foundations/relay-icon-renderer';
import { colorDraftState } from '../foundations/workbench-state';
import { validateDurationDraft } from '../foundations/config-control-validation';
import { AfterlightExample } from '../study/AfterlightExample';
import { studyArchive, studyFiles, studyPrompt } from '../study/recipe';
import { PromptDocument } from '../study/PromptDocument';
import { parseShare, shareEnvelope } from '../share';
import type { Material } from './catalog-data';
import type { ProductLocale } from './routes';
import { productCopy } from './product-copy';
import { catalogCopy } from './catalog-copy';
import {materialDisplayName} from './material-presentation';
import './material.css';

type View = 'demo' | 'code' | 'prompt';
interface MaterialPageProps {
  material: Material; locale: ProductLocale; search: string; catalogSearch: string;
  onSearchChange: (search: string) => void; saved: boolean; onToggleFavorite: () => void;
}

export function MaterialPage({ material, locale, search, catalogSearch, onSearchChange, saved, onToggleFavorite }: MaterialPageProps) {
  const t = productCopy[locale];
  const displayName=materialDisplayName(material,locale);
  const query = new URLSearchParams(search);
  const view = (['demo', 'code', 'prompt'] as const).find(value => value === query.get('view')) ?? 'demo';
  const target: 'next' | 'vite' = query.get('target') === 'vite' ? 'vite' : 'next';
  const [initial] = useState(() => parseShare(location.hash));
  const [accent, setAccent] = useState(initial?.accent ?? '#EBD183');
  const [accentDraft, setAccentDraft] = useState(accent);
  const [duration, setDuration] = useState(initial?.duration ?? 160);
  const [durationDraft, setDurationDraft] = useState(String(duration));
  const [motion, setMotion] = useState<'off' | 'subtle' | 'expressive'>(initial?.motion ?? 'subtle');
  const [width, setWidth] = useState<'full' | 'tablet' | 'mobile'>('full');
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 1023px)').matches);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [path, setPath] = useState('SelectedExample.tsx');
  const [wrap, setWrap] = useState(false);
  const [mode, setMode] = useState<'preserve' | 'adapt'>('preserve');
  const [includeContext, setIncludeContext] = useState(false);
  const [context, setContext] = useState('');
  const [copy, setCopy] = useState<{ state: 'idle' | 'pending' | 'done' | 'error'; payload: string }>({ state: 'idle', payload: '' });
  const [notice, setNotice] = useState('');
  const [noticeKey, setNoticeKey] = useState(0);
  const [archivePending, setArchivePending] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const archiveBusy = useRef(false);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const guideTrigger = useRef<HTMLButtonElement>(null);
  const licenseTrigger = useRef<HTMLButtonElement>(null);
  const copyBusy = useRef(false);
  const mounted = useRef(true);
  const revision = useRef(0);
  const off = motion === 'off' || reduced;
  const colorState = colorDraftState(accentDraft, accent);
  const blockedReason = colorState !== 'applied' ? t.blocked : !off && validateDurationDraft(durationDraft).error ? t.durationBlocked : '';
  const blocked = Boolean(blockedReason);
  const exportAllowed = useRef(!blocked); exportAllowed.current = !blocked;
  const config = useMemo(() => ({ locale, target, accent, duration: off ? 0 : duration, motion: off ? 'off' as const : motion }), [locale, target, accent, off, duration, motion]);
  const files = useMemo(() => material.available ? studyFiles(config) : [], [material.available, config]);
  const sources = files.filter(file => /\.(tsx?|css)$/.test(file.path));
  const selected = sources.find(file => file.path === path) ?? sources[0];
  const prompt = useMemo(() => material.available ? studyPrompt({ ...config, mode, context: includeContext ? context : '' }) : '', [material.available, config, mode, includeContext, context]);
  const guide = files.find(file => file.path === `INSTALL.${locale}.md`)?.content ?? files.find(file => file.path === `README.${locale}.md`)?.content ?? '';
  const license = files.find(file => file.path === 'LICENSE.txt')?.content ?? '';

  useEffect(() => {
    mounted.current = true;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const screen = matchMedia('(max-width: 1023px)');
    const updateMotion = () => setReduced(media.matches);
    const updateScreen = () => { setCompact(screen.matches); if (!screen.matches) setSettingsOpen(false); };
    media.addEventListener('change', updateMotion); screen.addEventListener('change', updateScreen);
    return () => { mounted.current = false; media.removeEventListener('change', updateMotion); screen.removeEventListener('change', updateScreen); };
  }, []);
  useLayoutEffect(() => { revision.current++; setCopy({ state: 'idle', payload: '' }); setNotice(''); }, [config, mode, includeContext, context, path, view, blocked]);

  function changeQuery(key: string, value: string) {
    const next = new URLSearchParams(search); next.set(key, value);
    onSearchChange(`?${next}`);
  }
  async function copyText(payload: string, message: string = t.copied) {
    if (copyBusy.current || !exportAllowed.current) return;
    const ticket = ++revision.current;
    copyBusy.current = true; setCopy({ state: 'pending', payload });
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(payload);
      if (mounted.current && ticket === revision.current) { setCopy({ state: 'done', payload }); setNotice(message); setNoticeKey(value => value + 1); }
    } catch {
      if (mounted.current && ticket === revision.current) setCopy({ state: 'error', payload });
    } finally { copyBusy.current = false; if (mounted.current && ticket === revision.current) setCopy(current => current.state === 'pending' ? { state: 'idle', payload: '' } : current); }
  }
  async function download() {
    if (!exportAllowed.current || archiveBusy.current) return;
    archiveBusy.current = true; setArchivePending(true); setArchiveError('');
    try {
    const captured = { ...config, mode, context: includeContext ? context : '' };
    const ticket = revision.current;
    const bytes = await studyArchive(captured);
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' }));
    const anchor = document.createElement('a'); anchor.href = url;
    anchor.download = `A001-state-relay-${captured.target}-${captured.locale}.zip`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (mounted.current && ticket === revision.current) { setNotice(t.zipDone); setNoticeKey(value => value + 1); }
    } catch (error) { if (mounted.current) setArchiveError(t.zipFailure); throw error; }
    finally { archiveBusy.current = false; if (mounted.current) setArchivePending(false); }
  }
  function share() {
    const url = new URL(`/${locale}/library/state-relay`, location.origin);
    url.hash = new URLSearchParams({ share: JSON.stringify(shareEnvelope({ accent, motion: config.motion, duration: config.duration })) }).toString();
    void copyText(url.href, t.shared);
  }
  const settings = <div className="tp-settings-content">
    <SystemRadioGroup layout="inline" label={t.target} description={t.targetHelp} value={target} onChange={value => changeQuery('target', value)} options={[{ value: 'next', label: 'Next.js' }, { value: 'vite', label: 'Vite' }]} />
    <SystemHexColorField locale={locale} label={t.accent} description={t.accentHelp} value={accent} onChange={setAccent} draftValue={accentDraft} onDraftChange={setAccentDraft} />
    <SystemSegmentedControl label={t.motion} value={motion} onChange={setMotion} disabled={reduced} options={[{ value: 'subtle', label: t.subtle }, { value: 'expressive', label: t.expressive }, { value: 'off', label: t.off }]} />
    {reduced && <p className="tp-help">{t.reduced}</p>}
    <SystemDurationControl locale={locale} value={duration} onChange={setDuration} draftValue={durationDraft} onDraftChange={setDurationDraft} disabled={off} />
    <p className="tp-settings-status" data-blocked={blocked} role="status">{blockedReason || t.applied}</p>
    <SystemDownloadAction variant="primary" label={t.download} onDownload={download} disabled={blocked} loading={archivePending} error={archiveError} failureMessage={t.zipFailure} />
    <p className="tp-help">{t.downloadHelp}</p>
    <SystemButton variant="quiet" leadingIcon={<SystemIcon name="link" />} onClick={share} disabled={blocked} loading={copy.state === 'pending'}>{t.share}</SystemButton>
  </div>;

  return <div className="tp-material">
    <a className="tp-back" href={`/${locale}/library${catalogSearch}`}><SystemIcon name="arrow-left" size={16} />{t.back}</a>
    <header className="tp-material-heading">
      <div><h1 lang={locale}>{displayName}</h1><p>{material.available ? t.lead : material.description[locale]}</p>
      <div className="tp-material-metadata"><span>{material.id}</span><span lang="en">{material.name}</span><span>{t[material.type]}</span><SystemBadge tone={material.available ? 'success' : 'neutral'}>{material.available ? t.available : t.planned}</SystemBadge></div></div>
      <div className="tp-material-heading-actions"><SystemBadge>{material.access === 'free' ? t.free : t.paid}</SystemBadge><SystemIconButton icon="bookmark" label={saved ? t.unsave : t.save} aria-pressed={saved} onClick={onToggleFavorite} /></div>
    </header>
    {material.available ? <>
      <div className="tp-workbench">
        <section className="tp-workspace" aria-label={displayName}>
          <div className="tp-workbar"><SystemTabList label={displayName} value={view} onChange={(next: View) => changeQuery('view', next)} options={(['demo', 'code', 'prompt'] as const).map(value => ({ value, label: t[value], tabId: `material-tab-${value}`, panelId: `material-panel-${value}` }))} />
          <SystemButton variant="quiet" ref={guideTrigger} leadingIcon={<SystemIcon name="book" />} aria-haspopup="dialog" aria-expanded={guideOpen} onClick={() => setGuideOpen(true)}>{t.instructions}</SystemButton></div>
          {compact && <div className="tp-mobile-settings"><SystemButton ref={settingsTrigger} leadingIcon={<SystemIcon name="settings" />} aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(true)}>{t.settings}</SystemButton><SystemDownloadAction variant="primary" label={t.download} onDownload={download} disabled={blocked} loading={archivePending} error={archiveError} failureMessage={t.zipFailure} /></div>}
          {blocked && <p className="tp-blocked-note" role="status">{blockedReason}</p>}
          <div className="tp-panel" id="material-panel-demo" role="tabpanel" aria-labelledby="material-tab-demo" hidden={view !== 'demo'}>
            <p className="tp-panel-explanation">{t.demoHelp}</p>
            <SystemPreviewViewport locale={locale} label={displayName} width={width} onWidthChange={setWidth} motionOff={off}>
              <AfterlightExample {...config} renderStateIcon={renderRelayIcon} actionIcon={<SystemIcon name="external" />} resetIcon={<SystemIcon name="replay" />} />
            </SystemPreviewViewport>
          </div>
          <div className="tp-panel tp-code" id="material-panel-code" role="tabpanel" aria-labelledby="material-tab-code" hidden={view !== 'code'}>
            <div className="tp-source-toolbar"><SystemCheckbox label={t.wrap} checked={wrap} onChange={setWrap} /><SystemButton leadingIcon={<SystemIcon name="copy" />} disabled={blocked} loading={copy.state === 'pending'} onClick={() => void copyText(selected.content)}>{t.copyCode}</SystemButton></div>
            <SystemCodePanel label={t.file} source={selected.content} filePath={selected.path} wrap={wrap} description={t.sourceNote} navigation={<SourceNavigator locale={locale} files={sources} selectedPath={selected.path} onSelect={setPath} onCopy={() => void copyText(selected.content)} copyBusy={copy.state === 'pending'} exportBlocked={blocked} />} toolbar={<div className="tp-file-select"><SystemSelect label={t.file} value={selected.path} onChange={setPath} options={sources.map(file => ({ value: file.path, label: file.path }))} /></div>} />
          </div>
          <div className="tp-panel tp-prompt" id="material-panel-prompt" role="tabpanel" aria-labelledby="material-tab-prompt" hidden={view !== 'prompt'}>
            <p className="tp-panel-explanation tp-prompt-help">{t.promptHelp}</p>
            <SystemRadioGroup label={t.mode} layout="cards" value={mode} onChange={setMode} description={t.modeHelp} options={[{ value: 'preserve', label: t.preserve }, { value: 'adapt', label: t.adapt }]} />
            <SystemCheckbox label={t.includeContext} checked={includeContext} onChange={setIncludeContext} />
            {includeContext && <SystemTextarea label={t.context} description={t.contextHint} value={context} maxLength={4000} counter={`${context.length} / 4000`} onChange={event => setContext(event.target.value)} placeholder={t.contextPlaceholder} />}
            <SystemButton variant="primary" leadingIcon={<SystemIcon name="copy" />} loading={copy.state === 'pending'} disabled={blocked} onClick={() => void copyText(prompt)}>{t.copyPrompt}</SystemButton>
            <SystemPromptPanel label={t.prompt} prompt={prompt}><PromptDocument locale={locale} files={files} prompt={prompt} /></SystemPromptPanel>
          </div>
          {copy.state === 'error' && <SystemCopyFallback title={t.copyFailure} label={t.manual} value={copy.payload} />}
        </section>
        {!compact && <aside className="tp-settings" aria-labelledby="material-settings"><header><h2 id="material-settings">{t.settings}</h2><p className="tp-help">{t.settingsHelp}</p></header>{settings}</aside>}
      </div>
      <section className="tp-material-info" aria-labelledby="material-kit"><header><h2 id="material-kit">{t.kit}</h2></header><div className="tp-kit-grid">{[
        { icon: 'code' as const, title: t.sourceTitle, body: t.sourceBody }, { icon: 'sparkles' as const, title: t.promptTitle, body: t.promptBody }, { icon: 'book' as const, title: t.guideTitle, body: t.guideBody },
      ].map(item => <div key={item.title}><SystemIcon name={item.icon} size={24} /><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
      <div className="tp-material-notes"><div><h3>{t.use}</h3><p>{t.useBody}</p></div><div><h3>{t.facts}</h3><ul>{[t.framework, t.dependencies, t.keyboard, t.version].map(value => <li key={value}><SystemIcon name="check" size={16} />{value}</li>)}</ul></div></div>
      <p className="tp-license">{t.permission} <button ref={licenseTrigger} onClick={() => setLicenseOpen(true)} type="button">{t.readLicense}</button></p></section>
      {compact && <SystemSheet open={settingsOpen} onOpenChange={setSettingsOpen} title={t.settings} description={t.settingsHelp} closeLabel={t.close} returnFocusRef={settingsTrigger}>{settings}</SystemSheet>}
      <SystemSheet open={guideOpen} onOpenChange={setGuideOpen} title={t.instructions} description={t.instructionsHelp} closeLabel={t.close} returnFocusRef={guideTrigger}><div className="tp-guide"><IntegrationGuide source={guide} /></div></SystemSheet>
      <SystemSheet open={licenseOpen} onOpenChange={setLicenseOpen} title={t.licenseTitle} description={t.permission} closeLabel={t.close} returnFocusRef={licenseTrigger}><pre className="tp-license-text">{license}</pre></SystemSheet>
      <SystemToastRegion label={t.notifications} dismissLabel={t.close} items={notice ? [{ id: 'material', title: notice, tone: 'success' }] : []} announcement={notice} announcementKey={noticeKey} onDismiss={() => setNotice('')} />
    </> : <section className="tp-planned"><div className="tp-planned-preview"><MaterialPreview kind={material.preview} locale={locale} /><span>{catalogCopy[locale].illustration}</span></div><div><h2>{t.plannedTitle}</h2><p>{t.plannedBody}</p><a className="tp-action-link" href={`/${locale}/library/state-relay`}>{t.plannedAction}<SystemIcon name="arrow-right" /></a></div></section>}
  </div>;
}
