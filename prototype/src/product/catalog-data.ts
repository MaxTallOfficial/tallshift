import { availableExampleIds } from './available-examples.ts';
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
  /** Internal search terms retained when public descriptions are edited. */
  searchAliases?: readonly string[];
}

// This metadata describes the production plan. A preview illustration does not
// make a material available; availability requires a connected demo and complete kit.
const translations: Record<string, [string, string, string]> = {
  S001: ['A two-column opening for a small product site, with a short introduction and one main action.', 'Phần mở đầu hai cột', 'Phần đầu của website sản phẩm, gồm hai cột, giới thiệu ngắn và một hành động chính.'],
  S002: ['A grid for three to six benefits, each with a short heading and explanation.', 'Lưới lợi ích', 'Lưới trình bày từ ba đến sáu lợi ích, mỗi mục có tiêu đề ngắn và phần giải thích.'],
  S003: ['A closing section with one main action, such as opening a form or signing up.', 'Khối hành động cuối trang', 'Khối cuối trang với một hành động chính, chẳng hạn mở biểu mẫu hoặc đăng ký.'],
  S004: ['An opening section with an interactive example that lets visitors try your product.', 'Phần mở đầu với bản thử', 'Phần đầu trang có ví dụ tương tác để khách truy cập thử sản phẩm của bạn.'],
  S005: ['Present three to five product features, each with an explanation and a visual example.', 'Tính năng theo từng bước', 'Trình bày từ ba đến năm tính năng, mỗi mục có giải thích và ví dụ trực quan.'],
  S006: ['Compare the prices and features of plans on your site. Payment processing is not included.', 'So sánh gói dịch vụ', 'So sánh giá và tính năng các gói trên website của bạn. Không bao gồm xử lý thanh toán.'],
  S007: ['An opening section built around large text for a portfolio or studio site.', 'Phần mở đầu với chữ lớn', 'Phần đầu trang portfolio hoặc studio, lấy chữ lớn làm yếu tố chính.'],
  S008: ['An index for three to eight projects, with your images, descriptions and links.', 'Danh mục dự án', 'Danh mục từ ba đến tám dự án, kèm hình ảnh, mô tả và liên kết của bạn.'],
  S009: ['A page footer with contact details and links to the rest of the site.', 'Chân trang liên hệ', 'Phần cuối trang với thông tin liên hệ và liên kết đến các phần của website.'],
  S010: ['An opening section using original shapes and stickers to give a site its own character.', 'Phần mở đầu với sticker', 'Phần đầu trang dùng hình khối và sticker riêng để thể hiện phong cách của website.'],
  S011: ['Cards with answers to four to eight common questions about your product or service.', 'Câu hỏi thường gặp dạng thẻ', 'Các thẻ trả lời từ bốn đến tám câu hỏi thường gặp về sản phẩm hoặc dịch vụ của bạn.'],
  S012: ['A closing action at the centre of a composition, with graphic elements arranged around it.', 'Lời mời với đồ họa quỹ đạo', 'Hành động cuối trang nằm ở trung tâm, với các yếu tố đồ họa bố trí xung quanh.'],
  C001: ['A button or link with clear feedback on hover, press and keyboard focus.', 'Nút có hiệu ứng khi di chuột và nhấn', 'Nút hoặc liên kết phản hồi rõ khi di chuột, nhấn và dùng bàn phím.'],
  C002: ['Tabs for switching between related content, such as a description, specifications and instructions.', 'Tab nội dung', 'Các tab chuyển giữa nội dung liên quan, chẳng hạn mô tả, thông số và hướng dẫn.'],
  C003: ['A compact menu for moving between pages or sections of the current page.', 'Điều hướng theo mục', 'Menu gọn để chuyển giữa các trang hoặc các mục trên trang hiện tại.'],
  C004: ['Switch between groups of figures, for example for different periods or categories.', 'Bộ chuyển chỉ số', 'Chuyển giữa các nhóm số liệu, chẳng hạn theo khoảng thời gian hoặc danh mục.'],
  C005: ['A card with a project image, a short description of your role and a link to the project.', 'Thẻ dự án', 'Thẻ gồm hình ảnh dự án, mô tả ngắn về vai trò của bạn và liên kết đến dự án.'],
  C006: ['A gallery for three to twelve images. Visitors can open a selected image at a larger size.', 'Thư viện ảnh', 'Thư viện từ ba đến mười hai ảnh. Khách truy cập có thể mở ảnh đã chọn ở kích thước lớn hơn.'],
  C007: ['A button that moves slightly towards the pointer on hover while keeping normal click and keyboard behaviour.', 'Nút có hiệu ứng hút', 'Nút dịch chuyển nhẹ về phía con trỏ khi di chuột, đồng thời giữ thao tác nhấn và bàn phím thông thường.'],
  C008: ['A set of testimonials that visitors can switch through manually.', 'Bộ chuyển đánh giá', 'Bộ đánh giá để khách truy cập tự chọn và chuyển nội dung muốn đọc.'],
  E001: ['Content fades into view once. It stays visible when animation is turned off.', 'Hiện nội dung', 'Nội dung xuất hiện nhẹ một lần. Khi tắt hoạt ảnh, nội dung vẫn hiển thị.'],
  E002: ['A group of elements appears one after another, with a short delay between them.', 'Hiện nhóm tuần tự', 'Các phần tử trong một nhóm xuất hiện lần lượt, với khoảng trễ ngắn giữa các phần tử.'],
  E003: ['A soft gradient for the background of one section, created with CSS.', 'Nền gradient mềm', 'Nền gradient mềm cho một khối trên trang, được tạo bằng CSS.'],
  E004: ['A background highlight follows the pointer inside a section without changing its text or content.', 'Vùng sáng theo con trỏ', 'Vùng sáng trên nền đi theo con trỏ trong một khối mà không thay đổi chữ hoặc nội dung.'],
  A001: ['A button that shows progress, success or an error and lets users retry. The demo and download are ready.', 'Phản hồi trạng thái', 'Nút hiển thị tiến trình, thành công hoặc lỗi và cho phép thử lại. Bản thử và bộ tải xuống đã sẵn sàng.'],
  A002: ['Content changes smoothly between two prepared views inside one area of the page.', 'Chuyển nội dung mượt mà', 'Nội dung chuyển mượt giữa hai chế độ xem đã chuẩn bị trong cùng một vùng trên trang.'],
  A003: ['A headline appears smoothly, one visual line at a time.', 'Tiêu đề hiện theo dòng', 'Tiêu đề xuất hiện nhẹ theo từng dòng chữ.'],
  A004: ['A thumbnail changes into a detail view with a smooth change of size and position.', 'Chuyển từ ảnh nhỏ đến chi tiết', 'Ảnh thu nhỏ chuyển sang chế độ xem chi tiết bằng thay đổi mượt về kích thước và vị trí.'],
  A005: ['A panel or menu slides in from a chosen edge and slides back when closed.', 'Bảng trượt từ cạnh', 'Bảng hoặc menu trượt vào từ cạnh đã chọn và trượt trở lại khi đóng.'],
  A006: ['List items move smoothly when items are added, removed, filtered or reordered.', 'Chuyển động trong danh sách', 'Các mục trong danh sách di chuyển mượt khi thêm, xóa, lọc hoặc đổi thứ tự.'],
  A007: ['An indicator shows the current section and reading progress as visitors scroll down the page.', 'Tiến trình đọc theo mục', 'Chỉ báo hiển thị mục hiện tại và tiến trình đọc khi khách truy cập cuộn trang.'],
  A008: ['A number changes smoothly to its new value using the number format of the selected language.', 'Chuyển động giá trị số', 'Số chuyển mượt sang giá trị mới theo định dạng số của ngôn ngữ đã chọn.'],
};

