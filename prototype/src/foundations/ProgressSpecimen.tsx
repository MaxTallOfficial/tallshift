import { useId, useState } from 'react';
import { SystemProgress } from './SystemProgress';
import type { Locale } from './copy';
import './progress-specimen.css';

const copy = {
  en: {
    eyebrow: 'PROGRESS / LOCAL SPECIMEN', title: 'Keep progress clear, even when the timing is unknown.', intro: 'Test percentages, completion, errors and cancellation. These controls change local examples; they do not send files or start a server task.', manual: 'Known progress', manualHint: 'Advance the example from 0 to 25, 70 and 100%.', operation: 'Example operation', start: 'Start', retry: 'Try again', next: 'Next step', error: 'Show error', cancel: 'Cancel', reset: 'Reset', idle: 'Ready. Start to set progress to 25%.', running: 'Running. Advance the next step or cancel.', complete: 'Complete. All example steps are done.', failed: 'Stopped after an example error. Try again to start at 25%.', cancelled: 'Cancelled. The next step is blocked until you try again.', unknown: 'Unknown duration', unknownHint: 'Use this variant when a reliable percentage is unavailable.', waiting: 'Waiting', waitingLabel: 'Waiting for the next step', startWaiting: 'Start waiting', stopWaiting: 'Stop waiting', unknownIdle: 'Stopped. Start to show an indeterminate state.', unknownActive: 'Waiting. Stop closes this local waiting state.', motion: 'With reduced motion, the waiting bar stays still; its text keeps the state clear.',
  },
  ru: {
    eyebrow: 'ПРОГРЕСС / ЛОКАЛЬНЫЙ ПРИМЕР', title: 'Понятный прогресс — даже без точного времени.', intro: 'Проверьте проценты, завершение, ошибку и отмену. Кнопки меняют локальные примеры: файлы никуда не отправляются, серверная задача не запускается.', manual: 'Известный прогресс', manualHint: 'Пройдите шаги от 0 до 25, 70 и 100%.', operation: 'Пример операции', start: 'Начать', retry: 'Повторить', next: 'Следующий шаг', error: 'Показать ошибку', cancel: 'Отменить', reset: 'Сбросить', idle: 'Готово к началу. Кнопка «Начать» установит 25%.', running: 'В процессе. Перейдите к следующему шагу или отмените.', complete: 'Завершено. Все шаги примера пройдены.', failed: 'Пример остановлен с ошибкой. Повтор начнётся с 25%.', cancelled: 'Отменено. Следующий шаг доступен после повтора.', unknown: 'Неизвестная длительность', unknownHint: 'Этот вариант подходит, когда достоверный процент неизвестен.', waiting: 'Ожидание', waitingLabel: 'Ожидание следующего шага', startWaiting: 'Начать ожидание', stopWaiting: 'Остановить', unknownIdle: 'Остановлено. Запустите пример неопределённого прогресса.', unknownActive: 'Ожидание. Кнопка «Остановить» завершит это локальное состояние.', motion: 'При уменьшенном движении полоса ожидания неподвижна, а текст объясняет состояние.',
  },
  vi: {
    eyebrow: 'TIẾN ĐỘ / VÍ DỤ CỤC BỘ', title: 'Tiến độ rõ ràng, kể cả khi chưa biết thời gian.', intro: 'Thử phần trăm, hoàn tất, lỗi và huỷ. Các nút chỉ thay đổi ví dụ cục bộ; không gửi tệp hay chạy tác vụ trên máy chủ.', manual: 'Tiến độ xác định', manualHint: 'Chuyển ví dụ từ 0 đến 25, 70 và 100%.', operation: 'Thao tác mẫu', start: 'Bắt đầu', retry: 'Thử lại', next: 'Bước tiếp', error: 'Hiện lỗi', cancel: 'Huỷ', reset: 'Đặt lại', idle: 'Sẵn sàng. Bắt đầu để đặt tiến độ ở 25%.', running: 'Đang chạy. Chuyển sang bước tiếp theo hoặc huỷ.', complete: 'Hoàn tất. Đã thực hiện mọi bước trong ví dụ.', failed: 'Ví dụ đã dừng do lỗi. Thử lại để bắt đầu từ 25%.', cancelled: 'Đã huỷ. Hãy thử lại trước khi chuyển sang bước tiếp theo.', unknown: 'Chưa biết thời lượng', unknownHint: 'Dùng khi chưa có phần trăm tiến độ đáng tin cậy.', waiting: 'Đang chờ', waitingLabel: 'Chờ bước tiếp theo', startWaiting: 'Bắt đầu chờ', stopWaiting: 'Dừng chờ', unknownIdle: 'Đã dừng. Bắt đầu để xem tiến độ không xác định.', unknownActive: 'Đang chờ. Nút Dừng chờ sẽ kết thúc trạng thái cục bộ này.', motion: 'Khi giảm chuyển động, thanh chờ đứng yên và văn bản vẫn thể hiện trạng thái.',
  },
} satisfies Record<Locale, Record<string, string>>;
type OperationState = 'idle' | 'running' | 'complete' | 'failed' | 'cancelled';
const states: readonly OperationState[] = ['idle', 'running', 'complete', 'failed', 'cancelled'];

