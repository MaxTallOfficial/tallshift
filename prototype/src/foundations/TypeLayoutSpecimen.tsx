import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { layoutScale, radiusScale, spacingScale, typographyScale } from './system-scale';
import type { TypographyRole } from './system-scale';
import './type-layout-specimen.css';

type Locale = 'en' | 'ru' | 'vi';
type GridSize = 'desktop' | 'tablet' | 'mobile';

const text = {
  en: {
    typeTitle: 'Type scale',
    typeIntro: 'Manrope across English, Russian and Vietnamese. Size changes with the screen; the reading order stays clear.',
    desktopMobile: 'Desktop / mobile · px',
    weight: 'Weight', line: 'Line height', tracking: 'Tracking',
    typeRule: 'Display is for short product statements. Use one H1 per page; H2 and H3 describe its sections. Body text stays at 16 px on mobile.',
    viRule: 'Vietnamese headings use normal letter spacing. Accents and stacked marks keep their full height; text wraps without truncation.',
    roles: {
      display: 'Make it your own.',
      h1: 'A component, ready to adapt.',
      h2: 'See how it behaves.',
      h3: 'Code and setup, together.',
      body: 'Choose a component, try it, then copy the code. The prompt carries your settings so you can adapt it to your project.',
      ui: 'Copy code · Copy prompt · Download files',
      meta: 'State Relay · React + TypeScript',
    },
    languageTitle: 'The same task, three languages',
    languageIntro: 'Keep complete labels and natural line breaks. Longer Russian and Vietnamese copy should not force a smaller type size.',
    layoutTitle: 'Layout grid',
    layoutIntro: 'Twelve columns on desktop, eight on tablet and four on mobile. Align content first; use column spans to group it.',
    gridChoice: 'Reference layout width',
    illustration: 'Layout illustration. It is drawn to fit this panel; these buttons do not resize your browser.',
    columns: 'columns', margin: 'minimum margin', gutter: 'gutter',
    gridRule: 'Content stops growing at 1,240 px. Outer margins can grow beyond the minimum; gutters stay fixed within each breakpoint.',
    breakpoint: 'Viewport',
    spaceTitle: 'Spacing',
    spaceIntro: 'A 4 px base. Use 4–12 inside controls, 16–24 between related items and 32–64 between groups and sections.',
    radiusTitle: 'Corner radius',
    radiusIntro: 'Choose a radius by the role of the element. Nested panels do not need a larger radius at every level.',
    radii: { compact: 'Small labels and inline code', control: 'Buttons, fields and menus', card: 'Cards and component previews', panel: 'Large panels and workbenches' },
  },
  ru: {
    typeTitle: 'Типографическая шкала',
    typeIntro: 'Manrope для английского, русского и вьетнамского. Размер меняется с шириной экрана; порядок чтения остаётся понятным.',
    desktopMobile: 'Десктоп / мобильный · px',
    weight: 'Насыщенность', line: 'Интерлиньяж', tracking: 'Трекинг',
    typeRule: 'Display — для короткой фразы о продукте. На странице один H1; H2 и H3 описывают её разделы. Основной текст на мобильном остаётся 16 px.',
    viRule: 'У вьетнамских заголовков обычный межбуквенный интервал. Диакритика не обрезается, длинный текст переносится без многоточия.',
    roles: {
      display: 'Под свой проект.',
      h1: 'Компонент под вашу задачу.',
      h2: 'Проверьте в действии.',
      h3: 'Код и установка рядом.',
      body: 'Выберите компонент, проверьте его поведение и скопируйте код. Промпт сохранит настройки, чтобы адаптировать его под ваш проект.',
      ui: 'Скопировать код · Взять промпт · Скачать файлы',
      meta: 'State Relay · React + TypeScript',
    },
    languageTitle: 'Одна задача на трёх языках',
    languageIntro: 'Полные подписи и естественные переносы. Более длинный русский или вьетнамский текст не должен уменьшать размер шрифта.',
    layoutTitle: 'Сетка',
    layoutIntro: 'Двенадцать колонок на десктопе, восемь на планшете и четыре на мобильном. Контент выравнивается по колонкам и занимает нужное число пролётов.',
    gridChoice: 'Ширина сетки в иллюстрации',
    illustration: 'Иллюстрация сетки масштабируется в пределах панели. Кнопки не меняют размер окна браузера.',
    columns: 'колонок', margin: 'минимальное поле', gutter: 'межколонник',
    gridRule: 'Максимальная ширина контента — 1 240 px. Внешние поля могут расти сверх минимума; межколонники фиксированы внутри каждого диапазона.',
    breakpoint: 'Ширина окна',
    spaceTitle: 'Отступы',
    spaceIntro: 'База — 4 px. Внутри контролов используйте 4–12, между связанными элементами — 16–24, между группами и разделами — 32–64.',
    radiusTitle: 'Скругления',
    radiusIntro: 'Радиус зависит от назначения элемента. Вложенным панелям не нужно увеличивать скругление на каждом уровне.',
    radii: { compact: 'Малые подписи и код в строке', control: 'Кнопки, поля и меню', card: 'Карточки и превью компонентов', panel: 'Крупные панели и рабочие области' },
  },
  vi: {
    typeTitle: 'Thang cỡ chữ',
    typeIntro: 'Manrope cho tiếng Anh, tiếng Nga và tiếng Việt. Cỡ chữ thay đổi theo màn hình; thứ tự đọc vẫn rõ ràng.',
    desktopMobile: 'Máy tính / di động · px',
    weight: 'Độ đậm', line: 'Chiều cao dòng', tracking: 'Giãn chữ',
    typeRule: 'Display dành cho câu giới thiệu ngắn. Mỗi trang dùng một H1; H2 và H3 mô tả các phần. Chữ nội dung vẫn ở mức 16 px trên di động.',
    viRule: 'Tiêu đề tiếng Việt dùng khoảng cách chữ bình thường. Dấu được hiển thị đầy đủ; văn bản dài xuống dòng mà không bị cắt.',
    roles: {
      display: 'Chỉnh cho dự án của bạn.',
      h1: 'Thành phần, sẵn sàng tùy chỉnh.',
      h2: 'Xem cách hoạt động.',
      h3: 'Mã và hướng dẫn ở cùng chỗ.',
      body: 'Chọn một thành phần, dùng thử rồi sao chép mã. Prompt lưu các thiết lập để bạn điều chỉnh cho dự án của mình.',
      ui: 'Sao chép mã · Lấy prompt · Tải tệp',
      meta: 'State Relay · React + TypeScript',
    },
    languageTitle: 'Cùng một tác vụ, ba ngôn ngữ',
    languageIntro: 'Giữ nhãn đầy đủ và ngắt dòng tự nhiên. Văn bản tiếng Nga và tiếng Việt dài hơn không nên làm cỡ chữ nhỏ đi.',
    layoutTitle: 'Lưới bố cục',
    layoutIntro: 'Mười hai cột trên máy tính, tám cột trên máy tính bảng và bốn cột trên di động. Căn nội dung theo cột và nhóm bằng số cột phù hợp.',
    gridChoice: 'Chiều rộng tham chiếu của lưới',
    illustration: 'Đây là hình minh họa được thu vừa khung. Các nút này không thay đổi kích thước cửa sổ trình duyệt.',
    columns: 'cột', margin: 'lề tối thiểu', gutter: 'khoảng cách cột',
    gridRule: 'Nội dung có chiều rộng tối đa 1.240 px. Lề ngoài có thể lớn hơn mức tối thiểu; khoảng cách cột cố định trong từng khoảng màn hình.',
    breakpoint: 'Chiều rộng màn hình',
    spaceTitle: 'Khoảng cách',
    spaceIntro: 'Bước cơ sở là 4 px. Dùng 4–12 trong điều khiển, 16–24 giữa các mục liên quan và 32–64 giữa các nhóm và phần.',
    radiusTitle: 'Bo góc',
    radiusIntro: 'Chọn bán kính theo vai trò của phần tử. Khung lồng nhau không cần tăng độ bo ở mỗi cấp.',
    radii: { compact: 'Nhãn nhỏ và mã trong dòng', control: 'Nút, trường nhập và menu', card: 'Thẻ và bản xem trước thành phần', panel: 'Khung và vùng làm việc lớn' },
  },
} as const;

