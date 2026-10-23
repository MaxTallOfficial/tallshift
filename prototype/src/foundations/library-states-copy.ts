export type LibraryStatesLocale = 'en' | 'ru' | 'vi';

/** Exact product memberships from docs/spec-v1.0/catalog.json, not a release feed. */
export const libraryStateCollections = [
  { id: 'FREE-STARTER', name: 'Starter', access: 'free', ids: ['S001', 'S002', 'S003', 'C001', 'C002', 'E001', 'A001', 'A003', 'A006'] },
  { id: 'PACK-MOTION', name: 'UI Motion', access: 'pro', ids: ['E002', 'E003', 'E004', 'A002', 'A004', 'A005', 'A007', 'A008'] },
  { id: 'PACK-PLAYFUL', name: 'Playful', access: 'pro', ids: ['S010', 'S011', 'S012', 'C007', 'C008', 'E004'] },
] as const;

interface LibraryStatesCopy {
  eyebrow: string;
  title: string;
  intro: string;
  collections: string;
  collectionScope: string;
  all: string;
  free: string;
  pro: string;
  planned: string;
  plannedItems: string;
  sampleMatches: string;
  members: string;
  state: string;
  modeNote: string;
  modes: Record<'results' | 'loading' | 'empty' | 'error', string>;
  results: string;
  range: string;
  page: string;
  previous: string;
  next: string;
  pagination: string;
  ready: string;
  notBuilt: string;
  open: string;
  loadingTitle: string;
  loadingBody: string;
  emptyTitle: string;
  emptyBody: string;
  errorTitle: string;
  errorBody: string;
  restore: string;
  restored: string;
  scope: string;
  categories: Record<'animation' | 'component' | 'section' | 'effect', string>;
}