export function ProgressSpecimen({ locale, motionOff = false }: { locale: Locale; motionOff?: boolean }) {
  const t = copy[locale];
  const id = useId();
  const [value, setValue] = useState(0);
  const [state, setState] = useState<OperationState>('idle');
  const [waiting, setWaiting] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const active = state === 'running';
  function start() { setValue(25); setState('running'); setAnnouncement(`${t.running} 25%.`); }
  function next() {
    if (!active) return;
    const nextValue = value < 70 ? 70 : 100;
    setValue(nextValue);
    setState(nextValue === 100 ? 'complete' : 'running');
    setAnnouncement(`${nextValue === 100 ? t.complete : t.running} ${nextValue}%.`);
  }
  return <section id="progress" className="ps-lab" lang={locale} data-motion={motionOff ? 'off' : undefined} aria-labelledby={`${id}-title`}>
    <header className="ps-heading"><span className="ps-eyebrow">{t.eyebrow}</span><h2 id={`${id}-title`}>{t.title}</h2><p>{t.intro}</p></header>
    <div className="ps-grid">
      <article className="ps-card"><h3>{t.manual}</h3><p className="ps-card-note">{t.manualHint}</p>
        <SystemProgress label={t.operation} value={value} tone={state === 'complete' ? 'success' : state === 'failed' ? 'error' : 'default'} locale={locale} />
        <div className="ps-status-stack">{states.map(item => <p key={item} data-active={item === state} aria-hidden={item !== state || undefined}>{t[item]}</p>)}</div>
        <div className="ps-actions">
          <button type="button" className="ps-button ps-primary" disabled={active} onClick={start}>{state === 'failed' || state === 'cancelled' || state === 'complete' ? t.retry : t.start}</button>
          <button type="button" className="ps-button" disabled={!active} onClick={next}>{t.next}</button>
          <button type="button" className="ps-button" disabled={!active} onClick={() => { setState('failed'); setAnnouncement(t.failed); }}>{t.error}</button>
          <button type="button" className="ps-button" disabled={!active} onClick={() => { setState('cancelled'); setAnnouncement(t.cancelled); }}>{t.cancel}</button>
        </div>
        <button type="button" className="ps-button ps-reset" disabled={state === 'idle'} onClick={() => { setState('idle'); setValue(0); setAnnouncement(t.idle); }}>{t.reset}</button>
      </article>
      <article className="ps-card"><h3>{t.unknown}</h3><p className="ps-card-note">{t.unknownHint}</p>
        <SystemProgress label={t.waitingLabel} value={waiting ? undefined : 0} indeterminate={waiting} valueText={waiting ? t.waiting : '0%'} locale={locale} />
        <div className="ps-status-stack"><p data-active={!waiting} aria-hidden={waiting || undefined}>{t.unknownIdle}</p><p data-active={waiting} aria-hidden={!waiting || undefined}>{t.unknownActive}</p></div>
        <div className="ps-actions"><button type="button" className="ps-button ps-primary" disabled={waiting} onClick={() => { setWaiting(true); setAnnouncement(t.unknownActive); }}>{t.startWaiting}</button><button type="button" className="ps-button" disabled={!waiting} onClick={() => { setWaiting(false); setAnnouncement(t.unknownIdle); }}>{t.stopWaiting}</button></div>
        <p className="ps-motion-note">{t.motion}</p>
      </article>
    </div>
    <span className="ps-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </section>;
}
