import type { AccessStatesLocale } from './access-states-copy';

/** Display strategy, not a checkout quote. IDs remain canonical; all paid offers are planned. */
export const pricingPlanScopes = {
 starter: ['S001','S002','S003','C001','C002','E001','A001','A003','A006'],
 product: ['S004','S005','S006','C003','C004','E002'],
 bundle: ['S004','S005','S006','S007','S008','S009','S010','S011','S012','C003','C004','C005','C006','C007','C008','E002','E003','E004','A002','A004','A005','A007','A008'],
} as const;
export const pricingPlanTerms = {
 starter:{offerId:'FREE-STARTER',priceMinor:0},
 product:{offerId:'PACK-PRODUCT',priceMinor:1600},
 bundle:{offerId:'BUNDLE-LAUNCH',priceMinor:3900},
} as const;
const en = {
 title:'Start free. Pick what your next project needs.',
 intro:'Pay once for a defined set of source files. Product is our focused pack for a product launch; All packs covers the wider library.',
 recommendation:'For a product launch', once:'USD · one-time', free:'Free', hypothesis:'Price hypothesis before tax · sales are not open.',
 starterClaim:'Start with code',starterAccent:'you can make your own.',
 starterDescription:'Try the workflow before buying: preview, source, adaptation prompt and setup guide.',
 starterBenefits:['9 Free materials: 3 sections, 2 controls, 1 effect and 3 animations','React + TypeScript · Next.js and Vite','Personal and client projects · download without an account'],
 starterStatus:'Code, adaptation prompts and setup guides. No account required.',
 starterScope:'Free contents · 9 materials',
 bundleClaim:'More projects.',bundleAccent:'More ways to build.',
 bundleDescription:'All 4 current packs: Product, Editorial, Playful and UI Motion. For creators who need more than one style or use case.',
 bundleBenefits:['23 unique paid materials across 4 packs','9 sections, 6 controls, 3 effects and 5 animations','Source, adaptation prompts and setup guides for every material'],
 bundleScope:'Paid contents · 23 materials', closed:'In preparation',
 compareTitle:'The same delivery standard in every paid pack.',
 rows:[['Payment','Free','One-time','One-time'],['Materials','9 Free','6 paid','23 paid'],['Source + prompt + guide','Included','Included','Included'],['Use in client projects','Allowed','One creator','One creator'],['Functional updates','New versions of the free code','12 months · purchased materials','12 months · purchased materials']],
 shared:'Keep using the code after the update window. New materials and future packs are separate. Free materials are available to everyone.',
 upgrades:'Bought Product for $16? Upgrade to All packs for $23 before tax. Your checkout quote applies the best eligible upgrade or ownership discount.',
 other:'Need a different style? Editorial, Playful and UI Motion are available separately for $16 per pack. Prices exclude applicable taxes.',
};
const ru:typeof en = {
 title:'Начните бесплатно. Выберите набор под свой проект.',
 intro:'Разовая покупка конкретного комплекта исходников. Product — для запуска продукта. All packs — для разных задач и стилей.',
 recommendation:'Для запуска продукта',once:'USD · разовый платёж',free:'Бесплатно',hypothesis:'Гипотеза цены до налогов · продажи ещё не открыты.',
 starterClaim:'Начните с кода,',starterAccent:'который станет вашим.',
 starterDescription:'Проверьте весь путь до покупки: превью, исходники, промпт адаптации и инструкция.',
 starterBenefits:['9 бесплатных материалов: 3 секции, 2 элемента управления, 1 эффект и 3 анимации','React + TypeScript · Next.js и Vite','Для своих и клиентских проектов · скачивание без аккаунта'],
 starterStatus:'Код, промпты адаптации и инструкции. Без регистрации.',
 starterScope:'Бесплатный состав · 9 материалов',
 bundleClaim:'Больше проектов.',bundleAccent:'Больше вариантов.',
 bundleDescription:'Все 4 текущих набора: Product, Editorial, Playful и UI Motion. Для тех, кто работает с разными задачами и стилями.',
 bundleBenefits:['23 уникальных платных материала из 4 наборов','9 секций, 6 элементов управления, 3 эффекта и 5 анимаций','Исходники, промпт адаптации и инструкция к каждому материалу'],
 bundleScope:'Платный состав · 23 материала',closed:'В подготовке',
 compareTitle:'Единый стандарт комплекта в каждом платном наборе.',
 rows:[['Оплата','Бесплатно','Разово','Разово'],['Состав','9 Free','6 платных','23 платных'],['Код + промпт + инструкция','Включены','Включены','Включены'],['Клиентские проекты','Разрешены','Один автор','Один автор'],['Функциональные обновления','Новые версии бесплатного кода','12 месяцев · купленные материалы','12 месяцев · купленные материалы']],
 shared:'Полученный код можно использовать и после окна обновлений. Новые материалы и будущие наборы приобретаются отдельно. Бесплатные материалы доступны всем.',
 upgrades:'Купили Product за $16? Доплата до All packs — $23 до налогов. При расчёте применяется более выгодное из доступных условий перехода и учёта купленных материалов.',
 other:'Нужен другой стиль? Editorial, Playful и UI Motion можно выбрать отдельно по $16. Цены указаны до применимых налогов.',
};
const vi:typeof en = {
 title:'Bắt đầu miễn phí. Chọn bộ phù hợp với dự án.',
 intro:'Thanh toán một lần cho bộ mã nguồn xác định. Product dành cho việc ra mắt sản phẩm; All packs bao gồm nhiều phong cách hơn.',
 recommendation:'Dành cho ra mắt sản phẩm',once:'USD · thanh toán một lần',free:'Miễn phí',hypothesis:'Giá dự kiến, chưa gồm thuế · chưa mở bán.',
 starterClaim:'Bắt đầu với mã nguồn',starterAccent:'bạn có thể tùy chỉnh.',
 starterDescription:'Thử quy trình trước khi mua: bản xem trước, mã nguồn, prompt tùy chỉnh và hướng dẫn cài đặt.',
 starterBenefits:['9 mục Free: 3 phần trang, 2 điều khiển, 1 hiệu ứng và 3 hoạt ảnh','React + TypeScript · Next.js và Vite','Dự án cá nhân và khách hàng · tải không cần tài khoản'],
 starterStatus:'Mã nguồn, prompt tùy chỉnh và hướng dẫn. Không cần tài khoản.',
 starterScope:'Nội dung Free · 9 mục',
 bundleClaim:'Nhiều dự án hơn.',bundleAccent:'Nhiều lựa chọn hơn.',
 bundleDescription:'Cả 4 bộ hiện có: Product, Editorial, Playful và UI Motion. Dành cho nhiều nhu cầu và phong cách thiết kế.',
 bundleBenefits:['23 mục trả phí riêng biệt từ 4 bộ','9 phần trang, 6 điều khiển, 3 hiệu ứng và 5 hoạt ảnh','Mỗi mục có mã nguồn, prompt tùy chỉnh và hướng dẫn'],
 bundleScope:'Nội dung trả phí · 23 mục',closed:'Đang chuẩn bị',
 compareTitle:'Mỗi bộ trả phí đều có cùng tiêu chuẩn bàn giao.',
 rows:[['Thanh toán','Miễn phí','Một lần','Một lần'],['Nội dung','9 Free','6 trả phí','23 trả phí'],['Mã + prompt + hướng dẫn','Có','Có','Có'],['Dự án khách hàng','Được phép','Một người tạo','Một người tạo'],['Cập nhật chức năng','Phiên bản mới của mã miễn phí','12 tháng · mục đã mua','12 tháng · mục đã mua']],
 shared:'Tiếp tục sử dụng mã sau thời hạn cập nhật. Mục mới và bộ tương lai được bán riêng. Mọi người đều có thể dùng các mục Free.',
 upgrades:'Đã mua Product với giá $16? Nâng lên All packs với $23 trước thuế. Báo giá áp dụng ưu đãi nâng cấp hoặc sở hữu phù hợp tốt nhất.',
 other:'Cần phong cách khác? Editorial, Playful và UI Motion được bán riêng với giá $16. Giá chưa gồm thuế áp dụng.',
};
export const pricingPlansCopy:Record<AccessStatesLocale,typeof en>={en,ru,vi};
