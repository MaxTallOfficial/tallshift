import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { interactionCopy } from './interaction-copy';
import { SystemCheckbox } from './SystemCheckbox';
import { validatePresetName } from './preset-validation';
import type { PresetNameError } from './preset-validation';
import './interaction-lab.css';

type Locale = 'en' | 'ru' | 'vi';
type Feedback = 'success' | 'error' | 'warning' | 'loading';

interface LocalPreset {
  id: number;
  name: string;
  notes: string;
  includePrompt: boolean;
  compact: boolean;
}

interface Notice {
  key: number;
  message: 'saved' | 'removed' | 'sampleLoaded' | 'cleared';
  name?: string;
}

function Symbol({ kind }: { kind: 'plus' | 'check' | 'close' | 'trash' | 'info' | 'alert' | 'arrow' }) {
  const paths: Record<typeof kind, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v.1" /></>,
    alert: <><path d="m12 3 10 17H2L12 3Z" /><path d="M12 9v5M12 17v.1" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function LocalHint({ label, description }: { label: string; description: string }) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = !dismissed && (hovered || focused || pinned);
  useEffect(() => {
    if (!visible) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      // A background hint must not handle Escape intended for a modal dialog.
      if (event.key !== 'Escape' || document.querySelector('dialog:modal')) return;
      event.stopPropagation();
      setDismissed(true);
      setPinned(false);
    };
    document.addEventListener('keydown', dismissOnEscape);
    return () => document.removeEventListener('keydown', dismissOnEscape);
  }, [visible]);
  return <span className="il-hint" onMouseEnter={() => { setHovered(true); setDismissed(false); }} onMouseLeave={() => setHovered(false)}>
    <button type="button" className="il-button il-icon il-ghost" aria-label={label} aria-describedby={id}
      onFocus={() => { setFocused(true); setDismissed(false); }}
      onBlur={() => { setFocused(false); setPinned(false); }}
      onClick={() => { setPinned((value) => !value); setDismissed(false); }}><Symbol kind="info" /></button>
    <span id={id} role="tooltip" className="il-tooltip" hidden={!visible}>{description}</span>
  </span>;
}

