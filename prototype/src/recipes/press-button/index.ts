import { createExampleRecipe } from '../shared/example-recipe';
import buttonSource from './PressButton.tsx?raw';
import buttonStyles from './PressButton.module.css?raw';
import demoSource from './Demo.tsx?raw';
import demoStyles from './Demo.module.css?raw';
import modalitySource from './input-modality.ts?raw';
import contrastSource from './contrast.ts?raw';

export { Demo } from './Demo';
export { PressButton } from './PressButton';
export type { PressButtonProps, PressButtonAppearance } from './PressButton';

const docs = {
  ru: `# Кнопка с эффектами наведения и нажатия / C001

## Что делает этот пример

Кнопка реагирует на наведение, нажатие и клавиатурный фокус. В примере «Увеличить счётчик» увеличивает число на странице. «Перейти к пояснению» — обычная ссылка к абзацу ниже. Состояния «Выполняется — образец» и «Недоступна» блокируют счётчик; никакой запрос к серверу не запускается.

Можно бесплатно использовать и менять код в своих и клиентских проектах. При распространении сохраните LICENSE.txt с текстом лицензии MIT и уведомлением об авторских правах. Иконки и шрифты не включены: компонент наследует шрифт проекта, необязательную иконку передают через icon. Действия работают без иконки.

## 1. Добавьте файлы

Нужен существующий проект с React, TypeScript и CSS Modules. Скопируйте все файлы комплекта в src/recipes/press-button/ с сохранением структуры. Начальная точка — SelectedExample.tsx: она передаёт выбранные настройки в Demo.tsx. Новые runtime-пакеты, изображения и удалённые скрипты не нужны. Не обновляйте зависимости ради подключения примера.

## 2. Покажите пример на странице

Импортируйте SelectedExample из папки комплекта в свою страницу Vite или Next.js App Router. У компонентов уже есть 'use client'; для всей страницы добавлять эту директиву не требуется. Browser API подключаются после mount через ownerDocument корня, без изменения html/body. Серверная разметка и первая отрисовка клиента показывают один и тот же счётчик 0.

## 3. Подключите своё действие

Для собственной кнопки импортируйте { PressButton } из './PressButton'. Передайте label и onClick; по умолчанию это button с type="button", поэтому случайной отправки формы нет. Для отправки формы явно укажите type="submit". Для перехода используйте href вместо действия. Не вкладывайте кнопки или ссылки в label/icon. icon — декоративный ReactNode slot, без встроенных приватных данных библиотеки иконок.

Пример: <PressButton label="Добавить в подборку" onClick={addToSelection} />. Для ссылки: <PressButton label="Открыть каталог" href="/ru/library" />. Измените обработчик на нужное реальное действие; пример не сохраняет данные и не обращается к серверу.

pending и disabled управляются вашим проектом. При pending передайте понятный pendingLabel; aria-busy сообщает занятость, aria-disabled запрещает повторное действие. Заблокированная кнопка остаётся фокусируемой, чтобы фокус не терялся при смене состояния. Нативный атрибут disabled намеренно не выставляется. У заблокированной ссылки временно нет href, поэтому нельзя обойти запрет открытием в новой вкладке. Сохраняйте отдельный текст статуса для длительных операций и ошибок. Компонент не выполняет асинхронную операцию за вас и сам не определяет её результат.

## Настройки и доступность

accent принимает #RRGGBB и меняет фон активной кнопки; цвет текста подбирается между светлым и тёмным для читаемости. size: sm/md/lg; минимальная область нажатия 44 px. radius: 0–48 px, duration: 0–480 мс. motion: off/subtle/expressive. Системное уменьшение анимации динамически отключает перемещение и переходы; смысл и действие сохраняются. Нажатие не ждёт завершения эффекта. Клавиатура показывает одно кольцо фокуса; мышь не оставляет кольцо и не вызывает blur().

## 4. Проверьте в своём проекте

Проверьте Enter/Space, обычный переход по ссылке, disabled/pending и отсутствие повторных действий, длинные подписи на 320 px и при zoom 200%, два экземпляра, unmount/Strict Mode, off и изменение системного reduced motion, forced colors. Запустите typecheck/build проекта. Проверка в прототипе Vite не доказывает работу со всеми версиями Next.js и React; React предоставляет ваш проект.

Если работаете с ИИ, скопируйте текст со вкладки «Запрос для ИИ» в ИИ-помощника своего React-проекта вместе с файлами. Сайт не отправляет запрос автоматически. Проверьте, что помощник сохранил нативные элементы, блокировку повторов, фокус и локальные исходники.
`,
  en: `# Button with hover and press effects / C001

## What this example does

The button responds to hover, press and keyboard focus. In the example, “Increase counter” increases a number on the page. “Go to explanation” is a regular link to the paragraph below. “In progress — sample” and “Unavailable” block the counter; no server request is running.

You can use and modify the code free of charge in your own and client projects. Keep LICENSE.txt with the MIT license text and copyright notice when distributing the code. Fonts and icons are not included: the component inherits the project font and accepts an optional icon slot. Actions work without icons.

## 1. Add the files

Use an existing project with React, TypeScript and CSS Modules. Copy all bundle files to src/recipes/press-button/, preserving the structure. Start with SelectedExample.tsx; it passes the selected settings to Demo.tsx. No additional runtime packages, images or remote scripts are needed. Do not update dependencies just to add the example.

## 2. Display the example

Import SelectedExample into your Vite page or Next.js App Router page. The components already include 'use client'; the entire page does not need that directive. Browser APIs attach after mount through the root ownerDocument, without changing html/body. Server markup and the first client render both show counter 0.

## 3. Connect your action

For your own button, import { PressButton } from './PressButton'. Provide label and onClick. The default is a native button with type="button", avoiding accidental form submission. Set type="submit" explicitly to submit a form. For navigation, use href instead of an action. Do not nest buttons or links inside label/icon. icon is a decorative ReactNode slot and contains no private icon library data.

Example: <PressButton label="Add to selection" onClick={addToSelection} />. For a link: <PressButton label="Open catalog" href="/en/library" />. Replace the handler with your real action; the example does not save data or contact a server.

Your project controls pending and disabled. Provide a meaningful pendingLabel while pending; aria-busy reports the busy state and aria-disabled blocks repeat activation. Blocked controls remain focusable so a state change does not lose focus. The native disabled attribute is intentionally not set. A blocked link temporarily has no href, preventing navigation through a new tab. Keep separate status text for long operations and errors. The component does not run an asynchronous operation for you or determine its outcome.

## Settings and accessibility

accent accepts #RRGGBB and changes the active button background; light or dark label text is selected for readability. size: sm/md/lg; every target is at least 44 px. radius: 0–48 px, duration: 0–480 ms. motion: off/subtle/expressive. Dynamic system reduced motion disables movement and transitions while retaining meaning and actions. Activation never waits for the effect. Keyboard input shows one focus ring; pointer input leaves no ring and never calls blur().

## 4. Check in your project

Check Enter/Space, native link navigation, disabled/pending and repeat prevention, long labels at 320 px and 200% zoom, two instances, unmount/Strict Mode, off and changing system reduced motion, and forced colors. Run your project typecheck/build. Vite prototype verification does not prove compatibility with every Next.js or React version; the project supplies React.

If using an AI coding tool, copy the text from the AI request tab into the AI assistant for your React project together with the files. The site does not send the request automatically. Verify that the assistant preserves native controls, repeat prevention, focus and the local source.
`,
  vi: `# Nút có hiệu ứng khi di chuột và nhấn / C001

## Ví dụ này làm gì

Nút phản hồi khi di chuột, nhấn và dùng bàn phím. Trong ví dụ, “Tăng bộ đếm” tăng số trên trang. “Đến phần giải thích” là liên kết thông thường đến đoạn bên dưới. “Đang xử lý — mẫu” và “Không khả dụng” chặn bộ đếm; không có yêu cầu nào đang gửi đến máy chủ.

Bạn có thể dùng và sửa mã miễn phí cho dự án cá nhân và khách hàng. Khi phân phối mã, giữ LICENSE.txt với toàn văn giấy phép MIT và thông báo bản quyền. Không kèm phông chữ hoặc biểu tượng: component dùng phông chữ của dự án và nhận icon tùy chọn. Thao tác vẫn hoạt động khi không có biểu tượng.

## 1. Thêm các tệp

Cần dự án hiện có dùng React, TypeScript và CSS Modules. Sao chép toàn bộ tệp vào src/recipes/press-button/ và giữ nguyên cấu trúc. Bắt đầu từ SelectedExample.tsx; tệp này truyền thiết lập đã chọn vào Demo.tsx. Không cần thêm gói runtime, hình ảnh hoặc script từ xa. Không cập nhật dependency chỉ để thêm ví dụ.

## 2. Hiển thị ví dụ trên trang

Nhập SelectedExample vào trang Vite hoặc Next.js App Router. Component đã có 'use client'; không cần thêm chỉ thị này cho toàn bộ trang. Browser API được kết nối sau mount qua ownerDocument của phần tử gốc, không thay đổi html/body. Mã phía máy chủ và lần render đầu tiên trên client đều hiển thị bộ đếm 0.

## 3. Kết nối thao tác của bạn

Để dùng nút riêng, nhập { PressButton } từ './PressButton'. Truyền label và onClick. Mặc định là button gốc với type="button", tránh gửi biểu mẫu ngoài ý muốn. Đặt type="submit" nếu muốn gửi biểu mẫu. Dùng href thay cho thao tác để tạo liên kết. Không lồng nút hoặc liên kết trong label/icon. icon là slot ReactNode trang trí, không chứa dữ liệu riêng tư của thư viện biểu tượng.

Ví dụ: <PressButton label="Thêm vào danh sách" onClick={addToSelection} />. Với liên kết: <PressButton label="Mở thư viện" href="/vi/library" />. Thay handler bằng thao tác thật; ví dụ không lưu dữ liệu và không liên hệ máy chủ.

Dự án của bạn điều khiển pending và disabled. Khi pending, truyền pendingLabel rõ nghĩa; aria-busy báo trạng thái bận, aria-disabled chặn việc nhấn lại. Nút bị chặn vẫn nhận focus để việc đổi trạng thái không làm mất focus. Thuộc tính disabled gốc được cố ý không đặt. Liên kết bị chặn tạm thời không có href, nên không thể mở bằng tab mới. Giữ thông báo trạng thái riêng cho thao tác dài và lỗi. Component không tự chạy thao tác bất đồng bộ hoặc quyết định kết quả thay bạn.

## Thiết lập và khả năng truy cập

accent nhận #RRGGBB và đổi nền nút đang khả dụng; chữ sáng hoặc tối được chọn để dễ đọc. size: sm/md/lg; vùng nhấn tối thiểu 44 px. radius: 0–48 px, duration: 0–480 ms. motion: off/subtle/expressive. Thiết lập giảm chuyển động của hệ thống được áp dụng khi thay đổi: tắt di chuyển và chuyển tiếp nhưng giữ ý nghĩa và thao tác. Việc nhấn không chờ hiệu ứng kết thúc. Bàn phím hiển thị một viền focus; chuột không để lại viền và không gọi blur().

## 4. Kiểm tra trong dự án

Kiểm tra Enter/Space, liên kết gốc, disabled/pending và chặn nhấn lại, nhãn dài ở 320 px và zoom 200%, hai component, unmount/Strict Mode, off và thay đổi reduced motion của hệ thống, forced colors. Chạy typecheck/build của dự án. Kiểm tra bản mẫu Vite không đảm bảo tương thích với mọi phiên bản Next.js hoặc React; dự án cung cấp React.

Nếu dùng công cụ lập trình AI, sao chép nội dung từ tab Yêu cầu cho AI vào trợ lý AI của dự án React cùng các tệp. Trang không tự gửi yêu cầu. Kiểm tra trợ lý giữ phần tử gốc, chặn nhấn lại, focus và mã nguồn cục bộ.
`,
};

