import { SystemDisclosureIcon } from './SystemDisclosureIcon';
import { useId, useState } from 'react';
import { SystemSelect } from './SystemSelect';
import { SystemSearchCombobox } from './SystemSearchCombobox';
import { SystemSegmentedControl } from './SystemSegmentedControl';
import type { Locale } from './copy';
import './control-audit-specimen.css';

const copy = {
  en: {
    title: 'Selection controls: edge states', intro: 'Open to check read-only values, unavailable options and long labels.',
    selection: 'Project target', unavailable: 'Unavailable in this example', long: 'React + TypeScript, with a long project target name',
    keys: 'Use ↑ / ↓ to move, Enter to choose and Escape to close. The unavailable option is skipped.',
    readonly: 'Read-only target', readonlyHint: 'Focus and read the value; selection is locked.',
    search: 'Read-only search', searchValue: 'State Relay', searchHint: 'The text can be selected and copied. There is no clear action.',
    clear: 'Clear search', suggestions: 'Suggestions', empty: 'No matches', placeholder: 'Search by name',
    unknown: 'Value absent from options', unknownHint: 'An unknown value displays a dash; it does not silently select the first option.',
    disabled: 'Disabled selection', segmented: 'Target unavailable', hint: 'An individually disabled segment remains visible and cannot be selected.',
  },
  ru: {
    title: 'Выбор значений: краевые состояния', intro: 'Откройте для проверки чтения без редактирования, недоступных пунктов и длинных названий.',
    selection: 'Среда проекта', unavailable: 'Недоступно в этом примере', long: 'React + TypeScript, с длинным названием среды проекта',
    keys: '↑ / ↓ — переход, Enter — выбор, Escape — закрытие. Недоступный пункт пропускается.',
    readonly: 'Среда только для чтения', readonlyHint: 'Значение доступно с клавиатуры, но выбор заблокирован.',
    search: 'Поиск только для чтения', searchValue: 'State Relay', searchHint: 'Текст можно выделить и скопировать. Кнопки очистки нет.',
    clear: 'Очистить поиск', suggestions: 'Подсказки', empty: 'Совпадений нет', placeholder: 'Найти по названию',
    unknown: 'Значение отсутствует в списке', unknownHint: 'Вместо неизвестного значения — тире. Первый пункт не выбирается автоматически.',
    disabled: 'Недоступный выбор', segmented: 'Недоступная среда', hint: 'Отдельный недоступный сегмент виден, но выбрать его нельзя.',
  },
  vi: {
    title: 'Điều khiển lựa chọn: trạng thái biên', intro: 'Mở để kiểm tra giá trị chỉ đọc, mục không khả dụng và nhãn dài.',
    selection: 'Môi trường dự án', unavailable: 'Không khả dụng trong ví dụ này', long: 'React + TypeScript, với tên môi trường dự án dài',
    keys: 'Dùng ↑ / ↓ để di chuyển, Enter để chọn, Escape để đóng. Bỏ qua mục không khả dụng.',
    readonly: 'Môi trường chỉ đọc', readonlyHint: 'Có thể đọc bằng bàn phím nhưng không thể thay đổi lựa chọn.',
    search: 'Tìm kiếm chỉ đọc', searchValue: 'State Relay', searchHint: 'Có thể chọn và sao chép văn bản. Không có nút xoá.',
    clear: 'Xoá tìm kiếm', suggestions: 'Gợi ý', empty: 'Không có kết quả', placeholder: 'Tìm theo tên',
    unknown: 'Giá trị không có trong danh sách', unknownHint: 'Hiển thị dấu gạch ngang cho giá trị lạ; không tự chọn mục đầu tiên.',
    disabled: 'Lựa chọn bị vô hiệu hoá', segmented: 'Môi trường không khả dụng', hint: 'Mục bị vô hiệu hoá vẫn hiển thị nhưng không thể chọn.',
  },
} satisfies Record<Locale, Record<string, string>>;
const noop = () => {};

/** Inspectable local edge states, separate from production readiness claims. */
export function ControlAuditSpecimen({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const id = useId();
  const [value, setValue] = useState('next');
  const [segment, setSegment] = useState('next');
  const options = [
    { value: 'next', label: 'Next.js' },
    { value: 'blocked', label: t.unavailable, disabled: true },
    { value: 'vite', label: 'Vite' },
    { value: 'long', label: t.long },
  ];
  return <section className="ca-lab" id="control-edge-states" lang={locale} aria-labelledby={`${id}-title`}>
    <details className="ca-details">
      <summary><SystemDisclosureIcon/><span id={`${id}-title`}>{t.title}</span><span className="ca-summary-note">{t.intro}</span></summary>
      <div className="ca-grid">
        <SystemSelect label={t.selection} value={value} options={options} onChange={setValue} hint={t.keys} />
        <SystemSelect label={t.readonly} value="next" options={options} onChange={noop} readOnly hint={t.readonlyHint} />
        <SystemSearchCombobox label={t.search} placeholder={t.placeholder} value={t.searchValue} onChange={noop} options={[]} clearLabel={t.clear} listLabel={t.suggestions} emptyText={t.empty} locale={locale} readOnly hint={t.searchHint} />
        <SystemSelect label={t.unknown} value="absent" options={options} onChange={noop} readOnly hint={t.unknownHint} />
        <SystemSelect label={t.disabled} value="next" options={options} onChange={noop} disabled />
        <SystemSegmentedControl label={t.segmented} value={segment} options={options.slice(0, 3)} onChange={setSegment} hint={t.hint} />
      </div>
    </details>
  </section>;
}
