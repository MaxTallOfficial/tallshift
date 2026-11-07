'use client';

import { useId, useRef, useState } from 'react';
import { PressButton, type PressButtonAppearance } from './PressButton';
import { useInputModality } from './input-modality';
import styles from './Demo.module.css';

export interface DemoProps { locale?: 'ru' | 'en' | 'vi'; accent?: string; duration?: number; motion?: PressButtonAppearance['motion'] }
const copy = {
  ru: { help: 'Нажмите «Увеличить счётчик» — число ниже увеличится.', action: 'Увеличить счётчик', count: 'Нажатий в этом примере:', group: 'Состояние кнопки', ready: 'Доступна', pending: 'Выполняется — образец', disabled: 'Недоступна', pendingNote: 'Это образец состояния. Никакое действие не выполняется; повторное нажатие заблокировано.', disabledNote: 'В этом состоянии кнопка недоступна и не меняет счётчик.', link: 'Перейти к пояснению', linkNote: 'Эта кнопка — обычная ссылка. Она ведёт к пояснению ниже, а не увеличивает счётчик.', destination: 'Ссылка ведёт к этому пояснению. В своём проекте укажите нужный адрес в href.' },
  en: { help: 'Press “Increase counter” — the number below will increase.', action: 'Increase counter', count: 'Clicks in this example:', group: 'Button state', ready: 'Available', pending: 'In progress — sample', disabled: 'Unavailable', pendingNote: 'This is a state sample. No action is running; repeat activation is blocked.', disabledNote: 'In this state the button is unavailable and does not change the counter.', link: 'Go to explanation', linkNote: 'This button is a regular link. It goes to the explanation below instead of increasing the counter.', destination: 'The link leads to this explanation. In your project, set href to the address you need.' },
  vi: { help: 'Nhấn “Tăng bộ đếm” — số bên dưới sẽ tăng.', action: 'Tăng bộ đếm', count: 'Số lần nhấn trong ví dụ:', group: 'Trạng thái nút', ready: 'Có thể nhấn', pending: 'Đang xử lý — mẫu', disabled: 'Không khả dụng', pendingNote: 'Đây là trạng thái mẫu. Không có thao tác nào đang chạy; nút chặn việc nhấn lại.', disabledNote: 'Ở trạng thái này, nút không khả dụng và không thay đổi bộ đếm.', link: 'Đến phần giải thích', linkNote: 'Nút này là liên kết thông thường. Nút dẫn đến phần giải thích bên dưới, không tăng bộ đếm.', destination: 'Liên kết dẫn đến phần giải thích này. Trong dự án, đặt href thành địa chỉ bạn cần.' },
};

export function Demo({ locale = 'en', accent, duration = 160, motion = 'subtle' }: DemoProps) {
  const t = copy[locale];
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  useInputModality(root);
  const [count, setCount] = useState(0);
  const [state, setState] = useState<'ready' | 'pending' | 'disabled'>('ready');
  const appearance = { accent, duration, motion };
  const note = state === 'pending' ? t.pendingNote : state === 'disabled' ? t.disabledNote : t.help;
  return <div ref={root} className={styles.demo}>
    <div className={styles.scenarios} role="group" aria-label={t.group}>
      {(['ready', 'pending', 'disabled'] as const).map(value => <button key={value} type="button" aria-pressed={state === value} onClick={() => setState(value)}>{t[value]}</button>)}
    </div>
    <div className={styles.stage}>
      <p id={`${id}-help`} className={styles.help}>{note}</p>
      <PressButton {...appearance} label={t.action} pendingLabel={t.pending} pending={state === 'pending'} disabled={state === 'disabled'} aria-describedby={`${id}-help`} onClick={() => setCount(value => value + 1)} />
      <p className={styles.count} role="status" aria-live="polite" aria-atomic="true">{t.count} <strong>{count}</strong></p>
    </div>
    <div className={styles.linkExample}>
      <p>{t.linkNote}</p>
      <PressButton {...appearance} label={t.link} href={`#${id}-destination`} size="sm" onClick={event => {
        // A srcdoc preview can have a host <base>; keep this demo's fragment local.
        event.preventDefault();
        const destination = event.currentTarget.ownerDocument.getElementById(`${id}-destination`);
        destination?.focus({ preventScroll: true });
        destination?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }} />
      <p id={`${id}-destination`} tabIndex={-1} className={styles.destination}>{t.destination}</p>
    </div>
  </div>;
}
