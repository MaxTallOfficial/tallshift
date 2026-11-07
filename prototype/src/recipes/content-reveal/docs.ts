export const docs = {
  ru: `# Плавное появление содержимого (Content Reveal, E001) — Подключение

## Что делает этот пример

Текст или блок получает короткий эффект появления, когда входит в видимую область страницы. Содержимое уже есть на странице: анимация не загружает его и не открывает доступ к данным. Без JavaScript, при отключённой анимации, системном уменьшении движения или сбое браузерного API блок остаётся видимым. Можно бесплатно использовать и менять код в своих и клиентских проектах. При распространении сохраните LICENSE.txt с лицензией MIT и уведомлением об авторских правах.

## 1. Добавьте файлы

Нужен существующий React-проект с TypeScript и CSS Modules. Скопируйте весь комплект в src/recipes/content-reveal/, сохранив структуру. Начните с SelectedExample.tsx: он передаёт выбранные режим и длительность в Demo.tsx. ContentReveal.tsx — оболочка для вашего содержимого, reveal-controller.ts — локальный запуск и остановка эффекта. Иконки, шрифты, изображения, удалённые скрипты и новые runtime-пакеты не нужны. Не обновляйте зависимости до latest ради подключения.

## 2. Покажите пример

Импортируйте SelectedExample в страницу Vite или Next.js App Router. У интерактивных файлов уже есть 'use client'; не нужно делать клиентской всю страницу. Серверная разметка и первый рендер показывают содержимое без скрывающего класса. Браузерные API подключаются после монтирования через ownerDocument корня. В демонстрации прокрутите собственное окно или нажмите «Показать содержимое». «Вернуть в начало» возвращает окно наверх и пересоздаёт пример для повторного просмотра; это действие демо, а не автоматический цикл.

## 3. Подключите своё содержимое

Вместо Demo импортируйте { ContentReveal } из './ContentReveal' и оберните текст или блок в <ContentReveal><YourContent /></ContentReveal>. Дочерняя разметка сохраняет свои заголовки, ссылки, действия и порядок клавиатуры. Не назначайте этому эффекту задачу скрытия данных. Оболочка не перехватывает прокрутку страницы и не меняет фокус. Если пользователь переходит к действию внутри блока с клавиатуры, движение завершается сразу.

## Настройки

В странице примера меняются режим анимации и длительность от 0 до 600 мс. Цвета у самого эффекта нет. Выбранные значения находятся в config.json и SelectedExample.tsx. В кодовом API доступны once (по умолчанию true), distance от 0 до 24 px (по умолчанию 16), duration от 0 до 600 мс (по умолчанию 240) и motion: off/subtle/expressive. В subtle расстояние ограничено 12 px; expressive использует выбранное расстояние. once=false разрешает повторный эффект после выхода и нового входа в видимую область. Даже вне неё блок не получает opacity:0. При duration=0 или motion=off движение отсутствует.

## Сохраните поведение и доступность

IntersectionObserver определяет вход во viewport с учётом прокручиваемых предков. Web Animations создаёт только временный эффект без постоянного скрывающего стиля. Системное уменьшение движения, resize и переход фокуса внутрь блока отменяют движение и сохраняют видимое содержимое. Не задерживайте действия до animation.finished. При unmount или смене настроек отключаются только наблюдатель, слушатели и анимация этого экземпляра; отменённый finished обрабатывается. Несколько экземпляров независимы. Если браузер не поддерживает API или запуск эффекта не удался, остаётся обычный видимый блок.

## 4. Проверьте в своём проекте

Проверьте вход/выход при обычной прокрутке, once=true/false, два экземпляра, resize, unmount/Strict Mode, недоступный IntersectionObserver/animate, motion=off, duration=0 и динамическое системное уменьшение движения. Проверьте SSR без JavaScript, клавиатуру, 320 px/200% zoom, RU/EN/VI и forced colors. Запустите typecheck/build своего проекта: комплект исходников не доказывает совместимость со всеми версиями React/Next.js/Vite. Инструкция не обещает отдельный framework-free script.

Если работаете с ИИ, скопируйте запрос со вкладки «Запрос для ИИ» в ИИ-помощника своего React-проекта вместе с файлами. Сайт не отправляет его автоматически. Попросите сохранить видимое исходное состояние, локальные исходники, cleanup и доступность.
`,
  en: `# Content fade-in (Content Reveal, E001) — Setup

## What this example does

Text or a block receives a brief entrance effect when it enters the visible area. The content is already on the page: animation does not load it or grant access to data. Without JavaScript, with animation off, reduced motion or a failed browser API, the block stays visible. You may use and modify the code for personal and client projects for free. Keep LICENSE.txt with the MIT license and copyright notice when distributing the code.

## 1. Add the files

Use an existing React project with TypeScript and CSS Modules. Copy the entire kit into src/recipes/content-reveal/ and retain its structure. Start with SelectedExample.tsx: it passes the selected motion and duration to Demo.tsx. ContentReveal.tsx wraps your content; reveal-controller.ts starts and stops the local effect. No icons, fonts, images, remote scripts or extra runtime packages are needed. Do not update dependencies to latest just to add the example.

## 2. Display the example

Import SelectedExample into a Vite page or Next.js App Router page. Interactive files already have 'use client'; the whole page does not need to become a client component. Server markup and the first client render show the content without a hiding class. Browser APIs attach after mounting through the root's ownerDocument. In the demo, scroll its own window or press “Show content”. “Back to the start” returns that window to the top and remounts the example for another view; this is a demo action, not an automatic loop.

## 3. Add your content

Instead of Demo, import { ContentReveal } from './ContentReveal' and wrap text or a block in <ContentReveal><YourContent /></ContentReveal>. Child markup retains its headings, links, actions and keyboard order. Do not use this effect to hide data. The wrapper does not intercept page scrolling or move focus. When a keyboard user reaches an action within the block, movement stops immediately.

## Settings

The example page changes the motion mode and duration from 0 to 600 ms. The effect has no color setting. Selected values are in config.json and SelectedExample.tsx. The code API also accepts once (true by default), distance from 0 to 24 px (default 16), duration from 0 to 600 ms (default 240) and motion: off/subtle/expressive. Subtle caps distance at 12 px; expressive uses the selected distance. once=false allows a new effect after leaving and re-entering the visible area. The block never receives opacity:0, even outside that area. duration=0 and motion=off produce no movement.

## Keep behavior and accessibility

IntersectionObserver detects viewport entry, including clipping by scrollable ancestors. Web Animations applies only a temporary effect without a permanent hiding style. System reduced motion, resize and focus moving into the block cancel movement while preserving visible content. Never delay actions until animation.finished. Unmounting or changing settings disconnects only this instance's observer, listeners and animation; cancelled finished promises are handled. Multiple instances stay independent. Missing or failed APIs leave an ordinary visible block.

## 4. Check in your project

Check normal scroll entry/exit, once=true/false, two instances, resize, unmount/Strict Mode, missing IntersectionObserver/animate, motion=off, duration=0 and changing system reduced motion. Check SSR without JavaScript, keyboard use, 320 px/200% zoom, RU/EN/VI and forced colors. Run your project's typecheck/build: included source does not prove compatibility with every React/Next.js/Vite version. A separate framework-free script is not promised.

If using an AI coding tool, copy the AI request tab text into the assistant for your React project together with the files. The site does not send it automatically. Keep the initially visible content, local source, cleanup and accessibility.
`,
  vi: `# Hiện nội dung (Content Reveal, E001) — Cài đặt

## Ví dụ này làm gì

Văn bản hoặc khối có hiệu ứng xuất hiện ngắn khi đi vào vùng hiển thị. Nội dung đã có trên trang: hoạt ảnh không tải nội dung hoặc cấp quyền truy cập dữ liệu. Khi không có JavaScript, tắt hoạt ảnh, bật giảm chuyển động hoặc API trình duyệt gặp lỗi, khối vẫn hiển thị. Bạn có thể dùng và sửa mã miễn phí cho dự án cá nhân và khách hàng. Khi phân phối mã, giữ LICENSE.txt với giấy phép MIT và thông báo bản quyền.

## 1. Thêm các tệp

Cần dự án React hiện có dùng TypeScript và CSS Modules. Sao chép toàn bộ bộ tệp vào src/recipes/content-reveal/ và giữ nguyên cấu trúc. Bắt đầu từ SelectedExample.tsx: tệp truyền chế độ và thời lượng đã chọn vào Demo.tsx. ContentReveal.tsx bao nội dung của bạn; reveal-controller.ts chạy và dừng hiệu ứng cục bộ. Không cần biểu tượng, phông chữ, hình ảnh, script từ xa hoặc gói runtime mới. Không nâng cấp dependency lên latest chỉ để thêm ví dụ.

## 2. Hiển thị ví dụ

Nhập SelectedExample vào trang Vite hoặc Next.js App Router. Các tệp tương tác đã có 'use client'; không cần biến toàn bộ trang thành client component. Mã phía máy chủ và lần render đầu đều hiển thị nội dung, không dùng lớp ẩn. API trình duyệt được kết nối sau mount qua ownerDocument của phần tử gốc. Trong ví dụ, cuộn cửa sổ riêng hoặc nhấn “Hiển thị nội dung”. “Về đầu” đưa cửa sổ lên đầu và tạo lại ví dụ để xem lần nữa; đây là thao tác minh họa, không phải vòng lặp tự động.

## 3. Thêm nội dung của bạn

Thay Demo bằng { ContentReveal } từ './ContentReveal' rồi đặt văn bản hoặc khối trong <ContentReveal><YourContent /></ContentReveal>. Phần tử con giữ tiêu đề, liên kết, thao tác và thứ tự bàn phím. Không dùng hiệu ứng này để ẩn dữ liệu. Lớp bao không chiếm quyền cuộn trang hoặc di chuyển tiêu điểm. Khi người dùng bàn phím tới thao tác trong khối, chuyển động dừng ngay.

## Thiết lập

Trang ví dụ đổi chế độ hoạt ảnh và thời lượng từ 0 đến 600 ms. Hiệu ứng không có thiết lập màu. Giá trị đã chọn nằm trong config.json và SelectedExample.tsx. API trong mã có once (mặc định true), distance từ 0 đến 24 px (mặc định 16), duration từ 0 đến 600 ms (mặc định 240) và motion: off/subtle/expressive. Subtle giới hạn khoảng dịch chuyển ở 12 px; expressive dùng khoảng đã chọn. once=false cho phép chạy lại sau khi khối rời rồi đi vào vùng hiển thị. Khối không bị đặt opacity:0, kể cả ở ngoài vùng này. duration=0 và motion=off không tạo chuyển động.

## Giữ cách hoạt động và khả năng truy cập

IntersectionObserver xác định lúc vào viewport, có tính đến phần bị cắt bởi vùng cuộn cha. Web Animations chỉ tạo hiệu ứng tạm thời, không để lại kiểu ẩn cố định. Giảm chuyển động của hệ thống, resize và tiêu điểm đi vào khối sẽ hủy chuyển động, vẫn giữ nội dung hiển thị. Không trì hoãn thao tác để đợi animation.finished. Khi unmount hoặc đổi thiết lập, chỉ observer, listener và animation của instance đó được dọn; Promise finished bị hủy được xử lý. Nhiều instance độc lập. Khi thiếu API hoặc hiệu ứng lỗi, khối bình thường vẫn hiển thị.

## 4. Kiểm tra trong dự án

Kiểm tra vào/ra khi cuộn, once=true/false, hai instance, resize, unmount/Strict Mode, thiếu IntersectionObserver/animate, motion=off, duration=0 và thay đổi giảm chuyển động hệ thống. Kiểm tra SSR khi không có JavaScript, bàn phím, 320 px/zoom 200%, RU/EN/VI và forced colors. Chạy typecheck/build của dự án: mã đi kèm không chứng minh tương thích với mọi phiên bản React/Next.js/Vite. Không hứa cung cấp script riêng không cần framework.

Nếu dùng công cụ lập trình AI, sao chép nội dung tab Yêu cầu cho AI vào trợ lý của dự án React cùng các tệp. Trang không tự gửi yêu cầu. Giữ nội dung hiển thị từ đầu, mã nguồn cục bộ, cleanup và khả năng truy cập.
`,
} as const;

