const en = {
 reviewMotion: 'Correct duration',
 appliedHelp: 'Code and ZIP use the applied settings.',
 blocked: 'Apply or discard the color change and correct any invalid duration before copying or downloading.',
 instructions: 'Instructions', close: 'Close instructions', guideTitle: 'Add State Relay to your project',
 steps: ['Choose Next.js or Vite and apply your settings.', 'Download the ZIP and keep the source files together. Follow the installation guide below.', 'Import SelectedExample into your page. In Next.js, keep the client boundary supplied with the example.', 'Try loading, success, failure and retry. Check keyboard access and reduced motion in your project.'],
 mode: 'Adaptation prompt', preserve: 'Keep the design', adapt: 'Adapt to my project',
 modeHelp: 'Copy this prompt into your coding assistant. Tallshift does not send it to an AI service.',
 includeContext: 'Add project context', contextHelp: 'Optional. Included in the prompt and ZIP only while enabled; kept in this page’s memory.',
};
type Copy = { [K in keyof typeof en]: typeof en[K] extends string[] ? string[] : string };
const ru: Copy = {
 reviewMotion: 'Исправить длительность',
 appliedHelp: 'Код и ZIP используют применённые настройки.',
 blocked: 'Примените или отмените изменение цвета и исправьте неверную длительность перед копированием или скачиванием.',
 instructions: 'Инструкция', close: 'Закрыть инструкцию', guideTitle: 'Добавьте State Relay в свой проект',
 steps: ['Выберите Next.js или Vite и примените настройки.', 'Скачайте ZIP и сохраните структуру исходных файлов. Следуйте инструкции установки ниже.', 'Импортируйте SelectedExample на страницу. В Next.js сохраните клиентскую границу из примера.', 'Проверьте загрузку, успех, ошибку и повтор. Проверьте управление клавиатурой и уменьшение движения в своём проекте.'],
 mode: 'Промпт адаптации', preserve: 'Сохранить дизайн', adapt: 'Адаптировать под проект',
 modeHelp: 'Скопируйте промпт в своего AI-помощника. Tallshift не отправляет его в AI-сервис.',
 includeContext: 'Добавить контекст проекта', contextHelp: 'Необязательно. Включается в промпт и ZIP только пока включена эта настройка; хранится в памяти страницы.',
};
const vi: Copy = {
 reviewMotion: 'Sửa thời lượng',
 appliedHelp: 'Mã và ZIP dùng cài đặt đã áp dụng.',
 blocked: 'Áp dụng hoặc bỏ thay đổi màu và sửa thời lượng không hợp lệ trước khi sao chép hoặc tải xuống.',
 instructions: 'Hướng dẫn', close: 'Đóng hướng dẫn', guideTitle: 'Thêm State Relay vào dự án',
 steps: ['Chọn Next.js hoặc Vite và áp dụng cài đặt.', 'Tải ZIP và giữ nguyên cấu trúc tệp nguồn. Làm theo hướng dẫn cài đặt bên dưới.', 'Import SelectedExample vào trang. Với Next.js, giữ ranh giới client có trong ví dụ.', 'Kiểm tra tải, thành công, lỗi và thử lại. Kiểm tra bàn phím và chế độ giảm chuyển động trong dự án.'],
 mode: 'Câu lệnh tùy chỉnh', preserve: 'Giữ nguyên thiết kế', adapt: 'Điều chỉnh cho dự án',
 modeHelp: 'Sao chép câu lệnh vào trợ lý lập trình. Tallshift không gửi câu lệnh đến dịch vụ AI.',
 includeContext: 'Thêm ngữ cảnh dự án', contextHelp: 'Không bắt buộc. Chỉ đưa vào câu lệnh và ZIP khi bật; lưu trong bộ nhớ trang.',
};
export const workbenchCopy = { en, ru, vi };
