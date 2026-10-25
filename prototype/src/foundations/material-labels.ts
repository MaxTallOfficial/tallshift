import type { Locale } from './copy';

/** UI labels keyed by canonical catalog ID. IDs stay in data and are never a display fallback. */
export const materialLabels: Readonly<Record<string, Readonly<Record<Locale,string>>>> = Object.freeze({
  "S001": {
    "en": "Starter Split Hero",
    "ru": "Первый экран в две колонки",
    "vi": "Phần mở đầu hai cột"
  },
  "S002": {
    "en": "Starter Feature Grid",
    "ru": "Сетка преимуществ",
    "vi": "Lưới tính năng"
  },
  "S003": {
    "en": "Starter Action Band",
    "ru": "Призыв к действию",
    "vi": "Khối kêu gọi hành động"
  },
  "S004": {
    "en": "Product Demo Hero",
    "ru": "Первый экран с интерактивным демо",
    "vi": "Phần mở đầu với demo tương tác"
  },
  "S005": {
    "en": "Product Feature Steps",
    "ru": "Возможности продукта по шагам",
    "vi": "Giới thiệu tính năng từng bước"
  },
  "S006": {
    "en": "Product Pricing Compare",
    "ru": "Сравнение тарифов",
    "vi": "So sánh gói dịch vụ"
  },
  "S007": {
    "en": "Editorial Title Hero",
    "ru": "Типографический первый экран",
    "vi": "Phần mở đầu tập trung vào chữ"
  },
  "S008": {
    "en": "Editorial Project Index",
    "ru": "Список проектов",
    "vi": "Danh sách dự án"
  },
  "S009": {
    "en": "Editorial Contact Footer",
    "ru": "Контакты внизу страницы",
    "vi": "Phần liên hệ cuối trang"
  },
  "S010": {
    "en": "Playful Sticker Hero",
    "ru": "Первый экран со стикерами",
    "vi": "Phần mở đầu với nhãn dán"
  },
  "S011": {
    "en": "Playful Question Cards",
    "ru": "Карточки вопросов и ответов",
    "vi": "Thẻ câu hỏi thường gặp"
  },
  "S012": {
    "en": "Playful Orbit CTA",
    "ru": "Призыв к действию с орбитальной графикой",
    "vi": "Khối kêu gọi hành động với đồ họa quỹ đạo"
  },
  "C001": {
    "en": "Press Button",
    "ru": "Кнопка с откликом",
    "vi": "Nút có phản hồi"
  },
  "C002": {
    "en": "Content Tabs",
    "ru": "Контентные вкладки",
    "vi": "Thẻ nội dung"
  },
  "C003": {
    "en": "Segmented Navigation",
    "ru": "Навигация с переключением разделов",
    "vi": "Điều hướng theo nhóm"
  },
  "C004": {
    "en": "Metric Switcher",
    "ru": "Переключатель показателей",
    "vi": "Bộ chuyển chỉ số"
  },
  "C005": {
    "en": "Project Card",
    "ru": "Карточка проекта",
    "vi": "Thẻ dự án"
  },
  "C006": {
    "en": "Media Gallery",
    "ru": "Галерея с просмотром",
    "vi": "Thư viện ảnh có xem trước"
  },
  "C007": {
    "en": "Magnetic Button",
    "ru": "Кнопка с магнитным откликом",
    "vi": "Nút tương tác theo con trỏ"
  },
  "C008": {
    "en": "Testimonial Switcher",
    "ru": "Переключатель отзывов",
    "vi": "Bộ chuyển lời nhận xét"
  },
  "E001": {
    "en": "Content Reveal",
    "ru": "Появление контента",
    "vi": "Hiện nội dung"
  },
  "E002": {
    "en": "Stagger Group",
    "ru": "Появление элементов по очереди",
    "vi": "Hiện lần lượt các phần tử"
  },
  "E003": {
    "en": "Soft Mesh Background",
    "ru": "Мягкий градиентный фон",
    "vi": "Nền chuyển màu mềm"
  },
  "E004": {
    "en": "Pointer Spotlight",
    "ru": "Локальная подсветка",
    "vi": "Làm nổi bật theo con trỏ"
  },
  "A001": {
    "en": "State Relay",
    "ru": "Отклик состояний",
    "vi": "Phản hồi trạng thái"
  },
  "A002": {
    "en": "Context Bridge",
    "ru": "Связанный переход контента",
    "vi": "Chuyển nội dung liền mạch"
  },
  "A003": {
    "en": "Line Assemble",
    "ru": "Появление заголовка по строкам",
    "vi": "Hiện tiêu đề theo dòng"
  },
  "A004": {
    "en": "Focus Plane",
    "ru": "Переход от миниатюры к подробному просмотру",
    "vi": "Chuyển từ ảnh nhỏ sang chi tiết"
  },
  "A005": {
    "en": "Edge Unfold",
    "ru": "Раскрытие контента от края",
    "vi": "Mở nội dung từ mép"
  },
  "A006": {
    "en": "Ledger Reflow",
    "ru": "Перестроение списка",
    "vi": "Sắp xếp lại danh sách"
  },
  "A007": {
    "en": "Scroll Chapters",
    "ru": "Индикатор глав при прокрутке",
    "vi": "Tiến trình chương khi cuộn"
  },
  "A008": {
    "en": "Metric Roll",
    "ru": "Плавная смена чисел",
    "vi": "Chuyển số mượt mà"
  }
});

export function collectionMembers(ids: readonly string[], locale: Locale) {
  return ids.map(id => { const entry = Object.hasOwn(materialLabels,id) ? materialLabels[id] : undefined; if (!entry) throw new Error(`Missing material label: ${id}`); return {id,label:entry[locale]}; });
}
