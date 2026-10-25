import type { AccessStatesLocale } from './access-states-copy';

/** Display strategy, not a checkout quote. IDs remain canonical; all paid offers are planned. */
export const pricingPlanScopes = {
 starter: ['S001','S002','S003','C001','C002','E001','A001','A003','A006'],
 product: ['S004','S005','S006','C003','C004','E002'],
 bundle: ['S004','S005','S006','S007','S008','S009','S010','S011','S012','C003','C004','C005','C006','C007','C008','E002','E003','E004','A002','A004','A005','A007','A008'],
} as const;
export const pricingPlanTerms = {
 starter:{offerId:'FREE-STARTER',priceMinor:0},
 product:{offerId:'PACK-PRODUCT',priceMinor:2900},
 bundle:{offerId:'BUNDLE-LAUNCH',priceMinor:7900},
} as const;
const en = {
 title:'Start free. Pick what your next project needs.',
 intro:'Pay once for a defined set of source files. Product is our focused pack for a product launch; All packs covers the wider library.',
 recommendation:'For a product launch', once:'USD · one-time · price hypothesis', free:'Free', hypothesis:'Price hypothesis before tax · sales are not open.',
 starterClaim:'Start with code',starterAccent:'you can make your own.',
 starterDescription:'Try the workflow before buying: preview, source, adaptation prompt and setup guide.',
 starterBenefits:['9 Free materials planned: 3 sections, 2 controls, 1 effect and 3 animations','React + TypeScript · Next.js and Vite','MIT source · no account needed for Free downloads'],
 starterStatus:'Only State Relay is ready in this stand. The other 8 Free materials are planned.',
 starterScope:'Planned Free contents · 9 materials',
 bundleClaim:'More projects.',bundleAccent:'More ways to build.',
 bundleDescription:'Product, Editorial, Playful and UI Motion together. For creators who need more than one style or use case.',
 bundleBenefits:['23 unique Pro materials across 4 packs','9 sections, 6 controls, 3 effects and 5 animations','Source, adaptation prompts and setup guides for every material'],
 bundleScope:'Planned Pro contents · 23 materials', closed:'In preparation',
 compareTitle:'The same delivery standard in every paid pack.',
 rows:[['Payment','Free','One-time','One-time'],['Planned materials','9 Free','6 Pro','23 Pro'],['Source + prompt + guide','Included','Included','Included'],['Use in client projects','MIT terms','One creator','One creator'],['Functional updates','Published Free releases','12 months · purchased materials','12 months · purchased materials']],
 shared:'Keep using the code after the update window. New materials and future packs are separate. Free materials are available to everyone.',
 upgrades:'Already own a pack? Checkout will exclude materials you already own using a server quote; it is not simply the difference between the two sticker prices.',
 other:'Need a different style? Editorial, Playful and UI Motion are planned as separate $29 packs. All prices are assumptions, before tax.',
};
const ru:typeof en = {
 title:'Начните бесплатно. Выберите набор под свой проект.',
 intro:'Разовая покупка конкретного комплекта исходников. Product — для запуска продукта. All packs — для разных задач и стилей.',
 recommendation:'Для запуска продукта',once:'USD · разово · гипотеза цены',free:'Бесплатно',hypothesis:'Гипотеза цены до налогов · продажи ещё не открыты.',
 starterClaim:'Начните с кода,',starterAccent:'который станет вашим.',
 starterDescription:'Проверьте весь путь до покупки: превью, исходники, промпт адаптации и инструкция.',
 starterBenefits:['В плане 9 Free: 3 секции, 2 элемента управления, 1 эффект и 3 анимации','React + TypeScript · Next.js и Vite','Код по MIT · скачивание Free без аккаунта'],
 starterStatus:'В стенде готов только State Relay. Остальные 8 Free-материалов запланированы.',
 starterScope:'Плановый бесплатный состав · 9 материалов',
 bundleClaim:'Больше проектов.',bundleAccent:'Больше вариантов.',
 bundleDescription:'Product, Editorial, Playful и UI Motion вместе. Для тех, кто работает с разными задачами и стилями.',
 bundleBenefits:['23 уникальных Pro-материала из 4 наборов','9 секций, 6 элементов управления, 3 эффекта и 5 анимаций','Исходники, промпт адаптации и инструкция к каждому материалу'],
 bundleScope:'Плановый платный состав · 23 материала',closed:'В подготовке',
 compareTitle:'Единый стандарт комплекта в каждом платном наборе.',
 rows:[['Оплата','Бесплатно','Разово','Разово'],['Плановый состав','9 Free','6 Pro','23 Pro'],['Код + промпт + инструкция','Включены','Включены','Включены'],['Клиентские проекты','По условиям MIT','Один автор','Один автор'],['Функциональные обновления','Публикуемые Free-релизы','12 месяцев · купленные материалы','12 месяцев · купленные материалы']],
 shared:'Полученный код можно использовать и после окна обновлений. Новые материалы и будущие наборы приобретаются отдельно. Бесплатные материалы доступны всем.',
 upgrades:'Уже есть набор? Сервер исключит из расчёта купленные материалы. Доплата рассчитывается по составу, а не как простая разница цен на карточках.',
 other:'Нужен другой стиль? Editorial, Playful и UI Motion планируются отдельно по $29. Все цены — гипотезы до налогов.',
};
const vi:typeof en = {
 title:'Bắt đầu miễn phí. Chọn bộ phù hợp với dự án.',
 intro:'Thanh toán một lần cho bộ mã nguồn xác định. Product dành cho việc ra mắt sản phẩm; All packs bao gồm nhiều phong cách hơn.',
 recommendation:'Dành cho ra mắt sản phẩm',once:'USD · một lần · giá dự kiến',free:'Miễn phí',hypothesis:'Giá dự kiến, chưa gồm thuế · chưa mở bán.',
 starterClaim:'Bắt đầu với mã nguồn',starterAccent:'bạn có thể tùy chỉnh.',
 starterDescription:'Thử quy trình trước khi mua: bản xem trước, mã nguồn, prompt tùy chỉnh và hướng dẫn cài đặt.',
 starterBenefits:['Dự kiến 9 mục Free: 3 phần trang, 2 điều khiển, 1 hiệu ứng và 3 hoạt ảnh','React + TypeScript · Next.js và Vite','Mã nguồn MIT · tải Free không cần tài khoản'],
 starterStatus:'Hiện chỉ State Relay đã sẵn sàng. 8 mục Free còn lại đang được lên kế hoạch.',
 starterScope:'Nội dung Free dự kiến · 9 mục',
 bundleClaim:'Nhiều dự án hơn.',bundleAccent:'Nhiều lựa chọn hơn.',
 bundleDescription:'Product, Editorial, Playful và UI Motion trong cùng một bộ. Dành cho nhiều nhu cầu và phong cách thiết kế.',
 bundleBenefits:['23 mục Pro riêng biệt từ 4 bộ','9 phần trang, 6 điều khiển, 3 hiệu ứng và 5 hoạt ảnh','Mỗi mục có mã nguồn, prompt tùy chỉnh và hướng dẫn'],
 bundleScope:'Nội dung Pro dự kiến · 23 mục',closed:'Đang chuẩn bị',
 compareTitle:'Mỗi bộ trả phí đều có cùng tiêu chuẩn bàn giao.',
 rows:[['Thanh toán','Miễn phí','Một lần','Một lần'],['Nội dung dự kiến','9 Free','6 Pro','23 Pro'],['Mã + prompt + hướng dẫn','Có','Có','Có'],['Dự án khách hàng','Theo MIT','Một người tạo','Một người tạo'],['Cập nhật chức năng','Bản Free được công bố','12 tháng · mục đã mua','12 tháng · mục đã mua']],
 shared:'Tiếp tục sử dụng mã sau thời hạn cập nhật. Mục mới và bộ tương lai được bán riêng. Mọi người đều có thể dùng các mục Free.',
 upgrades:'Đã sở hữu một bộ? Máy chủ sẽ loại các mục đã mua khỏi báo giá. Khoản thanh toán không chỉ là hiệu số giữa hai mức giá niêm yết.',
 other:'Cần phong cách khác? Editorial, Playful và UI Motion dự kiến được bán riêng với giá $29. Mọi mức giá đều là dự kiến, chưa gồm thuế.',
};
export const pricingPlansCopy:Record<AccessStatesLocale,typeof en>={en,ru,vi};
