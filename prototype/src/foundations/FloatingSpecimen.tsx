import { useState } from 'react';
import { SystemButton } from './SystemButton';
import { SystemIconButton } from './SystemIconButton';
import { SystemMenu } from './SystemMenu';
import { SystemPopover } from './SystemPopover';
import { SystemTooltip } from './SystemTooltip';
import './floating-specimen.css';
const words = {
  en: { title: 'Keep the work in view.', intro: 'Quick actions and file details stay close to the control that opened them.', menu: 'File actions', copy: 'Select source file', rename: 'Rename', unavailable: 'Unavailable in this preview', remove: 'Remove from selection', info: 'Package details', close: 'Close details', body: 'One React component, its styles and an adaptation prompt. Nothing is sent to a server.', help: 'About package details', tip: 'Open package details without leaving the preview.', notice: 'Current selection:', cleared: 'No file selected', note: 'Keyboard: open actions with ↑ or ↓; move with arrows, Home and End. Escape returns to the trigger. Tab leaves the popover freely.' },
  ru: { title: 'Всё нужное — рядом с работой.', intro: 'Действия и сведения о файле открываются рядом с элементом, который их вызвал.', menu: 'Действия с файлом', copy: 'Выбрать файл исходника', rename: 'Переименовать', unavailable: 'Недоступно в превью', remove: 'Убрать из подборки', info: 'Состав пакета', close: 'Закрыть сведения', body: 'React-компонент, его стили и промпт для адаптации. На сервер ничего не отправляется.', help: 'О составе пакета', tip: 'Состав пакета можно посмотреть, не покидая превью.', notice: 'Выбранный файл:', cleared: 'Файл не выбран', note: 'Клавиатура: ↑ или ↓ открывают меню; стрелки, Home и End перемещают фокус. Escape возвращает к кнопке. Tab свободно выходит из окна сведений.' },
  vi: { title: 'Mọi thứ ở ngay nơi bạn làm việc.', intro: 'Thao tác nhanh và chi tiết tệp xuất hiện cạnh nút vừa mở chúng.', menu: 'Thao tác với tệp', copy: 'Chọn tệp mã nguồn', rename: 'Đổi tên', unavailable: 'Chưa có trong bản xem trước', remove: 'Xóa khỏi bộ sưu tập', info: 'Nội dung gói', close: 'Đóng chi tiết', body: 'Một thành phần React, kiểu dáng và câu lệnh để điều chỉnh. Không gửi dữ liệu lên máy chủ.', help: 'Về nội dung gói', tip: 'Xem nội dung gói mà không rời bản xem trước.', notice: 'Tệp đang chọn:', cleared: 'Chưa chọn tệp', note: 'Bàn phím: ↑ hoặc ↓ mở menu; phím mũi tên, Home và End di chuyển. Escape trở lại nút mở. Tab rời cửa sổ chi tiết tự do.' },
};
export function FloatingSpecimen({ locale }: { locale: keyof typeof words }) {
  const t = words[locale], [selectedFile, setSelectedFile] = useState<string | null>('AfterlightExample.tsx');
  return <section className="floating-specimen" id="floating" aria-labelledby="floating-title"><header><p className="sy-eyebrow">20 · 21 · 22 / Floating surfaces</p><h2 id="floating-title">{t.title}</h2><p>{t.intro}</p></header><div className="floating-specimen-actions">
    <SystemMenu label={t.menu} align="start" trigger={props => <SystemButton {...props}>{t.menu}</SystemButton>} items={[{ id: 'copy', label: t.copy, onSelect: () => setSelectedFile('AfterlightExample.tsx') }, { id: 'rename', label: <span className="system-menu-item-label">{t.rename}<small>{t.unavailable}</small></span>, disabled: true, onSelect: () => {} }, { id: 'remove', label: t.remove, destructive: true, onSelect: () => setSelectedFile(null) }]} />
    <SystemPopover title={t.info} closeLabel={t.close} trigger={props => <SystemButton {...props}>{t.info}</SystemButton>}><p>{t.body}</p></SystemPopover>
    <SystemTooltip content={t.tip} trigger={props => <SystemIconButton {...props} density="inline" icon="info" label={t.help} variant="quiet" />} />
  </div><p className="floating-specimen-note">{t.note}</p><p className="floating-specimen-status" role="status">{t.notice} <strong>{selectedFile ?? t.cleared}</strong></p></section>;
}