export const rules = {
  ru: 'Сохрани видимое SSR/исходное содержимое и нативную семантику children. IntersectionObserver запускает временный эффект при входе во viewport; не добавляй opacity:0 в resting DOM, таймеры, scroll hijacking или ожидание анимации для действий. Сохрани once/re-entry, динамический off/reduce, завершение при resize/focus, fallback при отсутствии API, независимость экземпляров и полный cleanup observer/listeners/animations с обработкой cancelled finished. Длительность 0–600 мс, расстояние 0–24 px; цвета у эффекта нет.',
  en: 'Keep visible SSR/initial content and native child semantics. IntersectionObserver triggers a temporary viewport entrance; do not add opacity:0 to resting DOM, timers, scroll hijacking or action delays for animation. Preserve once/re-entry, dynamic off/reduce, cancellation on resize/focus, missing-API fallback, independent instances and complete observer/listener/animation cleanup with cancelled finished handling. Duration 0–600 ms, distance 0–24 px; the effect has no color setting.',
  vi: 'Giữ nội dung SSR/ban đầu hiển thị và ngữ nghĩa gốc của phần tử con. IntersectionObserver tạo hiệu ứng tạm thời khi đi vào viewport; không đặt opacity:0 cố định, thêm timer, chiếm cuộn hoặc trì hoãn thao tác để chờ hoạt ảnh. Giữ once/re-entry, off/reduce động, hủy khi resize/focus, fallback thiếu API, instance độc lập và cleanup đầy đủ observer/listener/animation với xử lý finished bị hủy. Thời lượng 0–600 ms, khoảng dịch chuyển 0–24 px; hiệu ứng không có thiết lập màu.',
} as const;
