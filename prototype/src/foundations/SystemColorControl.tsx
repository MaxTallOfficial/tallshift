import { useEffect, useId, useRef, useState } from 'react';
import type { Locale } from './copy.ts';
import { APPROVED_PREVIEW_ACCENT, normalizeHexColor, previewColorContrast } from './config-control-validation.ts';
import { configControlWords } from './system-config-controls-copy.ts';
import './system-config-controls.css';
import { SystemIconButton } from './SystemIconButton';

export interface SystemHexColorFieldProps {
  locale: Locale;
  value: string;
  onChange: (canonicalHex: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  /** A local draft for reviewing validation; never applied automatically. */
  initialDraft?: string;
}

/** Only Apply or Enter emits a canonical opaque color. Invalid edits stay local. */
export function SystemHexColorField({ locale, value, onChange, disabled = false, readOnly = false, initialDraft }: SystemHexColorFieldProps) {
  const t = configControlWords[locale];
  const id = useId();
  const [draft, setDraft] = useState(initialDraft ?? value);
  const [edited, setEdited] = useState(initialDraft !== undefined);
  const previousValue = useRef(value);
  useEffect(() => { if (previousValue.current !== value) { setDraft(value); setEdited(false); previousValue.current = value; } }, [value]);
  const normalized = normalizeHexColor(draft);
  const error = edited && normalized === null;
  const dirty = normalized !== null && normalized !== normalizeHexColor(value);
  const apply = () => {
    if (disabled || readOnly || !dirty) return;
    setEdited(true);
    if (normalized !== null) { setDraft(normalized); onChange(normalized); }
  };

  return <div className="sc-color-field" data-disabled={disabled || undefined} data-readonly={readOnly || undefined}>
    <label className="sc-field-label" htmlFor={`${id}-hex`}>{t.colorLabel}</label>
    <div className="sc-hex-row"><span className="sc-color-swatch" aria-hidden="true" style={{ backgroundColor: normalizeHexColor(value) ?? 'transparent' }} /><input id={`${id}-hex`} type="text" value={draft} placeholder="#EBD183" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={32} disabled={disabled} readOnly={readOnly} aria-invalid={error} aria-describedby={`${id}-help`} onChange={event => { setDraft(event.target.value); setEdited(true); }} onKeyDown={event => { if (event.key === 'Enter' && !readOnly) { event.preventDefault(); apply(); } }} />{!readOnly && <SystemIconButton className="sc-color-apply" icon="check" label={t.apply} title={t.apply} variant={dirty ? 'primary' : 'quiet'} data-dirty={dirty} onClick={apply} disabled={disabled || !dirty} />}</div>
    <div className="sc-feedback" id={`${id}-help`} aria-live="polite"><span aria-hidden={error}>{t.colorHelp}</span><span className="sc-field-error" aria-hidden={!error || draft.trim() !== ''}>{t.colorRequired}</span><span className="sc-field-error" aria-hidden={!error || draft.trim() === ''}>{t.colorInvalid}</span></div>
  </div>;
}

export interface SystemColorControlProps {
  locale: Locale;
  value: string;
  onChange: (canonicalHex: string) => void;
}

export function SystemColorControl({ locale, value, onChange }: SystemColorControlProps) {
  const t = configControlWords[locale];
  const id = useId();
  const [invalidSpecimen, setInvalidSpecimen] = useState(APPROVED_PREVIEW_ACCENT);
  const [draftRevision, setDraftRevision] = useState(0);
  const contrast = previewColorContrast(value);

  return <section className="sc-panel sc-color" aria-labelledby={`${id}-title`}>
    <header className="sc-panel-heading"><h3 id={`${id}-title`}>{t.colorTitle}</h3><p>{t.colorIntro}</p></header>
    <div className="sc-color-body"><div>
      <SystemHexColorField key={draftRevision} locale={locale} value={value} onChange={onChange} />
      <button type="button" className="sc-button sc-button-secondary sc-color-reset" onClick={() => { onChange(APPROVED_PREVIEW_ACCENT); setDraftRevision(value => value + 1); }}>{t.resetColor}</button><p className="sc-scope-note">{t.colorScope}</p>
    </div><div className="sc-color-result" aria-label={t.colorPreview}>
      <div className="sc-color-sample" style={{ backgroundColor: contrast.background, color: contrast.foreground }}><span>{t.previewLabel}</span><code>{contrast.background}</code></div>
      <dl><div><dt>{t.applied}</dt><dd role="status" aria-live="polite" aria-atomic="true">{contrast.background}</dd></div><div><dt>{t[contrast.label]}</dt><dd>{contrast.foreground}</dd></div><div><dt>{t.contrast}</dt><dd>{contrast.ratio.toFixed(2)}:1</dd></div></dl>
      <div className="sc-feedback sc-contrast-feedback" data-passes={contrast.passes}><span aria-hidden={!contrast.passes}>{t.contrastPass}</span><span aria-hidden={contrast.passes}>{t.contrastFail}</span></div>
    </div></div>
    <details className="sc-states"><summary>{t.colorStates}</summary><div className="sc-state-grid">
      <section><h4>{t.invalidColorState}</h4><p>{t.invalidColorStateHelp}</p><SystemHexColorField key="invalid-color-specimen" locale={locale} value={invalidSpecimen} onChange={setInvalidSpecimen} initialDraft="#EB" /></section>
      <section><h4>{t.disabledState}</h4><SystemHexColorField locale={locale} value={APPROVED_PREVIEW_ACCENT} onChange={() => {}} disabled /></section>
      <section><h4>{t.readOnlyState}</h4><p>{t.readOnlyStateHelp}</p><SystemHexColorField locale={locale} value={APPROVED_PREVIEW_ACCENT} onChange={() => {}} readOnly /></section>
    </div><p className="sc-review-note">{t.review}</p></details>
  </section>;
}
