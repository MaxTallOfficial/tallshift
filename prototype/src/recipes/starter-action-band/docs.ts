export const docs = {
  ru: `# Завершающий блок с действием (Starter Action Band, S003) — Подключение

## Что делает этот пример

Блок завершает страницу заголовком, коротким описанием и одним действием. В этом примере кнопка показывает шаги подключения под блоком; повторное нажатие скрывает их. Ничего не отправляется и не сохраняется. В своём сайте можно указать адрес ссылки или обработчик кнопки. Не обещайте отправку формы, оплату или сохранение, пока реальное действие не подключено.

## 1. Добавьте файлы

Нужен существующий React-проект с TypeScript и CSS Modules. Скопируйте весь комплект в src/recipes/starter-action-band/, сохранив вложенные папки. Начальная точка — SelectedExample.tsx. ActionBand.tsx — сама секция; Demo.tsx показывает локальное раскрытие; copy.ts содержит подписи RU/EN/VI. press-button.ts связывает секцию с включённым C001 Press Button из vendor/press-button/. Не удаляйте vendor: там кнопка, её стили, локальный tracker фокуса и подбор контрастного текста. Новых runtime-пакетов, шрифтов, изображений и удалённых скриптов нет.

## 2. Покажите пример

Импортируйте SelectedExample в страницу Vite или Next.js App Router. Интерактивные компоненты уже имеют 'use client'; делать клиентской всю страницу не нужно. Сначала проверьте пример без изменений. Сервер и первый клиентский рендер показывают одинаковое закрытое состояние инструкции. Выбранные цвет, анимация и длительность передаются в Demo. Факт наличия исходников не подтверждает работу со всеми версиями React или Next.js; выполните сборку своего проекта.

## 3. Задайте свой текст и действие

Для демо замените тексты в copy.ts. Для своей секции импортируйте ActionBand из './ActionBand' и задайте title, description и action. Для перехода передайте action={{ label: 'Открыть каталог', href: '/catalog' }}. Для локального действия передайте action={{ label: 'Показать условия', onClick: openDetails }}. У кнопки по умолчанию type='button'; type='submit' нужен только при сознательном подключении к настоящей форме. Не передавайте href и onClick одновременно: это разные варианты действия.

note — необязательная подпись. Если она отсутствует или состоит из пробелов, строка не создаётся и пустого отступа нет. Содержимое передаётся как обычный текст, без HTML-вставок. Обработчик в примере можно заменить своим; реальный pending, результат и сообщения операции задаёт ваш проект. Action поддерживает disabled, pending, pendingLabel и необязательный декоративный icon slot. Для раскрываемого раздела передайте controls и expanded, согласованные с его id и видимостью. Иконки не входят в комплект: при необходимости используйте библиотеку своего проекта без копирования приватных paths.

## Настройки и доступность

accent принимает #RRGGBB и меняет только фон кнопки. Цвет её текста выбирается для контраста. motion — off, subtle или expressive; duration — целое число 0–480 мс. Эти настройки не задерживают действие и не запускают анимацию секции автоматически. Системное уменьшение движения отключает перемещение и переходы, сохраняя текст, действие и состояние.

Дополнительные свойства доступны в коде: surface — непрозрачный HEX-фон секции с подобранным читаемым текстом; radius — 0–48 px. Поля surface/radius и редактирование содержимого не являются настройками этой страницы Tallshift. На узкой ширине действие идёт после текста, длинные подписи переносятся, фиксированной высоты нет. Минимальная область нажатия — 44 px. Кнопка и ссылка сохраняют нативную семантику, локальный фокус по способу ввода и работу без иконок.

## 4. Проверьте в своём проекте

Проверьте реальную ссылку или callback, Enter/Space, состояние раскрытия и сохранение фокуса на кнопке, отсутствие note без пустого отступа, длинные тексты на 320 px и при zoom 200%, несколько экземпляров, Strict Mode/unmount, disabled/pending и запрет повторного действия. Отдельно проверьте off, изменение reduced motion во время работы, forced colors и произвольные accent/surface. Не заменяйте встроенный C001 другой кнопкой без повторной проверки поведения.

Если используете ИИ-редактор, скопируйте запрос со вкладки «Запрос для ИИ» в своего помощника для React-проекта и передайте файлы. Сайт ничего не отправляет в ИИ автоматически. После подключения проверьте результат в своём проекте.

## Условия использования

Можно бесплатно использовать и менять этот код в своих и клиентских проектах. При распространении кода сохраните LICENSE.txt с лицензией MIT и уведомлением об авторских правах. Включённый C001 распространяется с теми же условиями. Это локальный пример, не готовый серверный сценарий и не подтверждённый коммерческий релиз.
`,
  en: `# Closing call to action (Starter Action Band, S003) — Setup

## What this example does

The section ends a page with a heading, a short description and one action. In this example, the button shows setup steps below the section; pressing it again hides them. Nothing is sent or saved. On your site, provide a link address or a button handler. Do not promise form submission, payment or saving before the real action is connected.

## 1. Add the files

You need an existing React project with TypeScript and CSS Modules. Copy the full kit into src/recipes/starter-action-band/, keeping the nested folders. Start with SelectedExample.tsx. ActionBand.tsx is the section; Demo.tsx shows the local disclosure; copy.ts contains RU/EN/VI labels. press-button.ts connects the section to the included C001 Press Button in vendor/press-button/. Keep vendor: it contains the button, its styles, local focus tracker and readable-text color helper. No extra runtime packages, fonts, images or remote scripts are needed.

## 2. Display the example

Import SelectedExample into a Vite route or Next.js App Router page. Interactive components already have 'use client'; the entire page does not need that directive. Check the example without changes first. The server and initial client render both start with the setup steps closed. Selected color, animation and duration are passed to Demo. Source availability does not prove compatibility with every React or Next.js version; build your project.

## 3. Provide your text and action

For the demo, replace text in copy.ts. For your section, import ActionBand from './ActionBand' and provide title, description and action. For navigation, use action={{ label: 'Open catalog', href: '/catalog' }}. For a local action, use action={{ label: 'Show terms', onClick: openDetails }}. Buttons default to type='button'; use type='submit' only when intentionally connecting a real form. Do not provide href and onClick together: they are separate action variants.

note is optional. When missing or blank, its element and spacing are omitted. Content is plain text, without raw HTML insertion. Replace the example callback with your action; your project owns actual pending state, results and status messages. Action supports disabled, pending, pendingLabel and an optional decorative icon slot. For disclosure, provide controls and expanded matching the section id and visibility. Icons are not included: use your project library if needed without copying private paths.

## Settings and accessibility

accent accepts #RRGGBB and changes only the button background. Its text color is selected for readable contrast. motion is off, subtle or expressive; duration is an integer from 0 to 480 ms. Settings never delay the action or animate the section automatically. System reduced motion disables movement and transitions while retaining content, action and state.

Additional code properties: surface is an opaque HEX section background with readable text selected for it; radius is 0–48 px. surface/radius and content editing are not settings on this Tallshift page. On narrow widths, the action follows the text; long labels wrap and no fixed height crops them. Targets are at least 44 px. The button and link retain native semantics, local input-modality focus and operation without icons.

## 4. Check in your project

Check the actual link or callback, Enter/Space, disclosure state and retained button focus, omitted note without blank spacing, long text at 320 px and 200% zoom, multiple instances, Strict Mode/unmount, disabled/pending and blocked repeat activation. Also check off, changing reduced motion, forced colors and arbitrary accent/surface colors. Do not replace the included C001 with a different button without rechecking behavior.

If using an AI coding tool, copy the request from the AI request tab into your assistant for the React project and provide the files. The site does not send anything to AI automatically. Check the integrated result in your project.

## Usage terms

You may use and modify this code for free in personal sites and client projects. Keep LICENSE.txt with the MIT license and copyright notice when distributing the code. The included C001 has the same terms. This is a local example, not a working server flow or an approved commercial release.
`,
  vi: `# Khối hành động cuối trang (Starter Action Band, S003) — Cài đặt

## Ví dụ này làm gì

Khối kết thúc trang bằng tiêu đề, mô tả ngắn và một hành động. Trong ví dụ, nút hiển thị các bước cài đặt bên dưới; nhấn lại để ẩn. Không gửi hoặc lưu dữ liệu. Trên website của bạn, đặt địa chỉ liên kết hoặc hàm xử lý nút. Không hứa gửi biểu mẫu, thanh toán hoặc lưu trước khi kết nối thao tác thật.

## 1. Thêm các tệp

Cần dự án React hiện có dùng TypeScript và CSS Modules. Sao chép toàn bộ bộ tệp vào src/recipes/starter-action-band/, giữ các thư mục con. Bắt đầu từ SelectedExample.tsx. ActionBand.tsx là khối giao diện; Demo.tsx mở nội dung ngay trên trang; copy.ts chứa nhãn RU/EN/VI. press-button.ts kết nối khối với C001 Press Button trong vendor/press-button/. Giữ vendor: thư mục chứa nút, CSS, bộ theo dõi tiêu điểm cục bộ và hàm chọn màu chữ dễ đọc. Không cần thêm gói runtime, phông chữ, hình ảnh hoặc script từ xa.

## 2. Hiển thị ví dụ

Nhập SelectedExample vào route Vite hoặc trang Next.js App Router. Component tương tác đã có 'use client'; không cần thêm chỉ thị này cho toàn bộ trang. Kiểm tra ví dụ trước khi sửa. Phía máy chủ và lần render đầu tiên trên client đều bắt đầu với các bước đang ẩn. Màu, hoạt ảnh và thời lượng đã chọn được truyền vào Demo. Có mã nguồn không chứng minh tương thích với mọi phiên bản React hoặc Next.js; hãy build dự án của bạn.

## 3. Đặt nội dung và thao tác

Với ví dụ, thay văn bản trong copy.ts. Với khối của bạn, nhập ActionBand từ './ActionBand' và truyền title, description, action. Để mở liên kết, dùng action={{ label: 'Mở danh mục', href: '/catalog' }}. Với thao tác cục bộ, dùng action={{ label: 'Xem điều kiện', onClick: openDetails }}. Nút mặc định có type='button'; chỉ dùng type='submit' khi chủ động kết nối biểu mẫu thật. Không truyền đồng thời href và onClick: đây là hai loại thao tác riêng.

note là chú thích tùy chọn. Khi thiếu hoặc chỉ có khoảng trắng, không tạo phần tử hay khoảng trống của chú thích. Nội dung là văn bản, không chèn HTML thô. Thay callback mẫu bằng thao tác của bạn; dự án quản lý trạng thái đang xử lý thật, kết quả và thông báo. Action hỗ trợ disabled, pending, pendingLabel và slot icon trang trí tùy chọn. Với phần mở rộng, truyền controls và expanded khớp id và trạng thái hiển thị. Không kèm biểu tượng; dùng thư viện của dự án nếu cần, không sao chép đường nét riêng tư.

## Thiết lập và khả năng truy cập

accent nhận #RRGGBB và chỉ đổi nền nút. Màu chữ được chọn để đủ tương phản. motion là off, subtle hoặc expressive; duration là số nguyên 0–480 ms. Thiết lập không trì hoãn thao tác hoặc tự chạy hoạt ảnh cho khối. Khi hệ thống bật giảm chuyển động, chuyển động và chuyển tiếp tắt nhưng nội dung, thao tác và trạng thái vẫn giữ.

Thuộc tính bổ sung trong mã: surface là màu nền HEX không trong suốt của khối, với màu chữ dễ đọc; radius là 0–48 px. surface/radius và chỉnh nội dung không phải thiết lập trên trang Tallshift này. Trên vùng hẹp, nút nằm sau văn bản; nhãn dài xuống dòng và không bị cắt bởi chiều cao cố định. Vùng nhấn ít nhất 44 px. Nút và liên kết giữ ngữ nghĩa gốc, tiêu điểm theo cách nhập và hoạt động không cần biểu tượng.

## 4. Kiểm tra trong dự án

Kiểm tra liên kết hoặc callback thật, Enter/Space, trạng thái mở và tiêu điểm còn trên nút, note bị bỏ mà không để khoảng trống, văn bản dài ở 320 px và zoom 200%, nhiều component, Strict Mode/unmount, disabled/pending và chặn thao tác lặp. Kiểm tra thêm off, thay đổi giảm chuyển động, forced colors và màu accent/surface tùy chọn. Không thay C001 đi kèm bằng nút khác mà không kiểm tra lại.

Nếu dùng công cụ lập trình AI, sao chép yêu cầu từ tab Yêu cầu cho AI vào trợ lý của dự án React và cung cấp các tệp. Trang không tự gửi nội dung đến AI. Kiểm tra kết quả tích hợp trong dự án.

## Điều kiện sử dụng

Bạn có thể dùng và sửa mã miễn phí cho website cá nhân và dự án khách hàng. Khi phân phối mã, giữ LICENSE.txt với giấy phép MIT và thông báo bản quyền. C001 đi kèm có cùng điều kiện. Đây là ví dụ cục bộ, chưa phải quy trình máy chủ hoạt động hoặc bản phát hành thương mại đã duyệt.
`,
};

