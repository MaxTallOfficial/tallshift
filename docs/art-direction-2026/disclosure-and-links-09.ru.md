# Native disclosures и ссылки /09

`SystemAccordion({ items, headingLevel = 3, className?, onToggle? })` группирует независимые native `details/summary`. Каждый item имеет стабильный уникальный `id`, `title`, `content`, опциональный `defaultOpen`. У заголовков настраивается уровень 2–6. Контент остаётся в DOM, видимость управляется браузером; нет измеряемой анимации высоты, обрезки или глобальной группы, принудительно закрывающей соседей. `onToggle(id, open)` сообщает состояние native toggle, включая начальное открытие. Это disclosure-композиция без roving navigation; Tab, Enter и Space принадлежат native summary. Мигрирован состав и условия предложения Product.

`SystemTextLink` сохраняет нативные props anchor и ref, имеет варианты `inline` (подчёркивание) и `navigation` (минимальная высота 44 px). Для `_blank` добавляет `noopener`, сохраняя прочие rel. Не превращает ссылку в disabled button и не подменяет router. Мигрированы ссылки реестра и предыдущей версии. Встроенный visited-цвет, подчёркивание и neutral focus требуют проверки в контексте реальной страницы; SSR проверяет только HTML.

Самостоятельный пакет не публикуется. Общие исходники экспортируются из `src/foundations/index.ts`, переменные темы и Manrope предоставляет host. SSR-проверки не подтверждают клавиатуру, браузерную историю и screen reader.
