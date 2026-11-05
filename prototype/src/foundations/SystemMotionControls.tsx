import { SystemDisclosureIcon } from './SystemDisclosureIcon';
import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Locale } from './copy.ts';
import { SystemCheckbox } from './SystemCheckbox.tsx';
import { SystemSegmentedControl } from './SystemSegmentedControl.tsx';
import { configControlWords } from './system-config-controls-copy.ts';
import { MOTION_DURATION, resolveMotionState, validateDurationDraft } from './config-control-validation.ts';
import './system-config-controls.css';

export interface SystemDurationControlProps {
  locale: Locale;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  /** Used only by an editable validation specimen; not an applied value. */
  initialDraft?: string;
  /** Optional host-owned draft survives responsive relocation of the settings panel. */
  draftValue?: string;
  onDraftChange?: (value: string) => void;
  onDraftStateChange?: (state: 'applied' | 'invalid') => void;
}

/** A native range and number input share one applied value, never an invalid draft. */
export function SystemDurationControl({ locale, value, onChange, disabled = false, readOnly = false, initialDraft, draftValue, onDraftChange, onDraftStateChange }: SystemDurationControlProps) {
  const id = useId();
  const t = configControlWords[locale];
  const [localDraft, setLocalDraft] = useState(initialDraft ?? String(value));
  const draft = draftValue ?? localDraft;
  const setDraft = (next: string) => { setLocalDraft(next); onDraftChange?.(next); };
  const previousValue = useRef(value);
  useEffect(() => { if (previousValue.current !== value) { setDraft(String(value)); previousValue.current = value; } }, [value]);
  const result = validateDurationDraft(draft);
  useLayoutEffect(() => { onDraftStateChange?.(result.error ? 'invalid' : 'applied'); }, [result.error, onDraftStateChange]);
  const feedback = {
    help: t.durationHelp,
    required: t.durationRequired,
    number: t.durationNumber,
    range: t.durationRange,
    step: t.durationStep,
  };
  const changeDraft = (next: string) => {
    if (disabled || readOnly) return;
    setDraft(next);
    const validation = validateDurationDraft(next);
    if (validation.error === null) onChange(validation.value);
  };

  return <div className="sc-duration" data-disabled={disabled || undefined} data-readonly={readOnly || undefined}>
    <div className="sc-field-heading"><label htmlFor={`${id}-range`}>{t.duration}</label><span>{t.applied}: <output>{value} ms</output></span></div>
    <div className="sc-duration-inputs">
      <input id={`${id}-range`} className="sc-range" type="range" min={MOTION_DURATION.min} max={MOTION_DURATION.max} step={MOTION_DURATION.step} value={value} disabled={disabled || readOnly} aria-readonly={readOnly || undefined} aria-describedby={`${id}-feedback`} onChange={event => changeDraft(event.target.value)} />
      <div className="sc-number"><input type="number" aria-label={`${t.duration} (ms)`} min={MOTION_DURATION.min} max={MOTION_DURATION.max} step={MOTION_DURATION.step} value={draft} disabled={disabled} readOnly={readOnly} aria-invalid={result.error !== null} aria-describedby={`${id}-feedback`} onChange={event => changeDraft(event.target.value)} onBlur={() => { if (result.error === null) setDraft(String(result.value)); }} /><span aria-hidden="true">ms</span></div>
    </div>
    <div className="sc-feedback" id={`${id}-feedback`} aria-live="polite">{Object.entries(feedback).map(([key, text]) => <span key={key} className={key === 'help' ? '' : 'sc-field-error'} aria-hidden={key !== (result.error ?? 'help')}>{text}</span>)}</div>
  </div>;
}

export interface SystemMotionControlsProps {
  locale: Locale;
  duration: number;
  onDurationChange: (value: number) => void;
  profile: 'subtle' | 'expressive';
  onProfileChange: (value: 'subtle' | 'expressive') => void;
  forceOff: boolean;
  onForceOffChange: (value: boolean) => void;
  reduced: boolean;
  onReplay?: () => void;
  onDraftStateChange?: (state: 'applied' | 'invalid') => void;
}

