export const docs = {
  ru: `# Вкладки для переключения содержимого (Content Tabs, C002) — Подключение

## Что делает пример

Вкладки переключают связанные разделы в одной области страницы. Код работает в существующем React-проекте с TypeScript и CSS Modules. В примере три раздела; компонент принимает от двух до шести. Можно бесплатно использовать и изменять код в своих и клиентских проектах. При распространении кода сохраните LICENSE.txt с лицензией MIT и уведомлением об авторских правах.

## 1. Добавьте файлы

Скопируйте весь комплект в src/recipes/content-tabs/, сохранив структуру. Начните с SelectedExample.tsx: он показывает Demo с выбранными цветом и анимацией. ContentTabs.tsx — сам компонент, tabs-model.ts — правила клавиатуры, useInputModality.ts — локальное оформление фокуса. Все эти файлы и CSS включены. Новые runtime-пакеты, удалённые скрипты, изображения и шрифты не нужны. React, TypeScript и поддержка CSS Modules уже должны быть в проекте.

## 2. Покажите пример

Импортируйте SelectedExample в страницу Vite или Next.js App Router. Интерактивные файлы имеют 'use client'; делать клиентской всю страницу не требуется. Сначала проверьте пример без изменений. SSR и первый клиентский рендер выбирают одинаковую начальную вкладку; браузерные измерения выполняются только после монтирования. Цвет, длительность и режим анимации записаны в config.json и SelectedExample.tsx. Факт наличия исходников не подтверждает совместимость со всеми версиями Next.js/Vite; выполните сборку своего проекта.

## 3. Замените содержимое

Замените названия и текст разделов в copy.ts. Разметку панелей можно изменить в Demo.tsx. Для своего оформления импортируйте ContentTabs напрямую. Передайте label — понятное доступное имя группы — и tabs с уникальными непустыми id, label и content. Допустимо 2–6 вкладок. Названия и содержимое — ReactNode, задаваемые в коде, а не HTML или исполняемый пользовательский текст.

\`\`\`tsx
<ContentTabs
  label="Разделы продукта"
  defaultValue="overview"
  tabs={[
    { id: 'overview', label: 'Обзор', content: <p>Описание продукта.</p> },
    { id: 'setup', label: 'Подключение', content: <p>Инструкция подключения.</p> },
  ]}
/>
\`\`\`

## 4. Выберите управление и расположение

Без value компонент хранит выбранную вкладку сам; defaultValue задаёт начальную. Для управления из родителя передайте value и onValueChange и обновляйте value в обработчике. Если текущего id больше нет, показывается первая вкладка. Не переключайте один экземпляр между управляемым и неуправляемым режимами. По умолчанию orientation="horizontal"; orientation="vertical" ставит список слева. На узком экране горизонтально прокручивается только полоса вкладок. Для горизонтальных вкладок стрелки влево/вправо выбирают соседний раздел, для вертикальных — вверх/вниз. Home и End выбирают первый/последний; выбор зациклен. Tab выходит к активной панели, а затем к её действиям. Контент загружается локально, поэтому выбор происходит сразу при движении фокуса.

## Сохраните поведение и доступность

Не удаляйте role, aria-selected, aria-controls, aria-labelledby, скрытие неактивных панелей и уникальные useId. Все панели остаются смонтированы, но неактивные имеют hidden и недоступны клавиатуре. Их состояние сохраняется между переключениями. Не помещайте отдельные ссылки или кнопки внутрь подписи вкладки. Не привязывайте бизнес-логику к завершению анимации. Если панель загружает данные с задержкой, нужен отдельно разработанный режим ручной активации; этот пример рассчитан на готовое локальное содержимое.

## Цвет, движение и фокус

accent меняет линию у выбранной вкладки. Текст сохраняет основной цвет, а отдельная контрастная рамка обозначает выбор даже при совпадении цвета линии с фоном. duration — целое число 0–480 миллисекунд. При motion="off" и системном уменьшении анимации линия меняет положение сразу, без перехода; выбранная вкладка и доступность сохраняются. Локальный tracker различает мышь и клавиатуру, не снимает реальный фокус и не изменяет html/body. ResizeObserver и слушатели ввода удаляются при размонтировании; при отсутствии ResizeObserver используется локальный обработчик resize. Наблюдатель и обработчики берут документ и окно из корня компонента, поэтому пример работает во вложенном документе. Иконки не требуются и не включены.

## Проверьте перед публикацией

Проверьте обе ориентации, 2 и 6 вкладок, длинные названия на 320 px, прокрутку полосы, Tab/Shift+Tab, стрелки/Home/End, мышь и touch, два экземпляра, управляемый режим, удаление выбранного раздела, сохранение состояния панели, SSR/hydration, unmount/Strict Mode, motion="off", динамическое системное уменьшение анимации, forced colors и RU/EN/VI. Выполните typecheck/build в целевом проекте. Это локальный пример с исходниками, а не обещание результатов ещё не выполненных проверок.

## Запрос для ИИ

Скопируйте запрос со вкладки «Запрос для ИИ» в своего ИИ-помощника для React-проекта и передайте файлы. Проверьте изменения и результат в проекте. Сайт не устанавливает код и не отправляет запрос автоматически.
`,
  en: `# Content tabs / C002 — Setup

## What this example does

Tabs switch related sections within one area of a page. Use the code in an existing React project with TypeScript and CSS Modules. The example has three sections; the component accepts two to six. You can use and modify the code free of charge in your own and client projects. When distributing the code, keep LICENSE.txt with its MIT license and copyright notice.

## 1. Add the files

Copy the complete bundle into src/recipes/content-tabs/, keeping its structure. Start with SelectedExample.tsx: it displays Demo with the selected color and animation. ContentTabs.tsx is the component, tabs-model.ts contains keyboard rules, and useInputModality.ts scopes the focus appearance. All these files and their CSS are included. No additional runtime packages, remote scripts, images or fonts are needed. Your project must already provide React, TypeScript and CSS Modules support.

## 2. Display the example

Import SelectedExample into a Vite route or Next.js App Router page. Interactive files have 'use client'; the entire page does not need to be a client component. Try the example unchanged first. SSR and the initial client render select the same starting tab; browser measurements run only after mounting. The selected color, duration and animation mode are stored in config.json and SelectedExample.tsx. Included source does not establish compatibility with every Next.js/Vite version; build your own project.

## 3. Replace the content

Replace the section labels and text in copy.ts. Change the panel markup in Demo.tsx if needed. To compose your own layout, import ContentTabs directly. Provide label, a clear accessible group name, and tabs with unique nonempty id, label and content values. Two to six tabs are supported. Labels and content are ReactNode values supplied in code, rather than HTML or executable user input.

\`\`\`tsx
<ContentTabs
  label="Product sections"
  defaultValue="overview"
  tabs={[
    { id: 'overview', label: 'Overview', content: <p>Product details.</p> },
    { id: 'setup', label: 'Setup', content: <p>Setup instructions.</p> },
  ]}
/>
\`\`\`

## 4. Choose state ownership and orientation

Without value, the component manages selection itself; defaultValue sets the initial selection. To control it from a parent, supply value and onValueChange and update value in the handler. If the selected id no longer exists, the first tab is displayed. Do not switch an instance between controlled and uncontrolled modes. The default orientation="horizontal" places tabs across the top; orientation="vertical" places them on the left. On narrow screens, only the horizontal tab strip scrolls. Left/right arrows select adjacent horizontal tabs; up/down arrows select adjacent vertical tabs. Home and End select the first/last tab; selection wraps. Tab moves to the active panel and then its actions. Content is local and ready, so moving focus selects it immediately.

## Keep behavior and accessibility

Retain roles, aria-selected, aria-controls, aria-labelledby, hidden inactive panels and unique useId values. All panels stay mounted, but inactive panels have hidden and cannot receive keyboard focus. Panel state survives switching. Do not place links or buttons inside tab labels. Business logic must not wait for animation. A panel that loads slowly needs a separately designed manual activation mode; this example assumes ready local content.

## Color, motion and focus

accent colors the selection line. Text keeps its primary color, and a separate contrasting border marks selection even when the line matches the background. duration is an integer from 0 to 480 milliseconds. With motion="off" or the system setting to reduce motion, the line changes position immediately without a transition; selection and accessibility are preserved. The local input tracker distinguishes pointer and keyboard without blurring controls or changing html/body. ResizeObserver and input listeners are removed on unmount; a local resize handler is used when ResizeObserver is unavailable. Observers and listeners use the component root's document and window, including inside a nested document. Icons are not required or included.

## Check before publishing

Check both orientations, two and six tabs, long labels at 320 px, strip scrolling, Tab/Shift+Tab, arrows/Home/End, pointer and touch, two instances, controlled mode, removing the selected section, panel state preservation, SSR/hydration, unmount/Strict Mode, motion="off", dynamic system reduced motion, forced colors and RU/EN/VI. Run typecheck/build in the target project. This is a local source example, not a claim that checks not yet performed have passed.

## AI request

Copy the request from the AI request tab into your React project's AI coding assistant and provide these files. Review the changes and test the result. The site does not install code or send the request automatically.
`,
  vi: `# Tab nội dung (Content Tabs, C002) — Cài đặt

## Ví dụ này làm gì

Tab chuyển các phần nội dung liên quan trong cùng một vùng của trang. Mã dành cho dự án React hiện có với TypeScript và CSS Modules. Ví dụ có ba phần; component hỗ trợ từ hai đến sáu tab. Bạn có thể dùng và sửa mã miễn phí cho dự án cá nhân và khách hàng. Khi phân phối mã, hãy giữ LICENSE.txt với giấy phép MIT và thông báo bản quyền.

## 1. Thêm các tệp

Sao chép toàn bộ bộ tệp vào src/recipes/content-tabs/, giữ nguyên cấu trúc. Bắt đầu từ SelectedExample.tsx: tệp này hiển thị Demo với màu và hoạt ảnh đã chọn. ContentTabs.tsx là component, tabs-model.ts chứa quy tắc bàn phím, useInputModality.ts quản lý cách hiển thị tiêu điểm trong component. Bộ mã đã có các tệp này và CSS. Không cần thêm gói runtime, script từ xa, hình ảnh hoặc phông chữ. Dự án phải có React, TypeScript và hỗ trợ CSS Modules.

## 2. Hiển thị ví dụ

Nhập SelectedExample vào route Vite hoặc trang Next.js App Router. Tệp tương tác đã có 'use client'; không cần chuyển toàn bộ trang thành client component. Trước tiên hãy thử ví dụ chưa chỉnh sửa. SSR và lần render đầu trên client chọn cùng một tab; phép đo trong trình duyệt chỉ chạy sau khi mount. Màu, thời lượng và chế độ hoạt ảnh đã chọn nằm trong config.json và SelectedExample.tsx. Có mã nguồn không có nghĩa là tương thích với mọi phiên bản Next.js/Vite; hãy build dự án của bạn.

## 3. Thay nội dung

Thay tên và văn bản của các phần trong copy.ts. Có thể đổi cấu trúc phần nội dung trong Demo.tsx. Để tạo bố cục riêng, nhập ContentTabs trực tiếp. Truyền label là tên nhóm dễ hiểu cho công nghệ hỗ trợ, cùng tabs có id không rỗng và không trùng, label và content. Hỗ trợ 2–6 tab. Tên và nội dung là ReactNode được khai báo trong mã, không phải HTML hoặc nội dung thực thi do người dùng nhập.

\`\`\`tsx
<ContentTabs
  label="Các phần của sản phẩm"
  defaultValue="overview"
  tabs={[
    { id: 'overview', label: 'Tổng quan', content: <p>Mô tả sản phẩm.</p> },
    { id: 'setup', label: 'Cài đặt', content: <p>Hướng dẫn cài đặt.</p> },
  ]}
/>
\`\`\`

## 4. Chọn cách quản lý và bố cục

Khi không có value, component tự quản lý tab đang chọn; defaultValue đặt tab ban đầu. Để điều khiển từ component cha, truyền value và onValueChange, rồi cập nhật value trong hàm xử lý. Nếu id đang chọn không còn tồn tại, tab đầu tiên được hiển thị. Không đổi một component giữa chế độ được điều khiển và tự quản lý. Mặc định orientation="horizontal" đặt tab theo hàng ngang; orientation="vertical" đặt danh sách bên trái. Trên màn hình hẹp, chỉ thanh tab ngang cuộn. Mũi tên trái/phải chọn tab ngang liền kề; lên/xuống chọn tab dọc. Home và End chọn tab đầu/cuối; danh sách được lặp vòng. Tab chuyển tới phần nội dung đang mở, rồi tới thao tác bên trong. Nội dung cục bộ đã sẵn sàng nên việc di chuyển tiêu điểm chọn nội dung ngay.

## Giữ cách hoạt động và khả năng truy cập

Giữ role, aria-selected, aria-controls, aria-labelledby, hidden cho phần không hoạt động và useId riêng. Các phần vẫn được mount; phần không hoạt động có hidden và không thể nhận tiêu điểm bàn phím. Trạng thái bên trong được giữ khi đổi tab. Không đặt liên kết hoặc nút trong tên tab. Không để logic ứng dụng phải chờ hoạt ảnh. Phần tải dữ liệu chậm cần chế độ kích hoạt thủ công được thiết kế riêng; ví dụ này dành cho nội dung cục bộ sẵn có.

## Màu, chuyển động và tiêu điểm

accent đổi màu đường chỉ báo. Chữ giữ màu chính và một đường viền tương phản riêng đánh dấu tab đang chọn, kể cả khi đường chỉ báo trùng màu nền. duration là số nguyên 0–480 mili giây. Với motion="off" hoặc cài đặt giảm chuyển động của hệ thống, đường chỉ báo đổi vị trí ngay mà không có hoạt ảnh; lựa chọn và khả năng truy cập được giữ nguyên. Bộ theo dõi đầu vào phân biệt chuột và bàn phím, không làm mất tiêu điểm hoặc thay đổi html/body. ResizeObserver và trình lắng nghe đầu vào được xóa khi unmount; nếu không có ResizeObserver, dùng trình xử lý resize cục bộ. Trình quan sát và lắng nghe dùng document và window của phần tử gốc, kể cả trong tài liệu lồng nhau. Không cần và không kèm biểu tượng.

## Kiểm tra trước khi xuất bản

Kiểm tra cả hai hướng, 2 và 6 tab, tên dài ở 320 px, cuộn thanh tab, Tab/Shift+Tab, mũi tên/Home/End, chuột và cảm ứng, hai component, chế độ được điều khiển, xóa phần đang chọn, giữ trạng thái nội dung, SSR/hydration, unmount/Strict Mode, motion="off", thay đổi giảm chuyển động hệ thống, forced colors và RU/EN/VI. Chạy typecheck/build trong dự án đích. Đây là ví dụ mã nguồn cục bộ, không phải khẳng định các kiểm tra chưa thực hiện đã thành công.

## Yêu cầu cho AI

Sao chép yêu cầu từ tab Yêu cầu cho AI vào trợ lý lập trình AI của dự án React và cung cấp các tệp này. Xem lại thay đổi và kiểm tra kết quả. Trang không tự cài mã hoặc gửi yêu cầu.
`,
};

