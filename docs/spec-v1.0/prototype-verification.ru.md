# Formrift — фактическая проверка локального прототипа

Дата: 22 октября 2026, Asia/Ho_Chi_Minh. Проверен локальный React/Vite-прототип: Home, Library, Animations, Studio и экспорт A001 `0.1.0-prototype`. Результаты ниже относятся только к перечисленным сценариям. **P0 и production-сервис этим не завершены.**

## Выполнено

| Проверка | Фактический результат |
| --- | --- |
| Сборка оболочки | `npm run build`: strict TypeScript + Vite production build, exit 0 |
| Unit tests | `npm test`: 8/8 passed — 6 controller cases и 2 группы share projection/negative cases |
| Экспорт/промпт | `node tests/verify-export.mjs`: 8 сочетаний locale × target × mode passed; это восемь export cases, а не восемь сборок целевых проектов |
| ZIP | В каждом комплекте 20 файлов; 19 SHA-256 совпадают; manifest перечисляет фактические файлы; исходники равны коду демо; одинаковые входы дают одинаковые bytes |
| Браузерный ZIP | Через UI скачан A001 с RU, Next, adapt, expressive, #7C3AED, 180 ms и тестовым context; содержимое/manifest/source/checksums независимо проверены после распаковки |
| Clipboard | Нажатие в живом демо вызвало фактический успех записи; скопированный через UI промпт прочитан и сопоставлен с выбранным Next/adapt |
| Ошибка | Явный сценарий локальной ошибки приводит к error и понятному сообщению, без server result или fake success |
| Настройки | Accent/motion/duration отображаются в SelectedExample и промпте. Невалидный HEX показывает ошибку и отключает Copy/ZIP/share до исправления |
| Share | Versioned A001 appearance envelope совпадает с отдельной schema; ссылка содержит только accent/motion/duration. После reload настройки восстановлены, project context пуст |
| RU/EN | Смена языка обновляет навигацию/Studio/demo/сообщения и сохраняет текущие настройки при переходе внутри приложения |
| Каталог | 32 карточки → фильтр Free 9 → working example 1; поиск без совпадений показывает empty/reset. Анимации содержат 12 плановых/реальных записей |
| Избранное | A001 сохранён; отметка сохранилась после reload |
| Mobile | Studio EN 320 px: настройки открываются/закрываются, focus возвращается к кнопке. Library RU: после исправления min-width нет горизонтального overflow на 320/390/768 px; Animations desktop проверен на 1440 px |
| Keyboard | ArrowRight в tablist переключает Demo → Code, aria-selected обновляется; в разметке предусмотрены ArrowLeft/Home/End и обычный Tab |
| Off/reduce | Off задаёт нулевое движение. Динамическая эмуляция системного reduced motion при preset subtle дала transitionDuration=0s у четырёх SVG-слоёв; затем эмуляция сброшена |
| Console | В проверенном локальном UI error-записей не обнаружено |
| Схемы ТЗ | Валидатор JSON Schema 2020-12, jsonschema 4.26.0: 8 схем, 59 checks passed. Planned fixtures остались planned |

Среда оболочки: macOS arm64, Node 24.19.0, npm 11.17.0, React/React DOM 19.3.1, TypeScript 7.0.2, Vite 8.3.5. Браузерная проверка — встроенный браузер Codex на Chromium; это не матрица Firefox/Safari/реальных мобильных устройств. Переносимый код отдельно прошёл Vite и Next 16.4.2 production/prerender: [отчёт рецепта](recipe-verification.ru.md).

## Границы результата

Один A001 реализован как локальный пример. Это не production release registry: manifest в проверочном ZIP — компактное описание реального комплекта. До публичной публикации его нужно преобразовать в полную author/release schema, добавить provenance/review и production evidence. Проверка planned production fixtures не означает, что ZIP уже прошёл все production schema gates.

31 материал не реализован. Их карточки явно показывают «В плане / Planned», а детали — brief без фиктивного export. CSS-миниатюры объясняют композиционное направление, не являются готовыми постерами 32 runtime-элементов. Десять WM описаны в ТЗ; присутствие отдельных эффектов оболочки не означает их полную приёмку. Общий site-wide Off и полная interruption/performance-проверка оболочки относятся к production backlog.

Не выполнены: полный keyboard/screenreader audit, реальные touch/low-end устройства, Safari/Firefox, фактический zoom 200%/400%, весь WCAG 2.2 AA, отказ browser Clipboard permission в production iframe, Next browser hydration, production preview/bridge/CSP, отдельный AppSec audit, нагрузки/restore и платежи. Эти задачи перечислены в выпускных gates. Реальные пользовательские интервью/наблюдаемые интеграции не проводились.

## Артефакты и воспроизведение

- [Запуск и команды](../../prototype/README.ru.md).
- [Готовый проверочный ZIP A001](../../prototype/artifacts/A001-state-relay-vite-ru.zip).
- [Главная 1440 px](screenshots/home-1440.png).
- [Studio 1440 px](screenshots/studio-1440.png).
- [Studio 320 px](screenshots/studio-320.png).
- [Раздел анимаций 1440 px](screenshots/animations-1440.png).

Исходники и lockfile сохранены локально. Публичный хостинг, аккаунты и платёжные провайдеры не подключались. Действия QA использовали только локальные тестовые данные.
