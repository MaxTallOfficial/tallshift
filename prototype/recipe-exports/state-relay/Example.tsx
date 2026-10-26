'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useStateRelay } from './src/useStateRelay';
import type { RelayState } from './src/createStateRelay';
import styles from './src/StateRelay.module.css';

export interface StateRelayDemoProps {
  locale?: 'en' | 'ru' | 'vi';
  motion?: 'off' | 'subtle' | 'expressive';
  accent?: string;
  /** Milliseconds. Defaults to 120 (subtle) / 180 (expressive). */
  duration?: number;
  /** Optional host icons. No private icon paths or dependency are shipped. */
  renderStateIcon?: (state: RelayState) => ReactNode;
  actionIcon?: ReactNode;
  resetIcon?: ReactNode;
}

const words = {
  ru: {
    title: 'Один жест. Чёткий ответ.', eyebrow: 'A001 / STATE RELAY',
    explanation: 'Действие остаётся на месте. Меняется только его состояние.',
    clipboard: 'Копирование', simulated: 'Ошибка · симуляция', scenarios: 'Сценарий примера',
    copy: 'Скопировать пример', simulate: 'Показать ошибку', pending: 'Выполняется…', success: 'Пример скопирован', error: 'Попробовать снова',
    idleMessage: 'Скопируйте пример и проверьте отклик.',
    simulationMessage: 'Покажем ошибку на этом устройстве, без запроса к серверу.',
    pendingMessage: 'Копируем пример…',
    successMessage: 'Пример в буфере обмена.',
    errorMessage: 'Не удалось скопировать. Разрешите доступ к буферу и используйте HTTPS или localhost.',
    simulatedError: 'Это демонстрация ошибки. Запроса к серверу не было.',
    reset: 'Сбросить', stateLabel: 'Состояние', note: 'CSS · без motion-зависимостей',
    local: 'ЛОКАЛЬНЫЙ КОД',
    states: { idle: 'Готово', pending: 'В работе', success: 'Успех', error: 'Ошибка' },
    clipboardText: 'State Relay — A001\nReact + TypeScript. Локальный код. Отклик на реальное действие.',
  },
  en: {
    title: 'One action. A clear response.', eyebrow: 'A001 / STATE RELAY',
    explanation: 'The action stays in place. Only its state changes.',
    clipboard: 'Copy to clipboard', simulated: 'Error · simulation', scenarios: 'Example scenario',
    copy: 'Copy example', simulate: 'Show error', pending: 'Working…', success: 'Example copied', error: 'Try again',
    idleMessage: 'Copy the example to try the interaction.',
    simulationMessage: 'Try a local error without sending a server request.',
    pendingMessage: 'Copying the example…',
    successMessage: 'The example is in your clipboard.',
    errorMessage: 'Could not copy. Allow clipboard access and use HTTPS or localhost.',
    simulatedError: 'This is an error demo. No server request was made.',
    reset: 'Reset', stateLabel: 'State', note: 'CSS · no motion dependencies',
    local: 'LOCAL SOURCE',
    states: { idle: 'Ready', pending: 'Working', success: 'Success', error: 'Error' },
    clipboardText: 'State Relay — A001\nReact + TypeScript. Local source. Real operation outcomes.',
  },
  vi: {
    title: 'Một thao tác. Phản hồi rõ ràng.', eyebrow: 'A001 / STATE RELAY',
    explanation: 'Nút giữ nguyên vị trí. Chỉ trạng thái thay đổi.',
    clipboard: 'Sao chép', simulated: 'Lỗi · mô phỏng', scenarios: 'Kịch bản thử',
    copy: 'Sao chép mẫu', simulate: 'Thử báo lỗi', pending: 'Đang xử lý…', success: 'Đã sao chép', error: 'Thử lại',
    idleMessage: 'Sao chép mẫu để thử tương tác.',
    simulationMessage: 'Thử lỗi cục bộ, không gửi yêu cầu đến máy chủ.',
    pendingMessage: 'Đang sao chép mẫu…',
    successMessage: 'Mẫu đã được sao chép vào bộ nhớ tạm.',
    errorMessage: 'Không thể sao chép. Hãy cho phép truy cập bộ nhớ tạm và dùng HTTPS hoặc localhost.',
    simulatedError: 'Đây là lỗi mô phỏng. Không có yêu cầu nào gửi đến máy chủ.',
    reset: 'Đặt lại', stateLabel: 'Trạng thái', note: 'CSS · không thêm thư viện chuyển động',
    local: 'MÃ NGUỒN CỤC BỘ',
    states: { idle: 'Sẵn sàng', pending: 'Đang xử lý', success: 'Thành công', error: 'Lỗi' },
    clipboardText: 'State Relay — A001\nReact + TypeScript. Mã nguồn cục bộ. Phản hồi từ thao tác thực.',
  },
};



