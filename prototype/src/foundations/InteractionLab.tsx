import { SystemIcon } from './SystemIcon';
import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { interactionCopy } from './interaction-copy';
import { SystemDialog } from './SystemDialog';
import { SystemButton } from './SystemButton';
import { SystemTooltip } from './SystemTooltip';
import { SystemToastRegion } from './SystemToastRegion';
import { SystemInlineAlert } from './SystemInlineAlert';
import { SystemIconButton } from './SystemIconButton';
import { SystemCheckbox } from './SystemCheckbox';
import { SystemTextInput, SystemTextarea } from './SystemTextField';
import { SystemSwitch } from './SystemSwitch';
import { SystemRadioGroup } from './SystemRadioGroup';
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

function Symbol({kind}:{kind:'plus'|'check'|'close'|'trash'|'info'|'alert'|'arrow'}) { return <SystemIcon name={kind==='alert'?'warning':kind==='arrow'?'arrow-right':kind}/>; }

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
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const dialogTriggerRef = useRef<HTMLButtonElement | null>(null);

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
  const dismissDialog = () => setPendingDelete(null);
  const removePreset = () => {
    if (!pendingDelete) return;
    setPresets((current) => current.filter(({ id: presetId }) => presetId !== pendingDelete.id));
    if (error === 'nameDuplicate') setError(null);
    announce('removed', pendingDelete.name);
    setPendingDelete(null);
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
          <SystemTooltip content={t.tooltip} trigger={props => <SystemIconButton {...props} icon="info" label={t.tooltipLabel} variant="quiet" />} />
        </div>
        <SystemTextInput className="il-field" ref={inputRef} id={`${id}-name`} name="preset-name" label={t.name} description={t.nameHelp} value={name} required autoComplete="off" placeholder={t.namePlaceholder} error={error ? t[error] : undefined} announceError onChange={event => { setName(event.target.value); if (error) setError(null); }} />
        <SystemTextarea className="il-field" id={`${id}-notes`} name="preset-notes" label={t.notes} requirement={t.optional} description={t.notesHelp} counter={t.characterCount.replace('{count}', String(notes.length))} value={notes} maxLength={160} placeholder={t.notesPlaceholder} onChange={event => setNotes(event.target.value)} />
        <div className="il-options">
          <SystemCheckbox className="il-checkbox" label={t.includePrompt} description={t.includePromptHelp} checked={includePrompt} onChange={setIncludePrompt} />
          <SystemSwitch label={t.compact} description={t.compactHelp} checked={compact} onChange={setCompact} />
        </div>
        <div className="il-actions">
          <SystemButton ref={saveRef} type="submit" variant="primary" leadingIcon={<Symbol kind="plus" />}>{t.save}</SystemButton>
          <SystemButton onClick={loadExample}>{t.sample}</SystemButton>
          <SystemButton variant="quiet" className="il-clear-fields" onClick={clearFields}>{t.reset}</SystemButton>
        </div>
        <SystemToastRegion label={locale === 'ru' ? 'Результаты действий' : locale === 'vi' ? 'Kết quả thao tác' : 'Action results'} dismissLabel={t.dismiss} items={notice ? [{id: String(notice.key), title: noticeText, tone: notice.message === 'saved' || notice.message === 'removed' ? 'success' : 'neutral'}] : []} announcement={noticeText} announcementKey={notice?.key} onDismiss={() => setNotice(null)} />
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
        <SystemInlineAlert title={feedbackTexts[feedback]} tone={feedback === 'loading' ? 'neutral' : feedback} announce="polite">{feedback === 'loading' ? t.loadingNote : undefined}</SystemInlineAlert>
      </section>
      <section className="il-disabled-card" aria-labelledby={`${id}-disabled-title`}>
        <h3 id={`${id}-disabled-title`}>{t.disabledTitle}</h3><p>{t.disabledNote}</p>
        <SystemButton variant="primary" disabled aria-describedby={`${id}-disabled-reason`} leadingIcon={<Symbol kind="plus" />}>{t.disabled}</SystemButton>
        <p id={`${id}-disabled-reason`} className="il-help">{t.disabledReason}</p>
      </section>
    </div>

    <FormStateSpecimen locale={locale} />

    <SystemDialog open={!!pendingDelete} onOpenChange={open => { if (!open) dismissDialog(); }} title={t.dialogTitle} description={t.dialogBody.replace('{name}', pendingDelete?.name ?? '')} closeLabel={t.closeDialog} initialFocusRef={cancelDeleteRef} returnFocusRef={dialogTriggerRef} fallbackFocusRef={saveRef} footer={<><SystemButton ref={cancelDeleteRef} onClick={dismissDialog}>{t.cancel}</SystemButton><SystemButton variant="destructive" onClick={removePreset}>{t.confirmRemove}</SystemButton></>}>
      {null}
    </SystemDialog>
  </section>;
}