// Public presentation copy is separate from the internal production briefs.
// Canonical IDs, English names, prices, pack membership and availability remain unchanged.
const englishPresentation: Record<string,string> = {
  "S001": "Two-column opening section",
  "S002": "Benefits grid",
  "S003": "Closing call to action",
  "S004": "Opening section with a live demo",
  "S005": "Product feature walkthrough",
  "S006": "Pricing comparison",
  "S007": "Opening section with large type",
  "S008": "Project index",
  "S009": "Contact footer",
  "S010": "Opening section with stickers",
  "S011": "Frequently asked questions",
  "S012": "Call to action with orbiting graphics",
  "C001": "Button with hover and press effects",
  "C002": "Content tabs",
  "C003": "Section navigation",
  "C004": "Metric switcher",
  "C005": "Project card",
  "C006": "Image gallery with enlargement",
  "C007": "Button that follows the pointer",
  "C008": "Testimonials with manual navigation",
  "E001": "Content fade-in",
  "E002": "Elements appearing in sequence",
  "E003": "Soft gradient background",
  "E004": "Background highlight following the pointer",
  "A001": "Button with a progress indicator",
  "A002": "Smooth content switching",
  "A003": "Headline appearing line by line",
  "A004": "Thumbnail-to-detail transition",
  "A005": "Panel sliding in from an edge",
  "A006": "Animated list changes",
  "A007": "Reading progress by section",
  "A008": "Animated number changes"
};

