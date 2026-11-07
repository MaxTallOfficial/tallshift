export const tabsCopy = {
  ru: {
    title: 'Переключайте содержимое вкладками',
    help: 'Нажмите вкладку — текст под ней изменится. С клавиатуры выберите вкладку клавишей Tab, затем переключайте стрелками.',
    label: 'Разделы примера',
    tabs: [
      { id: 'overview', label: 'Обзор', title: 'Несколько разделов в одной области', body: 'Вкладки помогают показать связанный текст по частям. Посетитель выбирает раздел и остаётся на той же странице.', note: 'Подойдут для описания продукта, инструкции или настроек.' },
      { id: 'setup', label: 'Подключение', title: 'Добавьте файлы в свой React-проект', body: 'Скачайте комплект и начните с файла SelectedExample.tsx. Он показывает пример с выбранными цветом и анимацией.', note: 'В комплекте есть код, инструкция и запрос, который можно вставить в своего ИИ-помощника.' },
      { id: 'settings', label: 'Настройка', title: 'Подстройте вкладки под свою страницу', body: 'В коде можно заменить названия и содержимое разделов, выбрать горизонтальное или вертикальное расположение.', note: 'Цвет и анимация меняются в настройках примера. Если в системе выбрано меньше движения, линия меняет положение без анимации.' },
    ],
  },
  en: {
    title: 'Switch content with tabs',
    help: 'Select a tab to change the content below. With a keyboard, use Tab to reach the tabs, then the arrow keys to switch.',
    label: 'Example sections',
    tabs: [
      { id: 'overview', label: 'Overview', title: 'Several sections in one space', body: 'Tabs present related content one section at a time. Visitors choose a section and stay on the same page.', note: 'Use them for product details, instructions or settings.' },
      { id: 'setup', label: 'Setup', title: 'Add the files to your React project', body: 'Download the files and start with SelectedExample.tsx. It displays the example with your selected color and animation.', note: 'The download includes source code, a guide and a request you can paste into your AI coding assistant.' },
      { id: 'settings', label: 'Settings', title: 'Fit the tabs to your page', body: 'In the code, replace the section labels and content, and choose a horizontal or vertical layout.', note: 'Change the color and animation in the example settings. With reduced motion enabled, the line changes position without animation.' },
    ],
  },
  vi: {
    title: 'Chuyển nội dung bằng tab',
    help: 'Chọn một tab để đổi nội dung bên dưới. Dùng bàn phím: nhấn Tab để tới các tab, rồi dùng phím mũi tên để chuyển.',
    label: 'Các phần của ví dụ',
    tabs: [
      { id: 'overview', label: 'Tổng quan', title: 'Nhiều phần trong cùng một vùng', body: 'Tab hiển thị từng phần nội dung có liên quan. Người xem chọn một phần và vẫn ở trên cùng trang.', note: 'Phù hợp cho mô tả sản phẩm, hướng dẫn hoặc cài đặt.' },
      { id: 'setup', label: 'Cài đặt', title: 'Thêm các tệp vào dự án React', body: 'Tải bộ tệp và bắt đầu từ SelectedExample.tsx. Tệp này hiển thị ví dụ với màu và hoạt ảnh bạn đã chọn.', note: 'Bộ tải xuống gồm mã nguồn, hướng dẫn và yêu cầu có thể dán vào trợ lý lập trình AI của bạn.' },
      { id: 'settings', label: 'Tùy chỉnh', title: 'Điều chỉnh tab cho trang của bạn', body: 'Trong mã, bạn có thể thay tên và nội dung các phần, chọn bố cục ngang hoặc dọc.', note: 'Đổi màu và hoạt ảnh trong phần tùy chỉnh ví dụ. Khi hệ thống bật giảm chuyển động, đường chỉ báo đổi vị trí mà không có hoạt ảnh.' },
    ],
  },
} as const;
