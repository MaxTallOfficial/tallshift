export type AccessStatesLocale = 'en' | 'ru' | 'vi';
export type AccessScenario = 'free' | 'no-access' | 'pending' | 'owner' | 'error' | 'closed';

// Canonical scope from product-and-delivery.ru.md §3. Commercial values remain a
// planning hypothesis; this fixture cannot create a quote, payment or access.
export const accessProductOffer = {
  offerId: 'PACK-PRODUCT',
  name: 'Product',
  offerRevision: '1.0-launch',
  revisionStatus: 'draft',
  itemIds: ['S004', 'S005', 'S006', 'C003', 'C004', 'E002'],
  currency: 'USD',
  hypothesisPriceMinor: 2900,
  priceStatus: 'planning-hypothesis',
  taxIncluded: false,
  licenseStatus: 'draft',
  readiness: 'planned',
  paymentEnabled: false,
  sourceAvailable: false,
} as const;

type ScenarioCopy = { label: string; status: string; title: string; body: string; action: string; reason: string };
type AccessCopy = {
  kicker: string; title: string; intro: string; specimen: string; specimenNote: string;
  freeAccess: string; freeClaim: string; freeClaimAccent: string; freeDescription: string;
  freeBenefits: readonly string[]; freeDelivery: string; open: string;
  proClaim: string; proClaimAccent: string; proDescription: string; proBenefits: readonly string[];
  details: string; planned: string; notOnSale: string; priceNote: string; scope: string; version: string;
  versionValue: string; license: string; licenseValue: string; updates: string; updatesValue: string;
  packNote: string; preview: string; previewHint: string; simulated: string; scenarioItem: string;
  scenarios: Record<AccessScenario, ScenarioCopy>;
};

const en: AccessCopy = {
  kicker: 'OFFERS + ACCESS',
  title: 'Try it here. Build with the source.',
  intro: 'Start with the Free component. Explore the planned Product pack for a fuller product story.',
  specimen: 'System specimen',
  specimenNote: 'The states below are simulated. This stand has no account, payment or server-side access check.',
  freeAccess: 'Free · MIT source',
  freeClaim: 'Give every action',
  freeClaimAccent: 'a clear response.',
  freeDescription: 'Bring loading, success and errors into one coherent flow. Try State Relay here, then adapt its source to your project.',
  freeBenefits: ['React + TypeScript source you can edit', 'A prompt to adapt it to your project', 'Setup guide and ZIP for Next.js or Vite'],
  freeDelivery: 'Ready to try · no account or payment',
  open: 'Try State Relay free',
  proClaim: 'Show your product.',
  proClaimAccent: 'Make the value clear.',
  proDescription: 'Planned for the full pitch: demonstrate the product, explain its features and make plans easy to compare.',
  proBenefits: ['3 sections: demo hero, feature steps and pricing', '2 controls: navigation and switchable metrics', '1 motion effect: staggered group reveal'],
  details: 'Pack contents and terms',
  planned: 'Pro · planned',
  notOnSale: 'Not on sale',
  priceNote: 'Planning assumption: $29 USD before tax. This is not a live price.',
  scope: 'Planned contents · 6 items',
  version: 'Offer revision',
  versionValue: '1.0-launch · draft',
  license: 'License plan',
  licenseValue: 'One author · own and client projects',
  updates: 'Update plan',
  updatesValue: '12 months · included IDs only',
  packNote: 'Files, license terms and payment readiness must be complete before sales open.',
  preview: 'Preview states',
  previewHint: 'Choose a scenario to review its message and available action. This does not change access.',
  simulated: 'Simulated scenario',
  scenarioItem: 'Selected component or pack',
  scenarios: {
    free: { label: 'Free', status: 'Available here', title: 'Start with State Relay.', body: 'A001 is the working Free example. Open it to try the demo and get its code, prompt or ZIP.', action: 'Open State Relay', reason: 'Only A001 has files in this stand.' },
    'no-access': { label: 'Pro · no access', status: 'No confirmed access', title: 'This pack needs Pro access.', body: 'This scenario represents an account without the pack. Product is still planned, so buying it is not available here.', action: 'Sales are closed', reason: 'No checkout or purchase is created.' },
    pending: { label: 'Payment pending', status: 'Waiting for confirmation', title: 'Payment isn’t confirmed yet.', body: 'The payment is pending in this scenario. Files stay unavailable until payment and access are confirmed.', action: 'Awaiting confirmation', reason: 'Preview only. No payment has been made in this stand.' },
    owner: { label: 'Owner', status: 'Confirmed access · preview', title: 'Owner access to a released pack.', body: 'This is the owner-state layout. A released pack would offer its files here. Product is a planned sample, so its source and ZIP remain unavailable.', action: 'Files are not available yet', reason: 'The preview does not create a purchase or grant access.' },
    error: { label: 'Access check error', status: 'Access unknown', title: 'We couldn’t check access.', body: 'A failed check does not mean the pack is unowned. Keep the purchase status unknown and do not ask the user to pay again.', action: 'Access not verified', reason: 'This is an error specimen; no request was sent.' },
    closed: { label: 'Sales closed', status: 'Sales are not open yet', title: 'The pack isn’t ready to sell.', body: 'All six components, the final license and payment readiness must be complete before checkout can be offered.', action: 'Sales are closed', reason: 'Free A001 remains available above.' },
  },
};

