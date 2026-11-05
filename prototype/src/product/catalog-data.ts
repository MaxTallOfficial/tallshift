import canonical from '../data/catalog.json' with { type: 'json' };
import type { DiscoveryPreview } from '../foundations/discovery-data';

export type Locale = 'en' | 'ru' | 'vi';
export type LocalizedText = Record<Locale, string>;
export type MaterialType = 'section' | 'component' | 'effect' | 'animation';
export interface Material {
  id: string;
  slug: string;
  name: string;
  title: LocalizedText;
  description: LocalizedText;
  type: MaterialType;
  access: 'free' | 'pro';
  pack: string;
  packs: readonly string[];
  available: boolean;
  preview: DiscoveryPreview;
}

// This metadata describes the production plan. A preview illustration does not
// make a material available; only State Relay currently has source and a demo.
const translations: Record<string, [string, string, string]> = {
  S001: ['A two-column opening with a clear product message and a focused next step.', 'Hero hai cột', 'Mở đầu bằng giá trị sản phẩm và một bước tiếp theo rõ ràng trong bố cục hai cột.'],
  S002: ['A flexible grid for three to six benefits, with room for useful detail.', 'Lưới tính năng', 'Trình bày từ ba đến sáu lợi ích trong một lưới linh hoạt, dễ đọc.'],
  S003: ['A focused closing section with one clear action and an optional supporting note.', 'Khối kêu gọi hành động', 'Kết thúc trang bằng một hành động rõ ràng và ghi chú bổ sung khi cần.'],
  S004: ['Introduce a digital product through a headline and an interactive demonstration.', 'Hero với bản demo', 'Giới thiệu giá trị sản phẩm bằng tiêu đề và bản demo có thể tương tác.'],
  S005: ['Explain a product in three to five steps, each paired with a visual example.', 'Tính năng theo từng bước', 'Giải thích sản phẩm qua ba đến năm bước, mỗi bước có ví dụ trực quan.'],
  S006: ['Compare plans and help visitors choose, with clear features and pricing.', 'So sánh gói dịch vụ', 'So sánh tính năng và giá để khách truy cập chọn gói phù hợp.'],
  S007: ['An expressive typographic opening for a portfolio or an independent studio.', 'Hero chữ biên tập', 'Mở đầu portfolio hoặc trang studio bằng bố cục chữ có cá tính.'],
  S008: ['A considered index for three to eight projects, with your own media and links.', 'Danh mục dự án', 'Trưng bày từ ba đến tám dự án cùng hình ảnh và liên kết của bạn.'],
  S009: ['Close a page with useful navigation, contact details and a clear hierarchy.', 'Chân trang liên hệ', 'Kết thúc trang bằng thông tin liên hệ và điều hướng được sắp xếp rõ ràng.'],
  S010: ['A characterful opening built around original graphic shapes and illustrations.', 'Hero với sticker đồ họa', 'Tạo dấu ấn cho phần mở đầu bằng hình khối và minh họa riêng.'],
  S011: ['Give four to eight common questions a clear, expressive card layout.', 'Thẻ câu hỏi thường gặp', 'Trình bày từ bốn đến tám câu hỏi trong bố cục thẻ sinh động, dễ đọc.'],
  S012: ['One memorable closing action, framed by an original orbital composition.', 'Lời mời với đồ họa quỹ đạo', 'Làm nổi bật hành động cuối trang bằng bố cục đồ họa quỹ đạo.'],
  C001: ['A configurable button or link with precise hover, keyboard and press feedback.', 'Nút có phản hồi', 'Nút hoặc liên kết có thể tùy chỉnh với phản hồi rõ khi di chuột, dùng bàn phím và nhấn.'],
  C002: ['Keep a small set of related content panels together with accessible tabs.', 'Tab nội dung', 'Nhóm các phần nội dung liên quan trong bộ tab hỗ trợ bàn phím.'],
  C003: ['Compact segmented navigation for related pages or anchors.', 'Điều hướng phân đoạn', 'Điều hướng gọn cho các trang hoặc mục liên quan.'],
  C004: ['Switch between compact groups of labelled metrics without losing context.', 'Bộ chuyển chỉ số', 'Chuyển giữa các nhóm chỉ số có nhãn mà vẫn giữ được ngữ cảnh.'],
  C005: ['A project card that gives the image, role and destination equal care.', 'Thẻ dự án', 'Giới thiệu dự án bằng hình ảnh, vai trò và liên kết rõ ràng.'],
  C006: ['Show three to twelve images with an accessible enlarged view.', 'Thư viện ảnh', 'Trưng bày từ ba đến mười hai ảnh với chế độ xem phóng lớn dễ sử dụng.'],
  C007: ['A playful pointer response around a stable, familiar button action.', 'Nút có hiệu ứng hút', 'Thêm phản hồi vui mắt theo con trỏ trong khi giữ thao tác nút quen thuộc.'],
  C008: ['Let visitors browse real testimonials at their own pace.', 'Bộ chuyển đánh giá', 'Cho khách truy cập tự chọn và đọc các đánh giá thực tế.'],
  E001: ['Reveal content once while keeping the full message available without motion.', 'Hiện nội dung', 'Hiện nội dung một lần và giữ toàn bộ thông tin khi tắt chuyển động.'],
  E002: ['Introduce a short group of related elements with a coordinated sequence.', 'Hiện nhóm tuần tự', 'Hiện một nhóm phần tử liên quan theo trình tự hài hòa.'],
  E003: ['A soft local gradient background, made with CSS and no WebGL.', 'Nền gradient mềm', 'Tạo nền gradient mềm bằng CSS, không cần WebGL.'],
  E004: ['Move a local highlight with the pointer to draw attention to a key surface.', 'Vùng sáng theo con trỏ', 'Di chuyển vùng sáng theo con trỏ để hướng sự chú ý đến chi tiết quan trọng.'],
  A001: ['Ready, pending, success and retry. Try a real interaction, then take the source and an integration prompt.', 'Phản hồi trạng thái', 'Sẵn sàng, đang xử lý, thành công và thử lại. Thử tương tác thực rồi lấy mã nguồn và prompt tích hợp.'],
  A002: ['Connect two prepared views in the same frame so the change is easy to follow.', 'Chuyển cảnh giữ ngữ cảnh', 'Kết nối hai chế độ xem trong cùng khung để người dùng theo dõi thay đổi.'],
  A003: ['Bring a headline into view one visual line at a time.', 'Tiêu đề hiện theo dòng', 'Đưa tiêu đề vào tầm nhìn qua từng dòng chữ.'],
  A004: ['Connect a thumbnail to its detail view with one continuous geometric transition.', 'Chuyển cảnh chung khung', 'Kết nối ảnh thu nhỏ và phần chi tiết bằng chuyển động hình học liền mạch.'],
  A005: ['Open and close a panel or menu from a chosen edge with controlled movement.', 'Mở bảng từ cạnh', 'Mở và đóng bảng hoặc menu từ cạnh đã chọn bằng chuyển động vừa phải.'],
  A006: ['Keep lists easy to follow when items are added, removed, filtered or reordered.', 'Sắp xếp lại danh sách', 'Giữ danh sách dễ theo dõi khi thêm, xóa, lọc hoặc đổi thứ tự phần tử.'],
  A007: ['Follow the current chapter and reading progress during ordinary page scrolling.', 'Tiến trình chương khi cuộn', 'Theo dõi chương hiện tại và tiến trình đọc khi cuộn trang thông thường.'],
  A008: ['A short transition between formatted numeric values, with localized separators.', 'Chuyển động giá trị số', 'Chuyển đổi ngắn giữa các giá trị số với định dạng và dấu phân cách theo ngôn ngữ.'],
};