const russianPresentation: Record<string, readonly [string, string]> = {
  S001: ['Первый экран в две колонки', 'Первый экран небольшого сайта с кратким описанием продукта и основным действием.'],
  S002: ['Сетка преимуществ', 'Сетка для 3–6 преимуществ: краткие заголовки, пояснения и понятный порядок чтения.'],
  S003: ['Завершающий блок с действием', 'Короткий завершающий блок с одним главным действием, например переходом к форме или регистрации.'],
  S004: ['Первый экран с демо продукта', 'Первый экран с интерактивным примером, чтобы посетитель мог сразу попробовать ваш продукт.'],
  S005: ['Возможности продукта по шагам', 'Блок для 3–5 возможностей продукта. Каждый пункт сопровождается объяснением и визуальным примером.'],
  S006: ['Сравнение тарифов', 'Сравнение тарифов вашего сайта по цене и возможностям. Блок помогает выбрать тариф, но не содержит оплату.'],
  S007: ['Первый экран с крупным текстом', 'Крупный текст как основа первого экрана портфолио или сайта студии.'],
  S008: ['Список проектов', 'Список для 3–8 проектов с вашими изображениями, описаниями и ссылками.'],
  S009: ['Контакты и ссылки внизу страницы', 'Нижняя часть страницы с контактами и ссылками на остальные разделы сайта.'],
  S010: ['Первый экран с графическими стикерами', 'Первый экран с собственными формами и стикерами, которые подчёркивают характер сайта.'],
  S011: ['Ответы на вопросы в карточках', 'Карточки с ответами на 4–8 частых вопросов о вашем продукте или сервисе.'],
  S012: ['Блок с кнопкой и графикой вокруг', 'Завершающий блок с действием в центре и графическими элементами вокруг него.'],
  C001: ['Кнопка с эффектами наведения и нажатия', 'Кнопка или ссылка меняет вид при наведении курсора, нажатии или выборе с клавиатуры.'],
  C002: ['Вкладки для переключения содержимого', 'Вкладки для переключения описания, характеристик или инструкции внутри одной области.'],
  C003: ['Навигация по разделам', 'Компактное меню для перехода между страницами или разделами текущей страницы.'],
  C004: ['Переключение показателей', 'Переключатель между группами показателей, например для разных периодов или категорий.'],
  C005: ['Карточка проекта', 'Карточка с изображением работы, кратким описанием роли автора и ссылкой на проект.'],
  C006: ['Галерея с увеличением изображений', 'Галерея для 3–12 изображений. Выбранное изображение можно открыть крупнее.'],
  C007: ['Кнопка, которая следует за курсором', 'Кнопка слегка следует за указателем при наведении. Обычное нажатие и работа с клавиатурой сохраняются.'],
  C008: ['Отзывы с ручным переключением', 'Переключатель для нескольких отзывов. Посетитель сам выбирает, какой отзыв прочитать.'],
  E001: ['Плавное появление содержимого', 'Элемент плавно появляется один раз. Если анимация отключена, содержимое остаётся видимым.'],
  E002: ['Поочерёдное появление элементов', 'Элементы группы появляются один за другим с небольшой задержкой между ними.'],
  E003: ['Мягкий градиентный фон', 'Мягкий градиент для фона отдельного блока, созданный средствами CSS.'],
  E004: ['Подсветка вслед за указателем', 'Подсветка фона следует за указателем внутри блока. Текст и содержимое не меняются.'],
  A001: ['Кнопка с индикатором выполнения', 'Кнопка показывает выполнение, успех или ошибку и позволяет повторить действие. Рабочий пример и файлы для скачивания уже доступны.'],
  A002: ['Плавная смена содержимого', 'Содержимое плавно меняется между двумя подготовленными представлениями внутри одной области страницы.'],
  A003: ['Появление заголовка по строкам', 'Заголовок плавно появляется строка за строкой.'],
  A004: ['Переход от миниатюры к подробностям', 'Миниатюра переходит в подробный просмотр с плавной сменой размера и положения.'],
  A005: ['Выдвижная панель или меню', 'Панель или меню выдвигается с выбранного края и задвигается при закрытии.'],
  A006: ['Анимация изменений в списке', 'Элементы списка плавно перемещаются при добавлении, удалении, фильтрации или смене порядка.'],
  A007: ['Прогресс чтения по разделам', 'При прокрутке индикатор показывает текущий раздел и общий прогресс чтения страницы.'],
  A008: ['Плавная смена чисел', 'Число плавно сменяется новым значением с учётом формата чисел выбранного языка.'],
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
  const russian = russianPresentation[item.id];
  if (!translation || !russian || !englishPresentation[item.id]) throw new Error(`Missing catalog translation: ${item.id}`);
  return {
    id: item.id, slug: item.slug, name: item.title.en,
    title: { en: englishPresentation[item.id], ru: russian[0], vi: translation[1] },
    description: { en: translation[0], ru: russian[1], vi: translation[2] },
    searchAliases: [item.title.ru, item.purpose_ru, ...(item.id==='A001'?['Кнопка с откликом','Button with feedback','Nút phản hồi','Phản hồi trạng thái']:[]), ...(item.id==='C002'?['Контентные вкладки']:[])],
    type: item.type as MaterialType, access: item.access as Material['access'], pack: item.pack,
    packs: item.granted_by_product_ids.filter(id => id !== 'BUNDLE-LAUNCH'),
    available: availableExampleIds.includes(item.id), preview: previewFor(item.id, item.type, item.pack),
  };
});

const packVi: Record<string, string> = { 'FREE-STARTER': 'Khởi đầu', 'PACK-PRODUCT': 'Sản phẩm', 'PACK-EDITORIAL': 'Biên tập', 'PACK-PLAYFUL': 'Sáng tạo', 'PACK-MOTION': 'Chuyển động UI' };
export const catalogPacks = canonical.products.filter(pack => pack.id !== 'BUNDLE-LAUNCH').map(pack => ({
  id: pack.id, name: { en: pack.title.en, ru: pack.title.ru, vi: packVi[pack.id] } as LocalizedText,
}));