const ru: AccessCopy = {
  kicker: 'НАБОРЫ И ДОСТУП',
  title: 'Попробуйте здесь. Возьмите код в проект.',
  intro: 'Начните с бесплатного компонента. Для полноценной подачи продукта планируем набор Product.',
  specimen: 'Образец дизайн-системы',
  specimenNote: 'Состояния ниже смоделированы. В стенде нет аккаунта, оплаты и серверной проверки доступа.',
  freeAccess: 'Free · код по MIT',
  freeClaim: 'Каждому действию —',
  freeClaimAccent: 'понятный отклик.',
  freeDescription: 'Свяжите загрузку, успех и ошибку в один понятный сценарий. Попробуйте State Relay здесь и адаптируйте исходники под свой проект.',
  freeBenefits: ['Исходники на React + TypeScript для ваших правок', 'Промпт для адаптации под ваш проект', 'Инструкция и ZIP для Next.js или Vite'],
  freeDelivery: 'Уже можно попробовать · без аккаунта и оплаты',
  open: 'Попробовать бесплатно',
  proClaim: 'Покажите продукт.',
  proClaimAccent: 'Раскройте его ценность.',
  proDescription: 'Планируем набор для полного рассказа о продукте: от интерактивного демо и возможностей до сравнения тарифов.',
  proBenefits: ['3 секции: hero с демо, шаги и тарифы', '2 контрола: навигация и переключение метрик', '1 эффект: последовательное появление группы'],
  details: 'Состав и условия набора',
  planned: 'Pro · в плане',
  notOnSale: 'Не продаётся',
  priceNote: 'Ценовая гипотеза: $29 USD до налогов. Это не действующая цена.',
  scope: 'Планируемый состав · 6 элементов',
  version: 'Редакция набора',
  versionValue: '1.0-launch · черновик',
  license: 'План лицензии',
  licenseValue: 'Один автор · свои и клиентские проекты',
  updates: 'План обновлений',
  updatesValue: '12 месяцев · только включённые ID',
  packNote: 'До открытия продаж нужны все файлы, окончательные условия лицензии и готовность оплаты.',
  preview: 'Проверка состояний',
  previewHint: 'Выберите сценарий, чтобы проверить сообщение и доступное действие. Права от этого не меняются.',
  simulated: 'Смоделированный сценарий',
  scenarioItem: 'Выбранный компонент или набор',
  scenarios: {
    free: { label: 'Free', status: 'Доступен в стенде', title: 'Начните со State Relay.', body: 'A001 — рабочий бесплатный пример. Откройте его, чтобы проверить демо и получить код, промпт или ZIP.', action: 'Открыть State Relay', reason: 'В этом стенде файлы есть только у A001.' },
    'no-access': { label: 'Pro · нет доступа', status: 'Доступ не подтверждён', title: 'Для набора нужен Pro-доступ.', body: 'В этом сценарии у аккаунта нет набора. Product ещё в плане, поэтому купить его здесь нельзя.', action: 'Продажи закрыты', reason: 'Checkout и заказ не создаются.' },
    pending: { label: 'Оплата ожидается', status: 'Ждём подтверждения', title: 'Оплата ещё не подтверждена.', body: 'В этом сценарии платёж ожидает подтверждения. Файлы недоступны, пока не подтверждены оплата и право доступа.', action: 'Ждём подтверждения', reason: 'Это образец состояния. В стенде платежа не было.' },
    owner: { label: 'Владелец', status: 'Доступ подтверждён · образец', title: 'Пример доступа владельца.', body: 'Так выглядит состояние подтверждённого доступа. У выпущенного набора здесь появится скачивание. Product пока служит плановым образцом, его исходников в стенде нет.', action: 'Файлы ещё не готовы', reason: 'Просмотр сценария не создаёт покупку и не выдаёт права.' },
    error: { label: 'Ошибка проверки', status: 'Доступ неизвестен', title: 'Не удалось проверить доступ.', body: 'Ошибка проверки не означает, что набор не куплен. Сохраняем неопределённый статус покупки и не предлагаем платить повторно.', action: 'Доступ не проверен', reason: 'Это образец ошибки. Запрос на сервер не отправлялся.' },
    closed: { label: 'Продажи закрыты', status: 'Продажи ещё не открыты', title: 'Набор ещё не готов к продаже.', body: 'До появления checkout нужны все шесть компонентов, окончательная лицензия и готовая платёжная система.', action: 'Продажи закрыты', reason: 'Бесплатный A001 остаётся доступен выше.' },
  },
};

