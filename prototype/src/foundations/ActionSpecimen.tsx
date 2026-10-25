import { useId, useState } from 'react';
import { SystemButton } from './SystemButton';
import { SystemIconButton } from './SystemIconButton';
import { SystemIcon } from './SystemIcon';
import { SystemTabs } from './SystemTabs';
import type { Locale } from './copy';
import './action-specimen.css';

const copy = {
  en: { eyebrow: 'ACTIONS / SHARED COMPONENTS', title: 'One action. A clear next step.', intro: 'Consistent targets and padding, visible keyboard focus and labels that stay in place while an action is busy.', buttons: 'Action hierarchy', primary: 'Use this component', secondary: 'Read the guide', quiet: 'Reset example', destructive: 'Remove example', removed: 'Example removed. You can restore it.', restore: 'Restore example', normal: 'The example is available.', pending: 'Pending state', start: 'Start local action', finish: 'Finish action', waiting: 'Local action in progress. Choose Finish action to complete it.', idle: 'No network request. Start and finish this example manually.', complete: 'Local action complete.', unavailable: 'Download package', reason: 'Unavailable: this example has no downloadable package.', icons: 'Icon actions', favorite: 'Save example', replay: 'Replay example', replayed: 'Replay requested for this local example.', auto: 'Automatic activation', manual: 'Manual activation', autoHint: 'Arrow keys move focus and select a tab.', manualHint: 'Arrow keys move focus. Enter or Space selects the focused tab.', tabs: 'Component resources', preview: 'Preview', code: 'Code', prompt: 'Prompt', unavailableTab: 'Coming later', previewBody: 'Try the interaction before bringing it into your project.', codeBody: 'Get the component source, then follow its setup steps. This tab is a specimen; the working State Relay source is in the workbench.', promptBody: 'Give your coding assistant the component context, target framework and the changes you want.', vertical: 'Vertical tabs', sizes: 'Small / medium / large', sizeLabel: 'View details' },
  ru: { eyebrow: 'ДЕЙСТВИЯ / ОБЩИЕ КОМПОНЕНТЫ', title: 'Одно действие. Понятный следующий шаг.', intro: 'Одинаковые зоны нажатия и отступы, заметный фокус с клавиатуры и стабильная ширина кнопки во время ожидания.', buttons: 'Иерархия действий', primary: 'Взять компонент', secondary: 'Читать инструкцию', quiet: 'Сбросить пример', destructive: 'Удалить пример', removed: 'Пример удалён. Его можно восстановить.', restore: 'Восстановить пример', normal: 'Пример доступен.', pending: 'Состояние ожидания', start: 'Начать локальное действие', finish: 'Завершить действие', waiting: 'Локальное действие выполняется. Нажмите «Завершить действие».', idle: 'Без сетевого запроса. Запустите и завершите пример вручную.', complete: 'Локальное действие завершено.', unavailable: 'Скачать пакет', reason: 'Недоступно: у этого примера нет пакета для скачивания.', icons: 'Кнопки с иконкой', favorite: 'Сохранить пример', replay: 'Повторить пример', replayed: 'Запрошен повтор локального примера.', auto: 'Автоматическое переключение', manual: 'Переключение по подтверждению', autoHint: 'Стрелки перемещают фокус и открывают вкладку.', manualHint: 'Стрелки перемещают фокус. Enter или пробел открывает вкладку.', tabs: 'Материалы компонента', preview: 'Превью', code: 'Код', prompt: 'Промпт', unavailableTab: 'Позже', previewBody: 'Проверьте взаимодействие до того, как добавите его в проект.', codeBody: 'Возьмите исходник компонента и выполните шаги установки. Здесь показан образец вкладки; рабочий код State Relay доступен в рабочей области.', promptBody: 'Передайте ассистенту контекст компонента, целевой фреймворк и желаемые изменения.', vertical: 'Вертикальные вкладки', sizes: 'Маленькая / средняя / большая', sizeLabel: 'Подробнее' },
  vi: { eyebrow: 'THAO TÁC / THÀNH PHẦN DÙNG CHUNG', title: 'Một thao tác. Bước tiếp theo rõ ràng.', intro: 'Vùng nhấn và khoảng đệm nhất quán, tiêu điểm bàn phím dễ thấy, nhãn không làm nút đổi kích thước khi đang xử lý.', buttons: 'Thứ bậc thao tác', primary: 'Dùng thành phần này', secondary: 'Đọc hướng dẫn', quiet: 'Đặt lại ví dụ', destructive: 'Xoá ví dụ', removed: 'Đã xoá ví dụ. Bạn có thể khôi phục.', restore: 'Khôi phục ví dụ', normal: 'Ví dụ đang có sẵn.', pending: 'Trạng thái chờ', start: 'Bắt đầu thao tác cục bộ', finish: 'Hoàn tất thao tác', waiting: 'Thao tác cục bộ đang chạy. Chọn Hoàn tất thao tác để kết thúc.', idle: 'Không gửi yêu cầu mạng. Bắt đầu và kết thúc ví dụ này bằng tay.', complete: 'Đã hoàn tất thao tác cục bộ.', unavailable: 'Tải gói', reason: 'Chưa khả dụng: ví dụ này không có gói để tải xuống.', icons: 'Thao tác bằng biểu tượng', favorite: 'Lưu ví dụ', replay: 'Phát lại ví dụ', replayed: 'Đã yêu cầu phát lại ví dụ cục bộ.', auto: 'Kích hoạt tự động', manual: 'Kích hoạt thủ công', autoHint: 'Phím mũi tên chuyển tiêu điểm và chọn thẻ.', manualHint: 'Phím mũi tên chuyển tiêu điểm. Enter hoặc Space chọn thẻ đang có tiêu điểm.', tabs: 'Tài nguyên thành phần', preview: 'Xem trước', code: 'Mã nguồn', prompt: 'Prompt', unavailableTab: 'Sắp có', previewBody: 'Thử tương tác trước khi đưa vào dự án.', codeBody: 'Lấy mã nguồn thành phần rồi làm theo các bước cài đặt. Đây là thẻ mẫu; mã State Relay hoạt động nằm trong khu vực làm việc.', promptBody: 'Cung cấp ngữ cảnh thành phần, framework và thay đổi mong muốn cho trợ lý lập trình.', vertical: 'Thẻ dọc', sizes: 'Nhỏ / vừa / lớn', sizeLabel: 'Xem chi tiết' },
} satisfies Record<Locale, Record<string, string>>;