export function StateRelayDemo({ locale = 'en', motion = 'subtle', accent = '#3569ed', duration, renderStateIcon, actionIcon, resetIcon }: StateRelayDemoProps) {
  const t = words[locale];
  const [scenario, setScenario] = useState<'clipboard' | 'error'>('clipboard');
  const { state, statusMessage, controller } = useStateRelay();
  const statusId = useId();
  const safeAccent = /^#[\da-f]{6}$/i.test(accent) ? accent : '#3569ed';
  const customDuration = typeof duration === 'number' && Number.isFinite(duration) ? Math.max(0, Math.min(480, duration)) : undefined;
  const effectiveDuration = motion === 'off' ? 0 : customDuration ?? (motion === 'expressive' ? 180 : 120);
  const [red, green, blue] = [1, 3, 5].map(offset => {
    const channel = parseInt(safeAccent.slice(offset, offset + 2), 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const onAccent = red * .2126 + green * .7152 + blue * .0722 > .179 ? '#101827' : '#ffffff';
  const labels: Record<RelayState, string> = {
    idle: scenario === 'clipboard' ? t.copy : t.simulate,
    pending: t.pending, success: t.success, error: t.error,
  };
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
      // The host deliberately supplies an error result. No fake backend or timer.
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
    <section className={styles.demo} lang={locale} data-motion={motion} data-state={state} style={{ '--relay-accent': safeAccent, '--relay-on-accent': onAccent, '--relay-duration': `${effectiveDuration}ms` } as CSSProperties} aria-label="State Relay">
      <header className={styles.header}>
        <span className={styles.eyebrow}>{t.eyebrow}</span>
        <span className={styles.local}>{t.local}</span>
      </header>
      <div className={styles.intro}>
        <h3>{t.title}</h3>
        <p>{t.explanation}</p>
      </div>
      <fieldset className={styles.scenarios}>
        <legend>{t.scenarios}</legend>
        <label><input type="radio" name={`${statusId}-scenario`} value="clipboard" checked={scenario === 'clipboard'} onChange={() => changeScenario('clipboard')} /><span>{t.clipboard}</span></label>
        <label><input type="radio" name={`${statusId}-scenario`} value="error" checked={scenario === 'error'} onChange={() => changeScenario('error')} /><span>{t.simulated}</span></label>
      </fieldset>
      <div className={styles.stage}>
        <div className={styles.orbit} aria-hidden="true"><i /><i /><i /></div>
        <button type="button" className={styles.action} onClick={activate} aria-label={labels[state]} aria-describedby={statusId} aria-busy={state === 'pending'} aria-disabled={state === 'pending'}>
          {renderStateIcon && <span className={styles.iconStack} aria-hidden="true">
            {(['idle','pending','success','error'] as RelayState[]).map(key => <span key={key} className={`${styles.icon} ${state === key ? styles.currentIcon : ''} ${key === 'pending' ? styles.spinner : ''}`}>{renderStateIcon(key)}</span>)}
          </span>}
          <span className={styles.labelStack} aria-hidden="true">
            {(Object.keys(labels) as RelayState[]).map(key => <span key={key} className={state === key ? styles.currentLabel : ''}>{labels[key]}</span>)}
          </span>
          <span className={styles.actionArrow} aria-hidden="true">{actionIcon}</span>
        </button>
        <div className={styles.track} aria-hidden="true">
          {(['idle', 'pending', 'success', 'error'] as RelayState[]).map((key, index) => <span className={state === key ? styles.activeStep : ''} key={key}><i /><small>0{index + 1} {t.states[key]}</small></span>)}
        </div>
      </div>
      <p id={statusId} className={styles.status} role="status" aria-live="polite" aria-atomic="true">{message}</p>
      <footer className={styles.footer}><span>{t.stateLabel}: <strong>{t.states[state]}</strong></span><button type="button" onClick={() => controller.reset()}>{t.reset}{resetIcon}</button></footer>
      <p className={styles.footnote}>{effectiveDuration} ms · {t.note}</p>
    </section>
  );
}

export default StateRelayDemo;