const vi: AccessCopy = {
  kicker: 'GÓI VÀ QUYỀN TRUY CẬP',
  title: 'Thử tại đây. Đưa mã vào dự án.',
  intro: 'Bắt đầu với component Free. Khám phá gói Product dự kiến để giới thiệu sản phẩm đầy đủ hơn.',
  specimen: 'Mẫu hệ thống thiết kế',
  specimenNote: 'Các trạng thái bên dưới là mô phỏng. Bản này không có tài khoản, thanh toán hay kiểm tra quyền trên máy chủ.',
  freeAccess: 'Free · mã nguồn MIT',
  freeClaim: 'Mỗi thao tác,',
  freeClaimAccent: 'một phản hồi rõ ràng.',
  freeDescription: 'Kết nối trạng thái đang tải, thành công và lỗi trong một luồng rõ ràng. Thử State Relay tại đây, rồi tùy chỉnh mã nguồn cho dự án của bạn.',
  freeBenefits: ['Mã nguồn React + TypeScript để chỉnh sửa', 'Prompt để tùy chỉnh cho dự án của bạn', 'Hướng dẫn và ZIP cho Next.js hoặc Vite'],
  freeDelivery: 'Có thể thử ngay · không cần tài khoản hay thanh toán',
  open: 'Thử State Relay miễn phí',
  proClaim: 'Giới thiệu sản phẩm.',
  proClaimAccent: 'Làm rõ giá trị.',
  proDescription: 'Gói dự kiến cho toàn bộ phần giới thiệu: trình diễn sản phẩm, giải thích tính năng và giúp người xem so sánh các gói.',
  proBenefits: ['3 section: hero có demo, các bước tính năng và bảng giá', '2 control: điều hướng và chuyển đổi chỉ số', '1 hiệu ứng: lần lượt hiện các phần tử trong nhóm'],
  details: 'Nội dung và điều kiện của gói',
  planned: 'Pro · trong kế hoạch',
  notOnSale: 'Chưa mở bán',
  priceNote: 'Giả định giá: $29 USD trước thuế. Đây chưa phải giá bán.',
  scope: 'Nội dung dự kiến · 6 mục',
  version: 'Phiên bản gói',
  versionValue: '1.0-launch · bản nháp',
  license: 'Giấy phép dự kiến',
  licenseValue: 'Một tác giả · dự án riêng và cho khách hàng',
  updates: 'Cập nhật dự kiến',
  updatesValue: '12 tháng · chỉ các ID trong gói',
  packNote: 'Cần hoàn tất tệp, điều khoản giấy phép và hệ thống thanh toán trước khi mở bán.',
  preview: 'Xem các trạng thái',
  previewHint: 'Chọn tình huống để xem thông báo và thao tác tương ứng. Quyền truy cập không thay đổi.',
  simulated: 'Tình huống mô phỏng',
  scenarioItem: 'Component hoặc gói được chọn',
  scenarios: {
    free: { label: 'Free', status: 'Có sẵn ở đây', title: 'Bắt đầu với State Relay.', body: 'A001 là ví dụ Free đang hoạt động. Mở để thử demo và lấy mã nguồn, prompt hoặc ZIP.', action: 'Mở State Relay', reason: 'Chỉ A001 có tệp trong bản này.' },
    'no-access': { label: 'Pro · chưa có quyền', status: 'Chưa xác nhận quyền', title: 'Gói này cần quyền Pro.', body: 'Tình huống này mô phỏng tài khoản chưa có gói. Product vẫn trong kế hoạch nên chưa thể mua ở đây.', action: 'Chưa mở bán', reason: 'Không tạo trang thanh toán hay đơn hàng.' },
    pending: { label: 'Chờ thanh toán', status: 'Đang chờ xác nhận', title: 'Thanh toán chưa được xác nhận.', body: 'Trong tình huống này, thanh toán đang chờ xác nhận. Tệp chỉ được cung cấp sau khi xác nhận thanh toán và quyền truy cập.', action: 'Chờ xác nhận', reason: 'Chỉ là mô phỏng. Không có giao dịch trong bản này.' },
    owner: { label: 'Đã sở hữu', status: 'Đã xác nhận quyền · mô phỏng', title: 'Mẫu trạng thái đã có quyền.', body: 'Tình huống này mô phỏng người đã có quyền. Tệp của Product vẫn trong kế hoạch nên bản này chưa cung cấp mã nguồn hoặc ZIP.', action: 'Chưa có tệp', reason: 'Xem tình huống không tạo giao dịch hay cấp quyền.' },
    error: { label: 'Lỗi kiểm tra quyền', status: 'Chưa rõ quyền truy cập', title: 'Không kiểm tra được quyền.', body: 'Lỗi kiểm tra không có nghĩa là chưa sở hữu gói. Giữ trạng thái mua chưa xác định, không yêu cầu người dùng thanh toán lại.', action: 'Chưa kiểm tra được quyền', reason: 'Đây là mẫu trạng thái lỗi; chưa gửi yêu cầu nào.' },
    closed: { label: 'Chưa mở bán', status: 'Chưa mở bán', title: 'Gói chưa sẵn sàng để bán.', body: 'Cần hoàn tất cả sáu component, giấy phép và hệ thống thanh toán trước khi cho phép mua.', action: 'Chưa mở bán', reason: 'A001 Free ở trên vẫn có sẵn.' },
  },
};

export const accessStatesCopy: Record<AccessStatesLocale, AccessCopy> = { en, ru, vi };