/** Presets deliberately live in component memory: no account, storage or network. */
export function InteractionLab({ locale, motionOff }: { locale: Locale; motionOff: boolean }) {
  const t = interactionCopy[locale];
  const id = useId();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [includePrompt, setIncludePrompt] = useState(true);
  const [compact, setCompact] = useState(false);
  const [error, setError] = useState<PresetNameError | null>(null);
  const [presets, setPresets] = useState<LocalPreset[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('warning');
  const [pendingDelete, setPendingDelete] = useState<LocalPreset | null>(null);
  const counter = useRef(0);
  const noticeCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (pendingDelete && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [pendingDelete]);

  const announce = (message: Notice['message'], presetName?: string) => {
    setNotice({ key: ++noticeCounter.current, message, name: presetName });
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const result = validatePresetName(name, presets.map((preset) => preset.name));
    setError(result.error);
    if (result.error) { inputRef.current?.focus(); return; }
    const preset = { id: ++counter.current, name: result.name, notes: notes.trim(), includePrompt, compact };
    setPresets((current) => [...current, preset]);
    announce('saved', preset.name);
  };
  const loadExample = () => {
    setName(t.sampleName); setNotes(t.sampleNotes); setIncludePrompt(true); setCompact(false); setError(null);
    announce('sampleLoaded');
  };
  const clearFields = () => {
    setName(''); setNotes(''); setIncludePrompt(true); setCompact(false); setError(null);
    announce('cleared'); inputRef.current?.focus();
  };
  const dismissDialog = () => dialogRef.current?.close('cancel');
  const afterDialogClose = () => {
    setPendingDelete(null);
    if (dialogTriggerRef.current?.isConnected) dialogTriggerRef.current.focus();
    else saveRef.current?.focus();
  };
  const removePreset = () => {
    if (!pendingDelete) return;
    setPresets((current) => current.filter(({ id: presetId }) => presetId !== pendingDelete.id));
    if (error === 'nameDuplicate') setError(null);
    announce('removed', pendingDelete.name);
    dialogRef.current?.close('removed');
  };
  const noticeText = notice ? t[notice.message].replace('{name}', notice.name ?? '') : '';
  const feedbackTexts: Record<Feedback, string> = {
    success: t.successText, error: t.errorText, warning: t.warningText, loading: t.loadingText,
  };

  return <section className="il-lab" id="controls" data-motion={motionOff ? 'off' : 'on'} aria-labelledby={`${id}-title`}>
    <header className="il-section-heading">
      <p className="il-eyebrow">{t.eyebrow}</p>
      <h2 id={`${id}-title`}>{t.title}</h2>
      <p>{t.intro}</p>
    </header>

    <div className="il-workflow">
      <form className="il-form" noValidate onSubmit={save} aria-labelledby={`${id}-form-title`}>
        <div className="il-card-heading">
          <div><h3 id={`${id}-form-title`}>{t.formTitle}</h3><p>{t.formNote}</p></div>
          <LocalHint label={t.tooltipLabel} description={t.tooltip} />
        </div>
        <div className="il-field">
          <label htmlFor={`${id}-name`}>{t.name}</label>
          <input ref={inputRef} id={`${id}-name`} name="preset-name" value={name} autoComplete="off"
            placeholder={t.namePlaceholder} aria-required="true" aria-invalid={Boolean(error)}
            aria-describedby={`${id}-name-help${error ? ` ${id}-name-error` : ''}`}
            onChange={(event) => { setName(event.target.value); if (error) setError(null); }} />
          <p id={`${id}-name-help`} className="il-help">{t.nameHelp}</p>
          {error && <p id={`${id}-name-error`} className="il-field-error" role="alert"><Symbol kind="alert" />{t[error]}</p>}
        </div>
        <div className="il-field">
          <div className="il-label-row"><label htmlFor={`${id}-notes`}>{t.notes}</label><span>{t.optional}</span></div>
          <textarea id={`${id}-notes`} name="preset-notes" value={notes} maxLength={160} placeholder={t.notesPlaceholder}
            aria-describedby={`${id}-notes-help ${id}-notes-count`} onChange={(event) => setNotes(event.target.value)} />
          <div className="il-field-footer"><p id={`${id}-notes-help`} className="il-help">{t.notesHelp}</p><span id={`${id}-notes-count`}>{t.characterCount.replace('{count}', String(notes.length))}</span></div>
        </div>
        <div className="il-options">
          <SystemCheckbox className="il-checkbox" label={t.includePrompt} description={t.includePromptHelp} checked={includePrompt} onChange={setIncludePrompt} />
          <div className="il-switch-row">
            <div><span id={`${id}-compact-label`}>{t.compact}</span><p id={`${id}-compact-help`}>{t.compactHelp}</p></div>
            <button type="button" className="il-switch" role="switch" aria-checked={compact} aria-labelledby={`${id}-compact-label`} aria-describedby={`${id}-compact-help`} onClick={() => setCompact((current) => !current)}><span /></button>
          </div>
        </div>
        <div className="il-actions">
          <button ref={saveRef} type="submit" className="il-button il-primary"><Symbol kind="plus" />{t.save}</button>
          <button type="button" className="il-button il-secondary" onClick={loadExample}>{t.sample}</button>
          <button type="button" className="il-button il-ghost il-clear-fields" onClick={clearFields}>{t.reset}</button>
        </div>
        <div className="il-notice-region" role="status" aria-live="polite" aria-atomic="true">
          {notice && <div className="il-toast" key={notice.key}>
            <Symbol kind="check" /><p>{noticeText}</p>
            <button type="button" className="il-button il-icon il-ghost" aria-label={t.dismiss} onClick={() => { setNotice(null); saveRef.current?.focus(); }}><Symbol kind="close" /></button>
          </div>}
        </div>
      </form>

      <aside className="il-side" aria-labelledby={`${id}-preview-title`}>
        <div className="il-preview-heading"><span id={`${id}-preview-title`}>{t.preview}</span><span className="il-live-dot" aria-hidden="true" /></div>
        <div className="il-preview" data-compact={compact}>
          <div className="il-preview-mark" aria-hidden="true"><span /><span /><span /></div>
          <span className="il-local-badge">{t.localBadge}</span>
          <h4>{name.trim() || t.untitled}</h4>
          <p>{notes.trim() || t.noNotes}</p>
          <div className="il-preview-properties"><span><Symbol kind={includePrompt ? 'check' : 'arrow'} />{includePrompt ? t.promptIncluded : t.settingsOnly}</span><span>{compact ? t.compactLayout : t.comfortable}</span></div>
        </div>
        <div className="il-saved-heading"><h3>{t.savedTitle}</h3><span>{t.savedCount.replace('{count}', String(presets.length))}</span></div>
        {presets.length === 0 ? <p className="il-empty">{t.empty}</p> : <ul className="il-saved-list">{presets.map((preset) => <li key={preset.id}>
          <div><strong>{preset.name}</strong><span>{preset.includePrompt ? t.promptIncluded : t.settingsOnly} · {preset.compact ? t.compactLayout : t.comfortable}</span></div>
          <button type="button" className="il-button il-icon il-ghost" aria-label={t.remove.replace('{name}', preset.name)} onClick={(event) => { dialogTriggerRef.current = event.currentTarget; setPendingDelete(preset); }}><Symbol kind="trash" /></button>
        </li>)}</ul>}
        <p className="il-local-note">{t.localNote}</p>
      </aside>
    </div>

    <div className="il-patterns">
      <section className="il-feedback" aria-labelledby={`${id}-feedback-title`}>
        <header><h3 id={`${id}-feedback-title`}>{t.feedbackTitle}</h3><p>{t.feedbackNote}</p></header>
        <div className="il-state-choices" role="group" aria-label={t.feedbackTitle}>
          {(['success', 'error', 'warning', 'loading'] as const).map((state) => <button key={state} type="button" className="il-button il-state-choice" aria-pressed={feedback === state} onClick={() => setFeedback(state)}>{t[state]}</button>)}
        </div>
        <div className={`il-feedback-message il-feedback-${feedback}`} role="status" aria-live="polite" aria-atomic="true">
          {feedback === 'loading' ? <span className="il-spinner" aria-hidden="true" /> : <Symbol kind={feedback === 'success' ? 'check' : 'alert'} />}
          <div><p>{feedbackTexts[feedback]}</p>{feedback === 'loading' && <span>{t.loadingNote}</span>}</div>
        </div>
      </section>
      <section className="il-disabled-card" aria-labelledby={`${id}-disabled-title`}>
        <h3 id={`${id}-disabled-title`}>{t.disabledTitle}</h3><p>{t.disabledNote}</p>
        <button type="button" className="il-button il-primary" disabled aria-describedby={`${id}-disabled-reason`}><Symbol kind="plus" />{t.disabled}</button>
        <p id={`${id}-disabled-reason`} className="il-help">{t.disabledReason}</p>
      </section>
    </div>

    <dialog ref={dialogRef} className="il-dialog" aria-labelledby={`${id}-dialog-title`} aria-describedby={`${id}-dialog-body`} onCancel={(event) => { event.preventDefault(); dismissDialog(); }} onClose={afterDialogClose}>
      <div className="il-dialog-heading"><span className="il-delete-symbol"><Symbol kind="trash" /></span><button type="button" className="il-button il-icon il-ghost" aria-label={t.closeDialog} onClick={dismissDialog}><Symbol kind="close" /></button></div>
      <h3 id={`${id}-dialog-title`}>{t.dialogTitle}</h3><p id={`${id}-dialog-body`}>{t.dialogBody.replace('{name}', pendingDelete?.name ?? '')}</p>
      <div className="il-dialog-actions"><button type="button" className="il-button il-secondary" autoFocus onClick={dismissDialog}>{t.cancel}</button><button type="button" className="il-button il-danger" onClick={removePreset}>{t.confirmRemove}</button></div>
    </dialog>
  </section>;
}
