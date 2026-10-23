import type { DiscoveryLocale } from './discovery-copy';

export type DiscoveryCategory = 'animation' | 'component' | 'section' | 'effect';
export type DiscoveryPreview = 'relay' | 'lines' | 'bridge' | 'hero' | 'button' | 'spotlight';
export interface DiscoveryMaterial {
  id: string;
  name: string;
  category: DiscoveryCategory;
  access: 'free' | 'pro';
  available: boolean;
  preview: DiscoveryPreview;
  pitch: Record<DiscoveryLocale, string>;
  description: Record<DiscoveryLocale, string>;
  aliases: readonly string[];
}

/**
 * Six presentation samples from docs/spec-v1.0/catalog.json.
 * A001 is local_prototype_verified; every other record is not_started.
 * These are deliberately not a publication manifest or an available product feed.
 * A001's MIT source license is defined by src/study/recipe.ts and its exported LICENSE.txt.
 */
export const discoveryMaterials: readonly DiscoveryMaterial[] = [
  {
    id: 'A001', name: 'State Relay', category: 'animation', access: 'free', available: true, preview: 'relay',
    pitch: {
      en: 'Make every click feel answered.',
      ru: 'Покажите результат каждого нажатия.',
      vi: 'Mỗi lần nhấn đều có phản hồi.',
    },
    description: {
      en: 'Ready, pending, success and retry — one complete interaction, with source and an adaptation prompt.',
      ru: 'Готовность, выполнение, успех и повтор — одно законченное взаимодействие, с кодом и промптом для адаптации.',
      vi: 'Sẵn sàng, đang xử lý, thành công và thử lại — một tương tác hoàn chỉnh, kèm mã nguồn và prompt tùy chỉnh.',
    },
    aliases: ['Отклик состояний', 'copy', 'button', 'clipboard', 'кнопка', 'копирование', 'sao chép', 'nút'],
  },
  {
    id: 'A003', name: 'Line Assemble', category: 'animation', access: 'free', available: false, preview: 'lines',
    pitch: {
      en: 'Give your headline an entrance.',
      ru: 'Начните с заголовка, который замечают.',
      vi: 'Để tiêu đề thu hút ánh nhìn.',
    },
    description: {
      en: 'Bring your message forward, one line at a time. Keep the rest of the page ready to use.',
      ru: 'Выведите главное по строкам, сохранив остальную страницу доступной для действий.',
      vi: 'Làm nổi bật thông điệp qua từng dòng, trong khi phần còn lại của trang vẫn có thể sử dụng.',
    },
    aliases: ['Сборка строк заголовка', 'text', 'typography', 'текст', 'типографика', 'chữ'],
  },
  {
    id: 'S001', name: 'Starter Split Hero', category: 'section', access: 'free', available: false, preview: 'hero',
    pitch: {
      en: 'Put your product’s best case first.',
      ru: 'Покажите главное с первого экрана.',
      vi: 'Đặt giá trị sản phẩm lên đầu trang.',
    },
    description: {
      en: 'Lead with a clear message and one focused next step. Adapt the two-column layout to your launch.',
      ru: 'Начните с ценности продукта и понятного следующего шага. Адаптируйте двухколоночный экран под свой запуск.',
      vi: 'Bắt đầu bằng giá trị sản phẩm và một bước tiếp theo rõ ràng. Tùy chỉnh bố cục hai cột cho lần ra mắt của bạn.',
    },
    aliases: ['Стартовый hero с двумя колонками', 'landing', 'лендинг', 'trang đích'],
  },
  {
    id: 'C001', name: 'Press Button', category: 'component', access: 'free', available: false, preview: 'button',
    pitch: {
      en: 'Make the next click inviting.',
      ru: 'Сделайте следующий шаг заметным.',
      vi: 'Làm nổi bật bước tiếp theo.',
    },
    description: {
      en: 'Give your primary action a precise response to hover, focus and press.',
      ru: 'Добавьте главному действию точный отклик на наведение, фокус и нажатие.',
      vi: 'Tạo phản hồi rõ cho thao tác chính khi di chuột, nhận tiêu điểm và nhấn.',
    },
    aliases: ['Кнопка с откликом', 'action', 'действие', 'nút'],
  },
  {
    id: 'A002', name: 'Context Bridge', category: 'animation', access: 'pro', available: false, preview: 'bridge',
    pitch: {
      en: 'Keep the story moving between views.',
      ru: 'Сохраните контекст при смене экрана.',
      vi: 'Giữ mạch trải nghiệm khi đổi chế độ xem.',
    },
    description: {
      en: 'Connect the old and new view in one frame, so users can follow what changed.',
      ru: 'Свяжите два состояния в одной области, чтобы человек видел, что именно изменилось.',
      vi: 'Kết nối chế độ xem cũ và mới trong cùng một khung để người dùng theo dõi thay đổi.',
    },
    aliases: ['Связанный переход контента', 'transition', 'переход', 'chuyển cảnh'],
  },
  {
    id: 'E004', name: 'Pointer Spotlight', category: 'effect', access: 'pro', available: false, preview: 'spotlight',
    pitch: {
      en: 'Let the details catch the eye.',
      ru: 'Привлеките внимание к деталям.',
      vi: 'Để chi tiết thu hút ánh nhìn.',
    },
    description: {
      en: 'Guide a local highlight with the pointer and give a key surface a moment of focus.',
      ru: 'Подсветите важную область вслед за указателем и направьте внимание к нужной детали.',
      vi: 'Đưa vùng sáng theo con trỏ để hướng sự chú ý đến chi tiết quan trọng.',
    },
    aliases: ['Локальная подсветка', 'mouse', 'cursor', 'курсор', 'chuột'],
  },
];

export function discoverySearchText(value: string) {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLocaleLowerCase();
}