export function ActionSpecimen({ locale, motionOff = false }: { locale: Locale; motionOff?: boolean }) {
  const id = useId();
  const t = copy[locale];
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [saved, setSaved] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [autoTab, setAutoTab] = useState('preview');
  const [manualTab, setManualTab] = useState('preview');
  const [verticalTab, setVerticalTab] = useState('preview');
  const options = [
    { value: 'preview', label: t.preview, content: <p>{t.previewBody}</p> },
    { value: 'code', label: t.code, content: <p>{t.codeBody}</p> },
    { value: 'prompt', label: t.prompt, content: <p>{t.promptBody}</p> },
    { value: 'unavailable', label: t.unavailableTab, disabled: true, content: null },
  ];
  return <section id="actions" className="act-lab" lang={locale} data-motion={motionOff ? 'off' : undefined} aria-labelledby={`${id}-heading`}>
    <header className="act-heading"><span>{t.eyebrow}</span><h2 id={`${id}-heading`}>{t.title}</h2><p>{t.intro}</p></header>
    <div className="act-grid">
      <article className="act-card"><h3>{t.buttons}</h3><div className="act-row">
        <SystemButton variant="primary" leadingIcon={<SystemIcon name="plus" />} onClick={() => document.getElementById('workbench')?.scrollIntoView({ behavior: 'instant' })}>{t.primary}</SystemButton>
        <SystemButton onClick={() => document.getElementById('handoff')?.scrollIntoView({ behavior: 'instant' })}>{t.secondary}</SystemButton>
        <SystemButton variant="quiet" onClick={() => { setRemoved(false); setSaved(false); setReplayed(false); setBusy(false); setCompleted(false); }}>{t.quiet}</SystemButton>
        <SystemButton variant={removed ? 'secondary' : 'destructive'} onClick={() => setRemoved(!removed)}>{removed ? t.restore : t.destructive}</SystemButton>
      </div><p className="act-note" role="status">{removed ? t.removed : t.normal}</p><h4>{t.sizes}</h4><div className="act-row">{(['small', 'medium', 'large'] as const).map(size => <SystemButton key={size} size={size} onClick={() => document.getElementById('workbench')?.scrollIntoView({ behavior: 'instant' })}>{t.sizeLabel}</SystemButton>)}</div></article>
      <article className="act-card"><h3>{t.pending}</h3><div className="act-row"><SystemButton variant="primary" loading={busy} onClick={() => { setBusy(true); setCompleted(false); }}>{t.start}</SystemButton><SystemButton disabled={!busy} onClick={() => { setBusy(false); setCompleted(true); }}>{t.finish}</SystemButton></div><p className="act-note" role="status">{busy ? t.waiting : completed ? t.complete : t.idle}</p><SystemButton disabled aria-describedby={`${id}-unavailable`}>{t.unavailable}</SystemButton><p className="act-note" id={`${id}-unavailable`}>{t.reason}</p><h4>{t.icons}</h4><div className="act-row"><SystemIconButton icon="plus" label={t.favorite} aria-pressed={saved} onClick={() => setSaved(!saved)} /><SystemIconButton icon="replay" label={t.replay} onClick={() => setReplayed(true)} /></div><p className="act-note" role="status">{replayed ? t.replayed : '\u00a0'}</p></article>
      <article className="act-card"><h3>{t.auto}</h3><p className="act-note">{t.autoHint}</p><SystemTabs label={`${t.tabs}: ${t.auto}`} value={autoTab} onChange={setAutoTab} options={options} /></article>
      <article className="act-card"><h3>{t.manual}</h3><p className="act-note">{t.manualHint}</p><SystemTabs activation="manual" label={`${t.tabs}: ${t.manual}`} value={manualTab} onChange={setManualTab} options={options} /></article>
      <article className="act-card act-wide"><h3>{t.vertical}</h3><SystemTabs orientation="vertical" activation="manual" label={`${t.tabs}: ${t.vertical}`} value={verticalTab} onChange={setVerticalTab} options={options} /></article>
    </div>
  </section>;
}