export function SystemMotionControls({ locale, duration, onDurationChange, profile, onProfileChange, forceOff, onForceOffChange, reduced, onReplay, onDraftStateChange }: SystemMotionControlsProps) {
  const t = configControlWords[locale];
  const id = useId();
  const motion = resolveMotionState(duration, forceOff, reduced);
  const [replayed, setReplayed] = useState(false);
  const [invalidSpecimen, setInvalidSpecimen] = useState(160);
  const [draftRevision, setDraftRevision] = useState(0);
  const motionDot = useRef<HTMLElement>(null);
  const animation = useRef<Animation | null>(null);
  const shift = profile === 'expressive' ? 38 : 16;
  const summaries = { off: t.effectiveOff, reduced: t.effectiveReduced, instant: t.effectiveInstant, active: t.effectiveActive.replace('{duration}', String(duration)) };
  const profiles = [{ value: 0, label: t.instant }, { value: 120, label: t.quick }, { value: 160, label: t.standard }, { value: 240, label: t.relaxed }];
  useEffect(() => {
    animation.current?.cancel();
    animation.current = null;
    return () => { animation.current?.cancel(); animation.current = null; };
  }, [duration, profile, forceOff, reduced]);

  function replay() {
    animation.current?.cancel();
    animation.current = null;
    setReplayed(true);
    if (motion.effectiveDuration > 0 && motionDot.current?.animate) {
      const current = motionDot.current.animate(
        [{ transform: 'translateX(0)', opacity: .72 }, { transform: `translateX(${shift}px)`, opacity: 1 }],
        { duration: motion.effectiveDuration, easing: 'cubic-bezier(.2,.8,.2,1)', iterations: 1 },
      );
      animation.current = current;
      current.onfinish = () => { if (animation.current === current) animation.current = null; };
    }
    onReplay?.();
  }

  return <section className="sc-panel sc-motion" aria-labelledby={`${id}-title`} data-effective-motion={motion.reason}>
    <header className="sc-panel-heading"><h3 id={`${id}-title`}>{t.motionTitle}</h3><p>{t.motionIntro}</p></header>
    <div className="sc-motion-body">
      <div className="sc-motion-settings">
        <SystemSegmentedControl label={t.motionProfile} value={profile} options={[{ value: 'subtle', label: t.subtle }, { value: 'expressive', label: t.expressive }]} onChange={onProfileChange} disabled={motion.controlsDisabled} />
        <div className="sc-feedback sc-profile-feedback"><span aria-hidden={profile !== 'subtle'}>{t.subtleHelp}</span><span aria-hidden={profile !== 'expressive'}>{t.expressiveHelp}</span></div>
        <SystemDurationControl key={draftRevision} locale={locale} value={duration} onChange={onDurationChange} disabled={motion.controlsDisabled} onDraftStateChange={onDraftStateChange} />
        <fieldset className="sc-profiles" disabled={motion.controlsDisabled}><legend>{t.profiles}</legend><div>{profiles.map(profile => <button type="button" key={profile.value} aria-pressed={duration === profile.value} onClick={() => { onDurationChange(profile.value); setDraftRevision(value => value + 1); }}><span>{profile.label}</span><small>{profile.value} ms</small></button>)}</div></fieldset>
        <SystemCheckbox label={t.motionOff} description={t.motionOffHelp} checked={forceOff || reduced} disabled={reduced} onChange={onForceOffChange} />
        <div className="sc-system-note"><p aria-hidden={!reduced}>{t.reduced}</p></div>
      </div>
      <div className="sc-motion-result">
        <span className="sc-meta-label">{t.effective}</span><strong className="sc-motion-summary" role="status" aria-live="polite" aria-atomic="true">{Object.entries(summaries).map(([reason, text]) => <span key={reason} aria-hidden={reason !== motion.reason}>{text}</span>)}</strong>
        <div className="sc-motion-demo" style={{ '--sc-preview-shift': `${shift}px` } as CSSProperties} data-complete={replayed} data-profile={profile}><span className="sc-motion-track" aria-hidden="true"><i ref={motionDot} /></span><span>{replayed ? t.complete : t.ready}</span></div>
        <div className="sc-actions"><button type="button" className="sc-button sc-button-primary" onClick={replay}>{t.replay}</button><button type="button" className="sc-button sc-button-secondary" onClick={() => { animation.current?.cancel(); animation.current = null; onDurationChange(MOTION_DURATION.default); onProfileChange('subtle'); onForceOffChange(false); setReplayed(false); setDraftRevision(value => value + 1); }}>{t.reset}</button></div>
      </div>
    </div>
    <details className="sc-states"><summary><SystemDisclosureIcon/>{t.motionStates}</summary><div className="sc-state-grid">
      <section><h4>{t.errorState}</h4><p>{t.errorStateHelp}</p><SystemDurationControl key="invalid-duration-specimen" locale={locale} value={invalidSpecimen} onChange={setInvalidSpecimen} initialDraft="480.5" /></section>
      <section><h4>{t.disabledState}</h4><p>{t.disabledStateHelp}</p><SystemDurationControl locale={locale} value={160} onChange={() => {}} disabled /></section>
      <section><h4>{t.readOnlyState}</h4><p>{t.readOnlyStateHelp}</p><SystemDurationControl locale={locale} value={160} onChange={() => {}} readOnly /></section>
    </div><p className="sc-review-note">{t.review}</p></details>
  </section>;
}