function previewFor(id: string, type: string, pack: string): DiscoveryPreview {
  if (id === 'A001') return 'relay';
  if (id === 'A002' || id === 'A004' || id === 'A005') return 'bridge';
  if (type === 'animation' || id === 'E001' || id === 'E002' || pack === 'PACK-EDITORIAL') return 'lines';
  if (type === 'effect') return 'spotlight';
  if (type === 'component') return 'button';
  return 'hero';
}

export const materials: readonly Material[] = canonical.items.map(item => {
  const translation = translations[item.id];
  if (!translation) throw new Error(`Missing catalog translation: ${item.id}`);
  return {
    id: item.id, slug: item.slug, name: item.title.en,
    title: { en: item.title.en, ru: item.title.ru, vi: translation[1] },
    description: { en: translation[0], ru: item.id === 'A001' ? 'Готовность, выполнение, успех и повтор. Попробуйте реальное взаимодействие и заберите код с промптом для интеграции.' : item.purpose_ru, vi: translation[2] },
    type: item.type as MaterialType, access: item.access as Material['access'], pack: item.pack,
    packs: item.granted_by_product_ids.filter(id => id !== 'BUNDLE-LAUNCH'),
    available: item.id === 'A001', preview: previewFor(item.id, item.type, item.pack),
  };
});

const packVi: Record<string, string> = { 'FREE-STARTER': 'Khởi đầu', 'PACK-PRODUCT': 'Sản phẩm', 'PACK-EDITORIAL': 'Biên tập', 'PACK-PLAYFUL': 'Sáng tạo', 'PACK-MOTION': 'Chuyển động UI' };
export const catalogPacks = canonical.products.filter(pack => pack.id !== 'BUNDLE-LAUNCH').map(pack => ({
  id: pack.id, name: { en: pack.title.en, ru: pack.title.ru, vi: packVi[pack.id] } as LocalizedText,
}));