const formStateCopy = {
  en: { title: 'Form controls', note: 'The same controls, with validation and locked states visible.', email: 'Work email', help: 'Example field with email validation.', invalid: 'Enter a complete email address.', required: 'Required', readonly: 'Project · read only', disabled: 'Workspace name · unavailable', mixed: 'Select all files', mixedHelp: 'Two of three files selected. Activate to select every file.', consent: 'Accept the licence', consentError: 'Accept the licence before continuing.', delivery: 'Delivery format', react: 'React source', reactHelp: 'Components for Next.js and Vite.', html: 'HTML export', unavailable: 'Not available for this material.', pending: 'Sync settings', pendingHelp: 'A persistence state example; no request is running.', waiting: 'Waiting for confirmation', saveError: 'Sync failed', retryHelp: 'The previous setting is kept. Activate to change it locally.', switchError: 'Could not save this setting. Try again.' },
  ru: { title: 'Поля и выбор', note: 'Те же компоненты с ошибками валидации и заблокированными состояниями.', email: 'Рабочая почта', help: 'Пример поля с проверкой адреса электронной почты.', invalid: 'Введите полный адрес электронной почты.', required: 'Обязательно', readonly: 'Проект · только чтение', disabled: 'Название команды · недоступно', mixed: 'Выбрать все файлы', mixedHelp: 'Выбраны два файла из трёх. Нажмите, чтобы выбрать все.', consent: 'Принять лицензию', consentError: 'Перед продолжением примите лицензию.', delivery: 'Формат файлов', react: 'Исходники React', reactHelp: 'Компоненты для Next.js и Vite.', html: 'Экспорт HTML', unavailable: 'Для этого материала пока недоступно.', pending: 'Синхронизация настроек', pendingHelp: 'Пример ожидания сохранения. Запрос не отправляется.', waiting: 'Ожидание подтверждения', saveError: 'Сбой синхронизации', retryHelp: 'Сохранено прежнее значение. Нажмите, чтобы изменить его локально.', switchError: 'Не удалось сохранить настройку. Попробуйте ещё раз.' },
  vi: { title: 'Trường nhập và lựa chọn', note: 'Cùng bộ điều khiển, hiển thị lỗi xác thực và trạng thái bị khóa.', email: 'Email công việc', help: 'Trường mẫu kiểm tra định dạng email.', invalid: 'Nhập địa chỉ email đầy đủ.', required: 'Bắt buộc', readonly: 'Dự án · chỉ đọc', disabled: 'Tên nhóm · không khả dụng', mixed: 'Chọn tất cả tệp', mixedHelp: 'Đã chọn hai trong ba tệp. Nhấn để chọn tất cả.', consent: 'Chấp nhận giấy phép', consentError: 'Chấp nhận giấy phép trước khi tiếp tục.', delivery: 'Định dạng tệp', react: 'Mã nguồn React', reactHelp: 'Thành phần cho Next.js và Vite.', html: 'Xuất HTML', unavailable: 'Chưa có cho tài liệu này.', pending: 'Đồng bộ cài đặt', pendingHelp: 'Ví dụ trạng thái chờ lưu; không gửi yêu cầu.', waiting: 'Đang chờ xác nhận', saveError: 'Đồng bộ thất bại', retryHelp: 'Giữ giá trị trước đó. Nhấn để đổi cài đặt cục bộ.', switchError: 'Không lưu được cài đặt. Hãy thử lại.' },
};
function FormStateSpecimen({ locale }: { locale: Locale }) {
  const t = formStateCopy[locale]; const id = useId();
  const [mixed, setMixed] = useState(true); const [all, setAll] = useState(false);
  const [consent, setConsent] = useState(false); const [email, setEmail] = useState('max@');
  const [sync, setSync] = useState(false);
  return <section className="il-form-states" aria-labelledby={`${id}-title`}>
    <header><h3 id={`${id}-title`}>{t.title}</h3><p>{t.note}</p></header>
    <div className="il-form-state-grid">
      <div>
        <SystemTextInput label={t.email} type="email" value={email} onChange={event => setEmail(event.target.value)} description={t.help} requirement={t.required} required error={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : t.invalid} />
        <SystemTextInput label={t.readonly} value="Tallshift" readOnly />
        <SystemTextInput label={t.disabled} value="Tallshift" disabled />
      </div>
      <div>
        <SystemCheckbox label={t.mixed} description={mixed ? t.mixedHelp : undefined} checked={all} indeterminate={mixed} onChange={checked => { setAll(checked); setMixed(false); }} />
        <SystemCheckbox label={t.consent} checked={consent} required onChange={setConsent} error={consent ? undefined : t.consentError} />
        <SystemRadioGroup label={t.delivery} value="react" onChange={() => {}} options={[{ value: 'react', label: t.react, description: t.reactHelp }, { value: 'html', label: t.html, description: t.unavailable, disabled: true }]} />
        <SystemSwitch label={t.pending} checked pending pendingLabel={t.waiting} description={t.pendingHelp} onChange={() => {}} />
        <SystemSwitch label={t.saveError} checked={sync} onChange={setSync} description={t.retryHelp} error={sync ? undefined : t.switchError} />
      </div>
    </div>
  </section>;
}