const languageSamples = [
  { locale: 'en', label: 'EN · English', heading: 'Code and settings, together.', body: 'Adapt the component to your project: keep your colors, typography and accessibility rules.' },
  { locale: 'ru', label: 'RU · Русский', heading: 'Код и настройки под рукой.', body: 'Подключите компонент к существующему проекту: используйте ваши цвета, шрифты и правила доступности.' },
  { locale: 'vi', label: 'VI · Tiếng Việt', heading: 'Mã và thiết lập luôn sẵn có.', body: 'Tùy chỉnh thành phần theo dự án: dùng màu sắc, phông chữ và các quy tắc hỗ trợ tiếp cận hiện có.' },
] as const;

function typeStyle(role: TypographyRole, locale: Locale): CSSProperties {
  const value = typographyScale[role];
  return {
    '--st-type-size': `${value.desktopSize}px`,
    '--st-type-mobile-size': `${value.mobileSize}px`,
    '--st-type-weight': value.weight,
    '--st-type-leading': value.lineHeight,
    '--st-type-tracking': `${locale === 'vi' ? value.viTrackingEm : value.trackingEm}em`,
  } as CSSProperties;
}

export function TypeLayoutSpecimen({ locale }: { locale: Locale }) {
  const t = text[locale];
  const id = useId();
  const [gridSize, setGridSize] = useState<GridSize>('desktop');
  const grid = layoutScale[gridSize];
  const diagramMargin = Math.max(grid.minimumMargin, (grid.referenceWidth - layoutScale.maxContentWidth) / 2);
  const columnCount = (count: number) => `${count} ${locale === 'ru' && count === 4 ? 'колонки' : t.columns}`;
  const roles = Object.keys(typographyScale) as TypographyRole[];
  return <div className="st-specimen" lang={locale}>
    <section className="st-section" id="system-type" aria-labelledby={`${id}-type`}>
      <header className="st-section-header"><span className="st-index">01</span><div><h2 id={`${id}-type`}>{t.typeTitle}</h2><p>{t.typeIntro}</p></div></header>
      <dl className="st-type-scale">
        {roles.map(role => {
          const value = typographyScale[role];
          const tracking = locale === 'vi' ? value.viTrackingEm : value.trackingEm;
          return <div className="st-type-row" key={role}>
            <dt className="st-type-details"><strong>{role === 'ui' ? 'UI' : role.toUpperCase()}</strong><span>{t.desktopMobile}</span><code>{value.desktopSize} / {value.mobileSize}</code><span>{t.weight} {value.weight} · {t.line} {value.lineHeight}</span><span>{t.tracking} {tracking} em</span></dt>
            <dd><p className={`st-type-example st-type-${role}`} style={typeStyle(role, locale)}>{t.roles[role]}</p></dd>
          </div>;
        })}
      </dl>
      <div className="st-type-notes"><p>{t.typeRule}</p><p>{t.viRule}</p></div>
      <div className="st-languages-header"><h3>{t.languageTitle}</h3><p>{t.languageIntro}</p></div>
      <div className="st-language-grid">{languageSamples.map(sample => <article className="st-language-card" lang={sample.locale} key={sample.locale}>
        <span>{sample.label}</span><h4 style={typeStyle('h3', sample.locale)}>{sample.heading}</h4><p style={typeStyle('body', sample.locale)}>{sample.body}</p>
      </article>)}</div>
    </section>

    <section className="st-section" id="system-grid" aria-labelledby={`${id}-grid`}>
      <header className="st-section-header"><span className="st-index">02</span><div><h2 id={`${id}-grid`}>{t.layoutTitle}</h2><p>{t.layoutIntro}</p></div></header>
      <div className="st-grid-specimen">
        <fieldset className="st-grid-choice"><legend>{t.gridChoice}</legend><div>{(['desktop', 'tablet', 'mobile'] as const).map(size => <button type="button" key={size} aria-pressed={gridSize === size} aria-controls={`${id}-grid-diagram`} onClick={() => setGridSize(size)}>{layoutScale[size].referenceWidth} px</button>)}</div></fieldset>
        <p className="st-grid-caption" id={`${id}-grid-note`}>{t.illustration}</p>
        <div className="st-grid-canvas" id={`${id}-grid-diagram`} aria-describedby={`${id}-grid-note`}>
          <div className="st-grid-stage" aria-hidden="true" style={{ width: `min(100%, ${grid.referenceWidth}px)`, gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`, gap: `min(${grid.gutter}px, ${grid.gutter / grid.referenceWidth * 100}cqw)`, paddingInline: `min(${diagramMargin}px, ${diagramMargin / grid.referenceWidth * 100}cqw)` }}>
            {Array.from({ length: grid.columns }, (_, index) => <span key={index}>{index + 1}</span>)}
          </div>
        </div>
        <p className="st-grid-current" aria-live="polite"><strong>{columnCount(grid.columns)}</strong><span>{grid.minimumMargin} px · {t.margin}</span><span>{grid.gutter} px · {t.gutter}</span></p>
        <div className="st-grid-reference">{(['desktop', 'tablet', 'mobile'] as const).map(size => {
          const item = layoutScale[size];
          const range = size === 'desktop' ? `≥ ${item.minViewportWidth} px` : size === 'tablet' ? `${item.minViewportWidth}–${layoutScale.desktop.minViewportWidth - 1} px` : `< ${layoutScale.tablet.minViewportWidth} px`;
          return <div data-current={gridSize === size} key={size}><span>{t.breakpoint}</span><strong>{range}</strong><p>{columnCount(item.columns)} · {item.minimumMargin} / {item.gutter} px</p></div>;
        })}</div>
        <p className="st-grid-rule">{t.gridRule}</p>
      </div>
    </section>

    <section className="st-section" id="system-spacing" aria-labelledby={`${id}-spacing`}>
      <header className="st-section-header"><span className="st-index">03</span><div><h2 id={`${id}-spacing`}>{t.spaceTitle}</h2><p>{t.spaceIntro}</p></div></header>
      <ul className="st-spacing-scale">{spacingScale.map(value => <li key={value}><code>{value}<span> px</span></code><div className="st-space-track"><span style={{ width: value }} aria-hidden="true" /></div></li>)}</ul>
      <div className="st-languages-header"><h3>{t.radiusTitle}</h3><p>{t.radiusIntro}</p></div>
      <ul className="st-radius-scale">{(Object.keys(radiusScale) as (keyof typeof radiusScale)[]).map(role => <li key={role}><div className="st-radius-shape" style={{ borderRadius: radiusScale[role] }} aria-hidden="true"><span>{radiusScale[role]}</span></div><code>{radiusScale[role]} px</code><p>{t.radii[role]}</p></li>)}</ul>
    </section>
  </div>;
}
