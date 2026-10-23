'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useStateRelay } from '../../recipe-exports/state-relay/src/useStateRelay';
import type { RelayState } from '../../recipe-exports/state-relay/src/createStateRelay';
import styles from './AfterlightExample.module.css';

export interface AfterlightExampleProps {
  locale?: 'en' | 'ru' | 'vi';
  motion?: 'off' | 'subtle' | 'expressive';
  accent?: string;
  duration?: number;
}

const words = {
  ru: {
    instrument: 'Кнопка с обратной связью', scenario: 'Сценарий', clipboard: 'Копирование', simulated: 'Ошибка · симуляция',
    copy: 'Скопировать текст', working: 'Копируем…', copied: 'Текст скопирован', retry: 'Повторить', simulate: 'Показать ошибку',
    idle: 'Готово', pending: 'Копируем', success: 'Скопировано', error: 'Ошибка', reset: 'Сбросить',
    idleMessage: 'Нажмите кнопку, чтобы скопировать короткий пример.',
    simulationMessage: 'Посмотрите, как кнопка сообщает об ошибке. Это локальная симуляция.',
    pendingMessage: 'Копируем текст в буфер обмена…',
    successMessage: 'Текст скопирован. Вставьте его в любое текстовое поле, чтобы проверить.',
    errorMessage: 'Не удалось скопировать. Разрешите доступ к буферу и откройте страницу по HTTPS или на localhost.',
    simulatedError: 'Пример ошибки. Ничего не отправлено на сервер.',
    stateTrack: 'Состояния кнопки', copyHint: 'Короткий пример', simulationHint: 'Локальная симуляция',
    clipboardText: 'State Relay — A001\nReact + TypeScript. Кнопка с обратной связью.',
  },
  en: {
    instrument: 'Button feedback', scenario: 'Scenario', clipboard: 'Copy text', simulated: 'Error · simulation',
    copy: 'Copy text', working: 'Copying…', copied: 'Text copied', retry: 'Try again', simulate: 'Show an error',
    idle: 'Ready', pending: 'Copying', success: 'Copied', error: 'Error', reset: 'Reset',
    idleMessage: 'Press the button to copy a short example.',
    simulationMessage: 'See how the button reports an error. This is a local simulation.',
    pendingMessage: 'Copying the text to your clipboard…',
    successMessage: 'Copied. Paste it into any text field to check.',
    errorMessage: 'Could not copy. Allow clipboard access and open this page over HTTPS or on localhost.',
    simulatedError: 'Example error. Nothing was sent to a server.',
    stateTrack: 'Button states', copyHint: 'A short example', simulationHint: 'Local simulation',
    clipboardText: 'State Relay — A001\nReact + TypeScript. A button with feedback.',
  },
  vi: {
    instrument: 'Phản hồi của nút', scenario: 'Tình huống', clipboard: 'Sao chép', simulated: 'Lỗi · mô phỏng',
    copy: 'Sao chép văn bản', working: 'Đang sao chép…', copied: 'Đã sao chép', retry: 'Thử lại', simulate: 'Hiển thị lỗi',
    idle: 'Sẵn sàng', pending: 'Đang sao chép', success: 'Đã sao chép', error: 'Lỗi', reset: 'Đặt lại',
    idleMessage: 'Nhấn nút để sao chép một đoạn văn bản mẫu.',
    simulationMessage: 'Xem cách nút báo lỗi. Đây là mô phỏng cục bộ.',
    pendingMessage: 'Đang sao chép văn bản vào bộ nhớ tạm…',
    successMessage: 'Đã sao chép. Dán vào một ô văn bản để kiểm tra.',
    errorMessage: 'Không sao chép được. Hãy cho phép truy cập bộ nhớ tạm và mở trang qua HTTPS hoặc localhost.',
    simulatedError: 'Lỗi minh họa. Không có dữ liệu nào được gửi đến máy chủ.',
    stateTrack: 'Trạng thái của nút', copyHint: 'Văn bản mẫu', simulationHint: 'Mô phỏng cục bộ',
    clipboardText: 'State Relay — A001\nReact + TypeScript. Nút có phản hồi trạng thái.',
  },
};

const states: RelayState[] = ['idle', 'pending', 'success', 'error'];
const glyphs: Record<RelayState, ReactNode> = {
  idle: <><rect x="8" y="7" width="11" height="13" rx="2" /><path d="M5 16V5a2 2 0 0 1 2-2h9" /></>,
  pending: <><circle cx="12" cy="12" r="8" opacity=".25" /><path d="M12 4a8 8 0 0 1 8 8" /></>,
  success: <path d="m5 12 4 4L19 6" />,
  error: <><circle cx="12" cy="12" r="9" opacity=".35" /><path d="m8 8 8 8m0-8-8 8" /></>,
};