export const rules = {
  ru: 'Сохрани единственное понятное действие, нативную семантику C001 и включённые vendor-исходники. href означает переход, onClick — обработчик: не смешивай их и не вкладывай интерактивные элементы в кнопку. Не изображай отправку, сохранение или оплату без реального обработчика. Сохрани type=button по умолчанию, disabled/pending с запретом повторов и сохранением фокуса, controls/expanded по реальному состоянию. Отсутствующая note не создаёт пустой строки. Не обрезай длинный текст фиксированной высотой. Сохрани читаемый текст при произвольном accent/surface, цели не меньше 44 px, pointer/keyboard focus, off, динамический reduced motion и forced colors. Секция не запускает декоративную анимацию сама. Проверь несколько экземпляров, Strict Mode/unmount, узкую ширину и реальное действие в проекте.',
  en: 'Keep one clearly named action, native C001 semantics and the included vendor source. href means navigation and onClick means a handler: do not mix them or nest interactive elements inside the button. Do not simulate sending, saving or payment without a real handler. Retain type=button by default, disabled/pending repeat prevention and focus retention, and controls/expanded matching actual state. Missing note must leave no blank row. Do not crop long text with a fixed height. Preserve readable text for arbitrary accent/surface, targets at least 44 px, pointer/keyboard focus, off, dynamic reduced motion and forced colors. The section must not animate decoratively on its own. Check multiple instances, Strict Mode/unmount, narrow widths and the real action in the host project.',
  vi: 'Giữ một hành động có tên rõ ràng, ngữ nghĩa gốc của C001 và mã vendor đi kèm. href là điều hướng, onClick là hàm xử lý: không trộn hai loại hoặc lồng phần tử tương tác trong nút. Không giả lập gửi, lưu hoặc thanh toán khi chưa có thao tác thật. Giữ type=button mặc định, disabled/pending chặn nhấn lặp và giữ tiêu điểm, controls/expanded khớp trạng thái thật. Khi không có note, không để hàng trống. Không cắt văn bản dài bằng chiều cao cố định. Giữ chữ dễ đọc với accent/surface tùy chọn, vùng nhấn ít nhất 44 px, tiêu điểm chuột/bàn phím, off, giảm chuyển động thay đổi và forced colors. Khối không tự chạy hoạt ảnh trang trí. Kiểm tra nhiều component, Strict Mode/unmount, vùng hẹp và thao tác thật trong dự án.',
};
