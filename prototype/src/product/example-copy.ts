import type { ProductLocale } from './routes';

interface ExampleCopy {
  lead: string;
  demoHelp: string;
  accentLabel: string;
  accentHelp: string;
  useBody: string;
  modeHelp: string;
  contextPlaceholder: string;
  instructionsHelp: string;
  promptBody: string;
  guideBody: string;
  settingsHelp?: string;
  blocked?: string;
  durationBlocked?: string;
}

/** Item-specific explanations keep the shared workbench faithful to each example. */
export const exampleCopy: Record<ProductLocale, Record<'C001' | 'C002' | 'E001' | 'S003', ExampleCopy>> = {
  ru: {
    C001: {
      lead: 'Кнопка меняет вид при наведении, нажатии и выборе с клавиатуры. Проверьте её в работе, настройте цвет и анимацию, затем скачайте код.',
      demoHelp: 'Нажмите «Увеличить счётчик» — число под кнопкой вырастет. Переключатель показывает доступную кнопку и образцы состояний, в которых нажать нельзя.',
      accentLabel: 'Цвет кнопки',
      accentHelp: 'Меняет фон доступной кнопки и ссылки. Наведите курсор или нажмите, чтобы увидеть эффекты.',
      useBody: 'Для действий и переходов на вашем сайте: например, открыть форму, добавить товар или перейти к подробностям. Действие или адрес ссылки задаёте вы.',
      modeHelp: 'Запрос попросит ИИ сохранить этот дизайн или подстроить его под ваш сайт. В обоих случаях нужно сохранить действие кнопки, состояния недоступности и управление с клавиатуры.',
      contextPlaceholder: 'На чём создан ваш сайт, какие цвета и шрифты вы используете, что должна делать кнопка…',
      instructionsHelp: 'Как добавить кнопку в существующий React-проект и задать её действие или ссылку. Выбранные настройки уже включены в файлы.',
      promptBody: 'Текст с полным кодом и настройками. Скопируйте его в ИИ-помощника, в котором работаете над своим React-проектом, чтобы добавить кнопку.',
      guideBody: 'Куда добавить файлы, как задать действие или ссылку и как проверить кнопку.',
    },
    C002: {
      lead: 'Вкладки переключают связанные разделы внутри одной области страницы. Выберите раздел, затем настройте пример и скачайте код.',
      demoHelp: 'Нажмите вкладку — текст под ней изменится. С клавиатуры перейдите к вкладкам клавишей Tab, затем переключайте стрелками.',
      accentLabel: 'Цвет линии выбора',
      accentHelp: 'Меняет цвет линии у выбранной вкладки.',
      useBody: 'Когда описание, характеристики и инструкция относятся к одному объекту. Посетитель выбирает нужный раздел и остаётся на той же странице.',
      modeHelp: 'Запрос попросит ИИ сохранить этот дизайн или подстроить его под ваш сайт. В обоих случаях нужно сохранить переключение содержимого и управление вкладками с клавиатуры.',
      contextPlaceholder: 'На чём создан ваш сайт, где разместить вкладки, как назвать разделы и что в них показать…',
      instructionsHelp: 'Как добавить вкладки в существующий React-проект и заменить разделы своим содержимым. Выбранные настройки уже включены в файлы.',
      promptBody: 'Текст с полным кодом и настройками. Скопируйте его в ИИ-помощника, в котором работаете над своим React-проектом, чтобы добавить вкладки.',
      guideBody: 'Куда добавить файлы, как задать разделы и их содержимое, как проверить переключение.',
    },
    E001: {
      lead: "Текст или блок плавно появляется, когда попадает в видимую область. Проверьте эффект, настройте анимацию и скачайте код.",
      demoHelp: "Прокрутите окно ниже или нажмите «Показать содержимое». Чтобы посмотреть эффект снова, нажмите «Вернуть в начало».",
      accentLabel: "Цвет примера",
      accentHelp: "Для этого эффекта цвет не настраивается.",
      useBody: "Чтобы мягко выделить текст, изображение или блок при прокрутке страницы. Эффект не загружает данные и не мешает читать содержимое без анимации.",
      modeHelp: "Запрос попросит ИИ сохранить этот эффект или подстроить его под ваш сайт. В обоих случаях содержимое должно оставаться доступным без анимации и при системном уменьшении движения.",
      contextPlaceholder: "На чём создан ваш сайт, какой текст или блок должен появляться и где он расположен…",
      instructionsHelp: "Как добавить эффект в существующий React-проект и применить его к своему содержимому. Выбранные настройки уже включены в файлы.",
      promptBody: "Текст с полным кодом и настройками. Скопируйте его в ИИ-помощника, в котором работаете над своим React-проектом, чтобы добавить эффект появления.",
      guideBody: "Куда добавить файлы, как применить эффект к тексту или блоку и как проверить доступность без анимации.",
      settingsHelp: "Режим и длительность анимации применяются к примеру и файлам для скачивания.",
      blocked: "Исправьте настройки перед копированием или скачиванием.",
      durationBlocked: "Введите целое число от 0 до 600 мс перед копированием кода или скачиванием файлов.",
    },
    S003: {
      lead: "Завершающий блок страницы с одним понятным действием. Нажмите кнопку в примере, затем настройте оформление и скачайте код.",
      demoHelp: "Нажмите «Показать шаги подключения» — под блоком откроется инструкция. Повторное нажатие скроет её. Ничего не отправляется и не сохраняется.",
      accentLabel: "Цвет кнопки",
      accentHelp: "Меняет фон кнопки. Наведите курсор или нажмите, чтобы увидеть её отклик.",
      useBody: "В конце страницы, когда посетителю нужно предложить следующий шаг: открыть форму, перейти по ссылке или посмотреть нужный раздел. Текст и действие задаёте вы.",
      modeHelp: "Запрос попросит ИИ сохранить этот блок или подстроить его под ваш сайт. В обоих случаях нужно сохранить понятное действие, доступную кнопку или ссылку и управление с клавиатуры.",
      contextPlaceholder: "На чём создан ваш сайт, чем заканчивается страница и какой следующий шаг нужен посетителю…",
      instructionsHelp: "Как добавить блок в существующий React-проект и заменить текст и действие своими. Выбранные настройки уже включены в файлы.",
      promptBody: "Текст с полным кодом и настройками. Скопируйте его в ИИ-помощника, в котором работаете над своим React-проектом, чтобы добавить завершающий блок.",
      guideBody: "Куда добавить файлы, как заменить текст и действие и как проверить кнопку или ссылку.",
    },
  },
  en: {
    C001: {
      lead: 'The button responds to hover, press and keyboard focus. Try it, customize its color and animation, then download the source.',
      demoHelp: 'Press “Increase counter” to raise the number below the button. The selector shows the available button and examples of states that prevent activation.',
      accentLabel: 'Button color',
      accentHelp: 'Changes the available button and link backgrounds. Hover or press to see the effects.',
      useBody: 'For actions and links on your site, such as opening a form, adding an item or viewing details. You provide the action or link address.',
      modeHelp: 'The request asks AI to keep this design or match your site. In either case, the button action, unavailable states and keyboard access must keep working.',
      contextPlaceholder: 'How your site is built, its colors and fonts, and what the button should do…',
      instructionsHelp: 'How to add the button to an existing React project and provide its action or link. The files already include your selected settings.',
      promptBody: 'Text with the complete source and settings. Copy it into the AI assistant you use for your React project to add the button.',
      guideBody: 'Where to put the files, how to provide an action or link, and how to check the button.',
    },
    C002: {
      lead: 'Tabs switch between related sections within one area of the page. Select a section, then customize the example and download the source.',
      demoHelp: 'Select a tab to change the text below. With a keyboard, use Tab to reach the tabs, then the arrow keys to switch.',
      accentLabel: 'Selection line color',
      accentHelp: 'Changes the color of the line marking the selected tab.',
      useBody: 'For related content, such as a description, specifications and instructions for the same item. Visitors choose a section and stay on the same page.',
      modeHelp: 'The request asks AI to keep this design or match your site. In either case, content switching and keyboard access to the tabs must keep working.',
      contextPlaceholder: 'How your site is built, where the tabs should go, and the names and contents of each section…',
      instructionsHelp: 'How to add tabs to an existing React project and replace the sections with your content. The files already include your selected settings.',
      promptBody: 'Text with the complete source and settings. Copy it into the AI assistant you use for your React project to add the tabs.',
      guideBody: 'Where to put the files, how to define the sections and their content, and how to check switching.',
    },
    E001: {
      lead: "Text or a block fades into view when it enters the visible area. Try the effect, customize the animation and download the source.",
      demoHelp: "Scroll the window below or press “Show content”. To see the effect again, press “Back to the start”.",
      accentLabel: "Example color",
      accentHelp: "This effect has no color setting.",
      useBody: "To gently draw attention to text, an image or a block as visitors scroll. The effect does not load data and keeps content readable without animation.",
      modeHelp: "The request asks AI to keep this effect or match your site. In either case, content must remain accessible without animation and with reduced motion enabled.",
      contextPlaceholder: "How your site is built, which text or block should appear and where it goes…",
      instructionsHelp: "How to add the effect to an existing React project and apply it to your content. The files already include your selected settings.",
      promptBody: "Text with the complete source and settings. Copy it into the AI assistant you use for your React project to add the fade-in effect.",
      guideBody: "Where to put the files, how to apply the effect to text or a block, and how to check access without animation.",
      settingsHelp: "The animation mode and duration apply to the example and download files.",
      blocked: "Correct the settings before copying or downloading.",
      durationBlocked: "Enter a whole number from 0 to 600 ms before copying source or downloading files.",
    },
    S003: {
      lead: "A closing page section with one clear action. Press the example button, then customize the design and download the source.",
      demoHelp: "Press “Show setup steps” to open instructions below the block. Press again to hide them. Nothing is sent or saved.",
      accentLabel: "Button color",
      accentHelp: "Changes the button background. Hover or press to see its response.",
      useBody: "At the end of a page, when visitors need a next step: open a form, follow a link or view a section. You provide the text and action.",
      modeHelp: "The request asks AI to keep this block or match your site. In either case, keep a clear action, an accessible button or link, and keyboard access.",
      contextPlaceholder: "How your site is built, how the page ends and what visitors should do next…",
      instructionsHelp: "How to add the block to an existing React project and replace the text and action. The files already include your selected settings.",
      promptBody: "Text with the complete source and settings. Copy it into the AI assistant you use for your React project to add the closing section.",
      guideBody: "Where to put the files, how to replace the text and action, and how to check the button or link.",
    },
  },
  vi: {
    C001: {
      lead: 'Nút phản hồi khi di chuột, nhấn hoặc chọn bằng bàn phím. Hãy thử, tùy chỉnh màu và hoạt ảnh, rồi tải mã nguồn.',
      demoHelp: 'Nhấn “Tăng bộ đếm” để tăng số bên dưới nút. Bộ chọn hiển thị nút có thể nhấn và các trạng thái mẫu không thể nhấn.',
      accentLabel: 'Màu nút',
      accentHelp: 'Đổi màu nền của nút có thể nhấn và liên kết. Di chuột hoặc nhấn để xem hiệu ứng.',
      useBody: 'Dành cho thao tác và liên kết trên website, như mở biểu mẫu, thêm sản phẩm hoặc xem chi tiết. Bạn tự đặt thao tác hoặc địa chỉ liên kết.',
      modeHelp: 'Yêu cầu đề nghị AI giữ thiết kế này hoặc điều chỉnh theo website. Trong cả hai trường hợp, phải giữ thao tác của nút, các trạng thái không thể nhấn và cách dùng bàn phím.',
      contextPlaceholder: 'Website dùng công nghệ, màu và phông chữ nào, nút cần thực hiện thao tác gì…',
      instructionsHelp: 'Cách thêm nút vào dự án React hiện có và đặt thao tác hoặc liên kết. Các tệp đã có thiết lập bạn chọn.',
      promptBody: 'Văn bản gồm toàn bộ mã nguồn và thiết lập. Sao chép vào trợ lý AI bạn dùng cho dự án React để thêm nút.',
      guideBody: 'Nơi đặt tệp, cách đặt thao tác hoặc liên kết và cách kiểm tra nút.',
    },
    C002: {
      lead: 'Các tab chuyển giữa những phần liên quan trong cùng một vùng trên trang. Chọn một phần, rồi tùy chỉnh ví dụ và tải mã nguồn.',
      demoHelp: 'Chọn một tab để đổi văn bản bên dưới. Dùng bàn phím: nhấn Tab để tới các tab, rồi dùng phím mũi tên để chuyển.',
      accentLabel: 'Màu đường chỉ báo',
      accentHelp: 'Đổi màu đường chỉ báo của tab đã chọn.',
      useBody: 'Dùng cho các nội dung liên quan, như mô tả, thông số và hướng dẫn của cùng một sản phẩm. Người xem chọn phần cần đọc mà vẫn ở trên cùng trang.',
      modeHelp: 'Yêu cầu đề nghị AI giữ thiết kế này hoặc điều chỉnh theo website. Trong cả hai trường hợp, phải giữ cách chuyển nội dung và cách dùng tab bằng bàn phím.',
      contextPlaceholder: 'Website dùng công nghệ nào, đặt tab ở đâu, tên và nội dung của từng phần…',
      instructionsHelp: 'Cách thêm tab vào dự án React hiện có và thay các phần bằng nội dung của bạn. Các tệp đã có thiết lập bạn chọn.',
      promptBody: 'Văn bản gồm toàn bộ mã nguồn và thiết lập. Sao chép vào trợ lý AI bạn dùng cho dự án React để thêm tab.',
      guideBody: 'Nơi đặt tệp, cách tạo các phần và nội dung, cách kiểm tra chuyển tab.',
    },
    E001: {
      lead: "Văn bản hoặc khối nội dung hiện dần khi đi vào vùng đang xem. Hãy thử hiệu ứng, tùy chỉnh hoạt ảnh rồi tải mã nguồn.",
      demoHelp: "Cuộn khung bên dưới hoặc nhấn “Hiển thị nội dung”. Để xem lại hiệu ứng, nhấn “Về đầu”.",
      accentLabel: "Màu ví dụ",
      accentHelp: "Hiệu ứng này không có thiết lập màu.",
      useBody: "Để thu hút sự chú ý vào văn bản, hình ảnh hoặc khối nội dung khi cuộn trang. Hiệu ứng không tải dữ liệu và vẫn cho phép đọc nội dung khi không có hoạt ảnh.",
      modeHelp: "Yêu cầu đề nghị AI giữ hiệu ứng này hoặc điều chỉnh theo website. Trong cả hai trường hợp, nội dung phải vẫn truy cập được khi không có hoạt ảnh hoặc hệ thống bật giảm chuyển động.",
      contextPlaceholder: "Website dùng công nghệ nào, văn bản hoặc khối nào cần xuất hiện và đặt ở đâu…",
      instructionsHelp: "Cách thêm hiệu ứng vào dự án React hiện có và áp dụng cho nội dung của bạn. Các tệp đã có thiết lập bạn chọn.",
      promptBody: "Văn bản gồm toàn bộ mã nguồn và thiết lập. Sao chép vào trợ lý AI bạn dùng cho dự án React để thêm hiệu ứng hiện dần.",
      guideBody: "Nơi đặt tệp, cách áp dụng hiệu ứng cho văn bản hoặc khối nội dung, cách kiểm tra khi không có hoạt ảnh.",
      settingsHelp: "Chế độ và thời lượng hoạt ảnh áp dụng cho ví dụ và các tệp tải xuống.",
      blocked: "Sửa thiết lập trước khi sao chép hoặc tải xuống.",
      durationBlocked: "Nhập số nguyên từ 0 đến 600 ms trước khi sao chép mã hoặc tải tệp.",
    },
    S003: {
      lead: "Khối cuối trang với một hành động rõ ràng. Nhấn nút trong ví dụ, rồi tùy chỉnh giao diện và tải mã nguồn.",
      demoHelp: "Nhấn “Xem các bước cài đặt” để mở hướng dẫn bên dưới khối. Nhấn lần nữa để ẩn. Không gửi hoặc lưu dữ liệu.",
      accentLabel: "Màu nút",
      accentHelp: "Đổi màu nền nút. Di chuột hoặc nhấn để xem phản hồi.",
      useBody: "Ở cuối trang, khi người xem cần một bước tiếp theo: mở biểu mẫu, theo liên kết hoặc xem một phần nội dung. Bạn tự đặt văn bản và hành động.",
      modeHelp: "Yêu cầu đề nghị AI giữ khối này hoặc điều chỉnh theo website. Trong cả hai trường hợp, phải giữ hành động rõ ràng, nút hoặc liên kết dễ truy cập và cách dùng bàn phím.",
      contextPlaceholder: "Website dùng công nghệ nào, trang kết thúc ra sao và người xem cần làm gì tiếp theo…",
      instructionsHelp: "Cách thêm khối vào dự án React hiện có và thay văn bản, hành động bằng nội dung của bạn. Các tệp đã có thiết lập bạn chọn.",
      promptBody: "Văn bản gồm toàn bộ mã nguồn và thiết lập. Sao chép vào trợ lý AI bạn dùng cho dự án React để thêm khối cuối trang.",
      guideBody: "Nơi đặt tệp, cách thay văn bản và hành động, cách kiểm tra nút hoặc liên kết.",
    },
  },
};