const rules = {
  ru: 'Сохрани нативную семантику button/link, type="button" по умолчанию, управление pending/disabled проектом и блокировку повторов без потери фокуса. У заблокированной ссылки не должно быть href. Сохрани локальный scoped tracker ввода с cleanup, minimum target 44 px, перенос длинных подписей, aria-busy и текстовые статусы. Не добавляй задержку или фиктивный запрос ради показа состояния. Сохрани динамические reduced motion/off и мгновенный клавиатурный фокус. Проверь два экземпляра, Enter/Space, ссылки и forced colors. Иконка только через необязательный host slot, без приватных paths.',
  en: 'Keep native button/link semantics, default type="button", host-controlled pending/disabled and repeat prevention without losing focus. A blocked link must have no href. Keep the local scoped input tracker with cleanup, minimum 44 px targets, long-label wrapping, aria-busy and text status. Do not replace a state sample with a timer or fabricated request. Preserve dynamic reduced motion/off and immediate keyboard focus. Check two instances, Enter/Space, links and forced colors. Icons use an optional host slot without private paths.',
  vi: 'Giữ ngữ nghĩa button/link gốc, type="button" mặc định, pending/disabled do dự án điều khiển và chặn nhấn lại mà không mất focus. Liên kết bị chặn không được có href. Giữ bộ theo dõi kiểu nhập trong phạm vi cục bộ với cleanup, vùng nhấn tối thiểu 44 px, nhãn dài xuống dòng, aria-busy và thông báo văn bản. Không thay trạng thái mẫu bằng bộ hẹn giờ hoặc yêu cầu giả. Giữ reduced motion/off thay đổi theo hệ thống và focus bàn phím tức thì. Kiểm tra hai component, Enter/Space, liên kết và forced colors. Biểu tượng dùng host slot tùy chọn, không kèm đường nét riêng tư.',
};

export const recipe = createExampleRecipe({
  id: 'C001', slug: 'press-button', name: 'Press Button',
  displayName: { ru: 'Кнопка с эффектами наведения и нажатия', en: 'Button with hover and press effects', vi: 'Nút có hiệu ứng khi di chuột và nhấn' },
  sourceFiles: [
    { path: 'PressButton.tsx', content: buttonSource }, { path: 'PressButton.module.css', content: buttonStyles },
    { path: 'Demo.tsx', content: demoSource }, { path: 'Demo.module.css', content: demoStyles },
    { path: 'input-modality.ts', content: modalitySource },
    { path: 'contrast.ts', content: contrastSource },
  ],
  docs, rules,
});