export const rules = {
  ru: 'Сохрани нативные кнопки вкладок, tablist/tab/tabpanel и уникальные связи useId. Произвольный accent меняет только линию: основной текст и отдельная контрастная рамка сохраняют читаемость и различимость выбора. Поддержи 2–6 уникальных id, controlled/uncontrolled API, автоматическую активацию стрелками с wrap, Home/End и Tab. Неактивные панели должны оставаться hidden без фокуса; бизнес-логика и контент не ждут анимации. При off/reduced motion линия меняет положение сразу без анимации. Сохрани локальный tracker ввода без blur/global outline, ResizeObserver/resize cleanup, independent instances и SSR-visible выбранный контент. Не добавляй сетевую загрузку или fake данные в пример. При необходимости медленно загружаемых панелей отдельно спроектируй manual activation вместо изменения текущего контракта без проверки.',
  en: 'Preserve native tab buttons, tablist/tab/tabpanel and unique useId associations. Arbitrary accent colors affect only the line: primary text and a separate contrasting border must keep selection readable and distinguishable. Keep two to six unique IDs, controlled/uncontrolled APIs, automatic arrow activation with wrapping, Home/End and Tab. Inactive panels must stay hidden and unfocusable; content and business logic must not wait for animation. Off/reduced motion moves the line to its new position without animation. Retain the local input tracker without blur/global outline, ResizeObserver/resize cleanup, independent instances and SSR-visible selected content. Do not add network loading or fabricated data to the example. Slowly loaded panels need a separately designed manual activation mode rather than an unverified change to this contract.',
  vi: 'Giữ button gốc, tablist/tab/tabpanel và liên kết useId riêng. Màu accent tùy ý chỉ đổi đường chỉ báo; chữ chính và đường viền tương phản riêng phải giữ tab đang chọn dễ đọc và dễ nhận biết. Giữ 2–6 id không trùng, API được điều khiển/tự quản lý, tự chọn bằng mũi tên có lặp vòng, Home/End và Tab. Phần không hoạt động phải hidden và không nhận tiêu điểm; nội dung và logic không chờ hoạt ảnh. Off/reduced motion đổi vị trí đường chỉ báo ngay mà không có hoạt ảnh. Giữ bộ theo dõi đầu vào cục bộ, không blur/tắt outline toàn cục, cleanup ResizeObserver/resize, component độc lập và nội dung đang chọn hiển thị qua SSR. Không thêm tải qua mạng hoặc dữ liệu giả vào ví dụ. Nội dung tải chậm cần chế độ kích hoạt thủ công được thiết kế riêng, không tự đổi hợp đồng hiện tại khi chưa kiểm tra.',
};