export function AfterlightExample({ locale = 'en', motion = 'subtle', accent = '#C4DB9B', duration }: AfterlightExampleProps) {
  const t = words[locale];
  const statusId = useId();
  const [scenario, setScenario] = useState<'clipboard' | 'error'>('clipboard');
  const { state, statusMessage, controller } = useStateRelay();
  const safeAccent = /^#[\da-f]{6}$/i.test(accent) ? accent : '#C4DB9B';
  const customDuration = typeof duration === 'number' && Number.isFinite(duration) ? Math.max(0, Math.min(480, duration)) : undefined;
  const effectiveDuration = motion === 'off' ? 0 : customDuration ?? (motion === 'expressive' ? 180 : 120);
  const channels = [1, 3, 5].map(offset => {
    const channel = parseInt(safeAccent.slice(offset, offset + 2), 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  const darkChannels = [0x10, 0x17, 0x13].map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  const darkLuminance = darkChannels[0] * .2126 + darkChannels[1] * .7152 + darkChannels[2] * .0722;
  const darkContrast = (Math.max(luminance, darkLuminance) + .05) / (Math.min(luminance, darkLuminance) + .05);
  const onAccent = darkContrast >= 4.5 ? '#101713' : 1.05 / (luminance + .05) >= 4.5 ? '#ffffff' : '#000000';
  const labels: Record<RelayState, string> = {
    idle: scenario === 'clipboard' ? t.copy : t.simulate,
    pending: t.working, success: t.copied, error: t.retry,
  };
  const stateLabels: Record<RelayState, string> = { idle: t.idle, pending: t.pending, success: t.success, error: t.error };
  const message = state === 'idle' ? (scenario === 'clipboard' ? t.idleMessage : t.simulationMessage)
    : state === 'pending' ? t.pendingMessage
      : state === 'success' ? t.successMessage
        : statusMessage === 'simulation' ? t.simulatedError : t.errorMessage;

  function changeScenario(next: 'clipboard' | 'error') {
    controller.reset();
    setScenario(next);
  }

  function activate() {
    if (state === 'pending') return;
    if (scenario === 'error') {
      const ticket = controller.begin();
      controller.settle(ticket, 'error', 'simulation');
      return;
    }
    void controller.run(async () => {
      if (!globalThis.isSecureContext || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(t.clipboardText);
    }, { error: 'clipboard' });
  }

  return (
    <div className={styles.container}>
    <section className={styles.instrument} data-state={state} data-motion={motion} aria-label={`State Relay — ${t.instrument}`} style={{ '--relay-accent': safeAccent, '--relay-on-accent': onAccent, '--relay-duration': `${effectiveDuration}ms` } as CSSProperties}>
      <header className={styles.metadata}>
        <span className={styles.identifier}>A001 <span>/</span> STATE RELAY</span>
        <span className={styles.currentState}><i aria-hidden="true" />{state}</span>
      </header>
      <div className={styles.actionSurface}>
        <button type="button" className={styles.action} aria-label={labels[state]} aria-describedby={statusId} aria-busy={state === 'pending'} aria-disabled={state === 'pending'} onClick={activate}>
          <span className={styles.buttonMeta} aria-hidden="true">{scenario === 'clipboard' ? t.copyHint : t.simulationHint}<span>↗</span></span>
          <span className={styles.buttonContent} aria-hidden="true">
            <span className={styles.iconStack}>
              {states.map(key => <svg key={key} className={`${styles.icon} ${state === key ? styles.visibleIcon : ''} ${key === 'pending' ? styles.pendingIcon : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{glyphs[key]}</svg>)}
            </span>
            <span className={styles.labelStack}>{states.map(key => <span key={key} className={state === key ? styles.visibleLabel : ''}>{labels[key]}</span>)}</span>
          </span>
          <span className={styles.stateEdge} aria-hidden="true" />
        </button>
      </div>
      <fieldset className={styles.scenarios}>
        <legend>{t.scenario}</legend>
        <label><input type="radio" name={`${statusId}-scenario`} checked={scenario === 'clipboard'} onChange={() => changeScenario('clipboard')} /><span>{t.clipboard}</span></label>
        <label><input type="radio" name={`${statusId}-scenario`} checked={scenario === 'error'} onChange={() => changeScenario('error')} /><span>{t.simulated}</span></label>
      </fieldset>
      <ol className={styles.track} aria-label={t.stateTrack}>
        {states.map((key, index) => <li key={key} aria-current={state === key ? 'step' : undefined} className={state === key ? styles.activeStep : ''}><span className={styles.stepNumber}>0{index + 1}</span><span>{stateLabels[key]}</span><i aria-hidden="true" /></li>)}
      </ol>
      <footer className={styles.statusRow}>
        <p className={styles.status} id={statusId} role="status" aria-live="polite" aria-atomic="true">{message}</p>
        <button type="button" className={styles.reset} onClick={() => controller.reset()}>{t.reset}<span aria-hidden="true">↺</span></button>
      </footer>
    </section>
    </div>
  );
}

export default AfterlightExample;
