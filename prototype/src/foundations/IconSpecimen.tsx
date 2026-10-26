import { SystemDisclosureIcon } from './SystemDisclosureIcon';
import { useId, useState } from 'react';
import { SystemIcon, systemIconNames } from './SystemIcon';
import { SystemSegmentedControl } from './SystemSegmentedControl';
import './icon-specimen.css';

type Locale = 'en' | 'ru' | 'vi';
type IconSize = '16' | '20' | '24';
type Alignment = 'start' | 'center' | 'end';
type Layout = 'stack' | 'split' | 'window';

const copy = {
  en: {
    title: 'Icons & single-choice controls',
    intro: 'Hugeicons Duotone Rounded at three sizes. Native radio groups keep selection and keyboard focus distinct.',
    inventory: 'Icon inventory', size: 'Icon size', icons: 'icons',
    states: 'Try the control states', normal: 'Alignment', start: 'Start', center: 'Center', end: 'End',
    disabled: 'Disabled group', disabledNote: 'This group is a disabled-state specimen.',
    vertical: 'Long labels · vertical', layout: 'Preview arrangement',
    stack: 'Show the preview above the source code', split: 'Place the preview beside the source code',
    window: 'Open the preview in a separate window', unavailable: 'A separate window is unavailable in this specimen.',
    preview: 'Preview', code: 'Code', selected: 'Selected',
  },
  ru: {
    title: 'Иконки и выбор одной настройки',
    intro: 'Hugeicons Duotone Rounded в трёх размерах. Нативные radio сохраняют различие между выбором и фокусом клавиатуры.',
    inventory: 'Набор иконок', size: 'Размер иконок', icons: 'иконок',
    states: 'Проверить состояния переключателей', normal: 'Выравнивание', start: 'По левому краю', center: 'По центру', end: 'По правому краю',
    disabled: 'Недоступная группа', disabledNote: 'Эта группа показывает недоступное состояние.',
    vertical: 'Длинные подписи · вертикально', layout: 'Расположение превью',
    stack: 'Показать превью над исходным кодом', split: 'Разместить превью рядом с исходным кодом',
    window: 'Открыть превью в отдельном окне', unavailable: 'Отдельное окно недоступно в этом образце.',
    preview: 'Превью', code: 'Код', selected: 'Выбрано',
  },
  vi: {
    title: 'Biểu tượng và lựa chọn đơn',
    intro: 'Hugeicons Duotone Rounded ở ba kích thước. Nhóm radio gốc phân biệt lựa chọn hiện tại với tiêu điểm bàn phím.',
    inventory: 'Bộ biểu tượng', size: 'Kích thước biểu tượng', icons: 'biểu tượng',
    states: 'Thử các trạng thái điều khiển', normal: 'Căn chỉnh', start: 'Căn đầu', center: 'Căn giữa', end: 'Căn cuối',
    disabled: 'Nhóm bị vô hiệu hóa', disabledNote: 'Nhóm này minh họa trạng thái bị vô hiệu hóa.',
    vertical: 'Nhãn dài · xếp dọc', layout: 'Bố cục xem trước',
    stack: 'Hiển thị bản xem trước phía trên mã nguồn', split: 'Đặt bản xem trước bên cạnh mã nguồn',
    window: 'Mở bản xem trước trong một cửa sổ riêng', unavailable: 'Cửa sổ riêng không khả dụng trong mẫu này.',
    preview: 'Xem trước', code: 'Mã nguồn', selected: 'Đã chọn',
  },
} as const;

/** Optical inventory and live setting specimens; no product route or export state. */
export function IconSpecimen({ locale }: { locale: Locale }) {
  const id = useId();
  const t = copy[locale];
  const [size, setSize] = useState<IconSize>('24');
  const [alignment, setAlignment] = useState<Alignment>('start');
  const [layout, setLayout] = useState<Layout>('stack');
  const alignments = (['start', 'center', 'end'] as const).map(value => ({ value, label: t[value] }));
  const layouts = (['stack', 'split', 'window'] as const).map(value => ({ value, label: t[value], disabled: value === 'window' }));
  return <section id="icons" className="icon-specimen" aria-labelledby={`${id}-title`}>
    <header className="icon-specimen-heading">
      <span className="icon-specimen-kicker">SYSTEM / 03 + 16</span>
      <h2 id={`${id}-title`}>{t.title}</h2>
      <p>{t.intro}</p>
    </header>
    <details className="icon-specimen-details" open>
      <summary><SystemDisclosureIcon/><span>{t.inventory}<small>{systemIconNames.length} {t.icons} · 16 / 20 / 24 px</small></span></summary>
      <div className="icon-specimen-content">
        <div className="icon-specimen-size">
          <SystemSegmentedControl<IconSize> label={t.size} value={size} onChange={setSize} options={(['16', '20', '24'] as const).map(value => ({ value, label: `${value} px` }))} />
        </div>
        <ul className="icon-specimen-grid">
          {systemIconNames.map(name => <li key={name}>
            <span className="icon-specimen-slot"><SystemIcon name={name} size={Number(size) as 16 | 20 | 24} /></span>
            <code>{name}</code>
          </li>)}
        </ul>
      </div>
    </details>
    <details className="icon-specimen-details">
      <summary><SystemDisclosureIcon/><span>{t.states}</span></summary>
      <div className="icon-specimen-state-grid">
        <div className="icon-specimen-state">
          <SystemSegmentedControl<Alignment> label={t.normal} value={alignment} options={alignments} onChange={setAlignment} />
          <div className="icon-specimen-alignment" data-alignment={alignment} aria-hidden="true"><i /><i /><i /></div>
          <p className="icon-specimen-note">{t.selected}: <strong>{t[alignment]}</strong></p>
          <SystemSegmentedControl<Alignment> label={t.disabled} value="center" options={alignments} onChange={() => {}} disabled />
          <p className="icon-specimen-note">{t.disabledNote}</p>
        </div>
        <div className="icon-specimen-state">
          <h3>{t.vertical}</h3>
          <SystemSegmentedControl<Layout> label={t.layout} value={layout} options={layouts} onChange={setLayout} orientation="vertical" />
          <p className="icon-specimen-note">{t.unavailable}</p>
          <div className="icon-specimen-arrangement" data-layout={layout} aria-hidden="true"><span>{t.preview}</span><span>{t.code}</span></div>
        </div>
      </div>
    </details>
  </section>;
}