export const libraryStatesCopy: Record<LibraryStatesLocale, LibraryStatesCopy> = {
  en: {
    eyebrow: 'Library states',
    title: 'Collections and catalog states.',
    intro: 'Try a shorter result list, move between pages, then inspect loading and recovery states.',
    collections: 'Collections from the launch plan',
    collectionScope: 'Three of the six planned offers are represented here. Collection buttons filter these six local samples; they do not open a store.',
    all: 'All six samples',
    free: 'Free', pro: 'Pro', planned: 'Planned',
    plannedItems: '{count} items in the plan', sampleMatches: 'View samples · {count}', members: 'Planned contents',
    state: 'Result state',
    modeNote: 'Loading, Empty and Error are appearance examples. No request is running.',
    modes: { results: 'Results', loading: 'Loading example', empty: 'Empty example', error: 'Error example' },
    results: 'Local samples', range: 'Samples {first}–{last} / {total}', page: 'Page {page} of {pages}',
    previous: 'Previous page', next: 'Next page', pagination: 'Sample pages',
    ready: 'Working local example', notBuilt: 'Not built yet', open: 'Open State Relay',
    loadingTitle: 'Loading appearance', loadingBody: 'A static skeleton keeps the shape of two results. Choose Results to see the local samples.',
    emptyTitle: 'No matching materials', emptyBody: 'Use this state when the current filters return no results. This example does not change your collection selection.',
    errorTitle: 'The library could not load', errorBody: 'This is a recovery example. The button below restores local results; it does not retry a network request.',
    restore: 'Restore local results', restored: 'Local results restored.',
    scope: 'A001 is the only working material. The other five records and all three collections remain planned; no purchase or access check is simulated.',
    categories: { animation: 'Animation', component: 'Component', section: 'Section', effect: 'Effect' },
  },
  ru: {
    eyebrow: 'Состояния библиотеки',
    title: 'Наборы и состояния каталога.',
    intro: 'Выберите набор, перейдите на другую страницу и проверьте, как выглядят загрузка, пустая выдача и ошибка.',
    collections: 'Наборы из плана запуска',
    collectionScope: 'Здесь представлены три из шести запланированных предложений. Кнопки фильтруют шесть локальных образцов и не открывают магазин.',
    all: 'Все шесть образцов',
    free: 'Free', pro: 'Pro', planned: 'В плане',
    plannedItems: '{count} материалов в плане', sampleMatches: 'Показать локальные образцы: {count}', members: 'Плановый состав',
    state: 'Состояние выдачи',
    modeNote: 'Загрузка, пустая выдача и ошибка — примеры внешнего вида. Запросы не выполняются.',
    modes: { results: 'Результаты', loading: 'Пример загрузки', empty: 'Пустая выдача', error: 'Пример ошибки' },
    results: 'Локальные образцы', range: 'Показано: {first}–{last} из {total}', page: 'Страница {page} из {pages}',
    previous: 'Предыдущая страница', next: 'Следующая страница', pagination: 'Страницы образцов',
    ready: 'Рабочий локальный пример', notBuilt: 'Ещё не реализован', open: 'Открыть State Relay',
    loadingTitle: 'Вид загрузки', loadingBody: 'Статичный скелетон сохраняет форму двух результатов. Выберите «Результаты», чтобы увидеть локальные образцы.',
    emptyTitle: 'Материалы не найдены', emptyBody: 'Так выглядит выдача, когда фильтрам ничего не соответствует. Этот пример сохраняет выбранный набор.',
    errorTitle: 'Не удалось загрузить библиотеку', errorBody: 'Это пример восстановления после ошибки. Кнопка возвращает локальные результаты без повторного сетевого запроса.',
    restore: 'Вернуть локальные результаты', restored: 'Локальные результаты восстановлены.',
    scope: 'Работает только A001. Остальные пять материалов и три набора остаются в плане; покупка и проверка доступа здесь не имитируются.',
    categories: { animation: 'Анимация', component: 'Компонент', section: 'Секция', effect: 'Эффект' },
  },
  vi: {
    eyebrow: 'Trạng thái thư viện',
    title: 'Bộ sưu tập và trạng thái danh mục.',
    intro: 'Chọn một bộ, chuyển trang rồi xem giao diện khi đang tải, không có kết quả hoặc gặp lỗi.',
    collections: 'Các bộ trong kế hoạch ra mắt',
    collectionScope: 'Ba trong sáu gói dự kiến được giới thiệu ở đây. Các nút chỉ lọc sáu mẫu cục bộ, không mở cửa hàng.',
    all: 'Cả sáu mẫu',
    free: 'Free', pro: 'Pro', planned: 'Dự kiến',
    plannedItems: '{count} mục trong kế hoạch', sampleMatches: 'Xem {count} mẫu cục bộ', members: 'Nội dung dự kiến',
    state: 'Trạng thái kết quả',
    modeNote: 'Đang tải, Trống và Lỗi chỉ là ví dụ giao diện. Không có yêu cầu mạng nào đang chạy.',
    modes: { results: 'Kết quả', loading: 'Ví dụ đang tải', empty: 'Ví dụ trống', error: 'Ví dụ lỗi' },
    results: 'Mẫu cục bộ', range: '{first}–{last} trên {total} mẫu', page: 'Trang {page} trên {pages}',
    previous: 'Trang trước', next: 'Trang sau', pagination: 'Các trang mẫu',
    ready: 'Ví dụ cục bộ hoạt động được', notBuilt: 'Chưa triển khai', open: 'Mở State Relay',
    loadingTitle: 'Giao diện đang tải', loadingBody: 'Khung chờ tĩnh giữ chỗ cho hai kết quả. Chọn Kết quả để xem các mẫu cục bộ.',
    emptyTitle: 'Không có mục phù hợp', emptyBody: 'Dùng trạng thái này khi bộ lọc không trả về kết quả. Ví dụ vẫn giữ bộ đang chọn.',
    errorTitle: 'Không tải được thư viện', errorBody: 'Đây là ví dụ khôi phục sau lỗi. Nút bên dưới đưa các kết quả cục bộ trở lại, không gửi lại yêu cầu mạng.',
    restore: 'Khôi phục kết quả cục bộ', restored: 'Đã khôi phục kết quả cục bộ.',
    scope: 'Chỉ A001 hoạt động được. Năm mục còn lại và cả ba bộ vẫn nằm trong kế hoạch; không mô phỏng giao dịch hoặc kiểm tra quyền truy cập.',
    categories: { animation: 'Chuyển động', component: 'Thành phần', section: 'Phần trang', effect: 'Hiệu ứng' },
  },
};

export function libraryText(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
