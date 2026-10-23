# Точный каталог контента v0.2

Статус: предложенный объём производства. Ни один из перечисленных компонентов ещё не реализован. Имена — рабочие описательные названия, не проверенные товарные знаки. Источник истины — [catalog.json](catalog.json).

## 1. Правила счёта и доступа

24 уникальных элемента: 12 секций, 8 компонентов, 4 эффекта. 6 Free и 18 Pro. Три платных набора по 6 элементов; bundle объединяет их и не создаёт новые элементы. Все получают полноценные исходники, доступность, инструкции RU/EN, два режима промпта и ZIP. Демо всех элементов открыты; Pro-исходники и prompt с исходниками требуют покупки.

В отличие от v0.1, состав перераспределён: три общие Starter-секции и по три самостоятельные платные секции в каждом направлении. Это делает наборы сопоставимыми по составу. Шесть Free остаются бесплатными после платного запуска.

## 2. Наборы

| ID | Предложение RU / EN | Item IDs | Цена для проверки, USD |
| --- | --- | --- | --- |
| FREE-STARTER | Стартовый набор / Starter | S001, S002, S003, C001, C002, E001 | 0 |
| PACK-PRODUCT | Продукт / Product | S004, S005, S006, C003, C004, E002 | 29 |
| PACK-EDITORIAL | Редакционный / Editorial | S007, S008, S009, C005, C006, E003 | 29 |
| PACK-PLAYFUL | Экспериментальный / Playful | S010, S011, S012, C007, C008, E004 | 29 |
| BUNDLE-LAUNCH | Все наборы запуска / Launch Bundle | S004, S005, S006, S007, S008, S009, S010, S011, S012, C003, C004, C005, C006, C007, C008, E002, E003, E004 | 59 |

Цены — гипотезы. Сумма, валюта, налоги и право на получение обновлений утверждаются отдельно, до checkout. Подробности — [продуктовая модель](business-and-product.ru.md).

## 3. Полный список

| ID | Тип | RU / EN | Доступ | Набор | Зависимости |
| --- | --- | --- | --- | --- | --- |
| S001 | section | Стартовый hero с двумя колонками / Starter Split Hero | free | FREE-STARTER | C001, E001 |
| S002 | section | Стартовая сетка преимуществ / Starter Feature Grid | free | FREE-STARTER | E001 |
| S003 | section | Стартовый блок действия / Starter Action Band | free | FREE-STARTER | C001 |
| S004 | section | Hero с интерактивным демо / Product Demo Hero | pro | PACK-PRODUCT | C001, C004 |
| S005 | section | История возможностей по шагам / Product Feature Steps | pro | PACK-PRODUCT | C002, E002 |
| S006 | section | Сравнение тарифов / Product Pricing Compare | pro | PACK-PRODUCT | C001 |
| S007 | section | Редакционный типографический hero / Editorial Title Hero | pro | PACK-EDITORIAL | E001 |
| S008 | section | Редакционный список проектов / Editorial Project Index | pro | PACK-EDITORIAL | C005 |
| S009 | section | Редакционный контактный footer / Editorial Contact Footer | pro | PACK-EDITORIAL | C001 |
| S010 | section | Hero с графическими стикерами / Playful Sticker Hero | pro | PACK-PLAYFUL | C007 |
| S011 | section | FAQ в карточках / Playful Question Cards | pro | PACK-PLAYFUL | E001 |
| S012 | section | CTA с орбитальной графикой / Playful Orbit CTA | pro | PACK-PLAYFUL | C007, E004 |
| C001 | component | Кнопка с откликом / Press Button | free | FREE-STARTER | — |
| C002 | component | Контентные вкладки / Content Tabs | free | FREE-STARTER | — |
| C003 | component | Сегментированная навигация / Segmented Navigation | pro | PACK-PRODUCT | — |
| C004 | component | Переключатель метрик / Metric Switcher | pro | PACK-PRODUCT | — |
| C005 | component | Карточка проекта / Project Card | pro | PACK-EDITORIAL | — |
| C006 | component | Галерея с просмотром / Media Gallery | pro | PACK-EDITORIAL | C005 |
| C007 | component | Кнопка с магнитным откликом / Magnetic Button | pro | PACK-PLAYFUL | C001 |
| C008 | component | Переключатель отзывов / Testimonial Switcher | pro | PACK-PLAYFUL | — |
| E001 | effect | Появление контента / Content Reveal | free | FREE-STARTER | — |
| E002 | effect | Последовательное появление группы / Stagger Group | pro | PACK-PRODUCT | E001 |
| E003 | effect | Мягкий градиентный фон / Soft Mesh Background | pro | PACK-EDITORIAL | — |
| E004 | effect | Локальная подсветка / Pointer Spotlight | pro | PACK-PLAYFUL | — |

## 4. Задания на производство каждого элемента

Общие требования: props типизированы; ссылки/действия подключаемые; default/subtle/off и системный reduced motion; RU/EN тексты; no global CSS; Vite и Next.js; повторные экземпляры без конфликтов; живое демо, постеры, source, Example, settings, лицензия/provenance и проверяемый экспорт. Во всех записях дополнительные пункты ниже добавляются к общим acceptance gates UX/LAY/ENG/QA/SEC.

### S001 — Стартовый hero с двумя колонками / Starter Split Hero

**Доступ:** free; **набор:** FREE-STARTER; **slug:** `starter-split-hero`.

**Задача:** Первый экран небольшого продукта без обязательных медиа.

**Композиция:** Заголовок, описание, две ссылки, контрастная декоративная панель с тремя карточками.

**React API (кодовый):** `eyebrow`, `title`, `description`, `primaryAction`, `secondaryAction`, `accent`, `surface`, `radius`, `density`, `motion`.

**Поля Studio:** `eyebrow` (plain-text); `title` (plain-text); `description` (plain-text); `primaryAction` (safe-link-object); `secondaryAction` (safe-link-object); `accent` (hex-color); `surface` (hex-color); `radius` (number); `density` (enum); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Однократное мягкое появление без перекрытия клика.

**Адаптация:** Две колонки от 960px, ниже текст перед панелью; заголовок переносится естественно.

**Ресурсы:** Собственные CSS/SVG фигуры, внешние фото и шрифты не требуются.

**Включаемые зависимости:** C001, E001.

**Дополнительная приёмка:**

- CAT-S001-01: Обе CTA ведут по заданным ссылкам, нет пустых href.
- CAT-S001-02: Длинный RU заголовок не выходит за контейнер; без анимации смысл полностью виден.

### S002 — Стартовая сетка преимуществ / Starter Feature Grid

**Доступ:** free; **набор:** FREE-STARTER; **slug:** `starter-feature-grid`.

**Задача:** Показать 3–6 преимуществ без сложного сценария взаимодействия.

**Композиция:** Заголовок и до шести карточек с номером/локальной иконкой и текстом.

**React API (кодовый):** `title`, `description`, `features[3..6]`, `accent`, `surface`, `radius`, `density`, `motion`.

**Поля Studio:** `title` (plain-text); `description` (plain-text); `features` (bounded-structured-list); `accent` (hex-color); `surface` (hex-color); `radius` (number); `density` (enum); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Небольшое появление групп; нет автоматического движения внутри карточек.

**Адаптация:** 3/2/1 колонки по доступной ширине; высота карточек следует контенту.

**Ресурсы:** Набор своих простых SVG, текстовая альтернатива.

**Включаемые зависимости:** E001.

**Дополнительная приёмка:**

- CAT-S002-01: Три и шесть карточек выглядят завершённо.
- CAT-S002-02: Удвоенное описание не обрезается и не требует скрытого hover.

### S003 — Стартовый блок действия / Starter Action Band

**Доступ:** free; **набор:** FREE-STARTER; **slug:** `starter-action-band`.

**Задача:** Завершить короткий лендинг понятным действием.

**Композиция:** Контрастная полоса с заголовком, текстом, одной CTA и необязательной подписью.

**React API (кодовый):** `title`, `description`, `action`, `note`, `accent`, `surface`, `radius`, `motion`.

**Поля Studio:** `title` (plain-text); `description` (plain-text); `action` (safe-link-object); `note` (plain-text); `accent` (hex-color); `surface` (hex-color); `radius` (number); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Ответ кнопки на взаимодействие, без декоративного autoplay.

**Адаптация:** Кнопка под текстом на узкой ширине; сам контейнер не имеет фиксированной высоты.

**Ресурсы:** Только код.

**Включаемые зависимости:** C001.

**Дополнительная приёмка:**

- CAT-S003-01: CTA получает ссылку или обработчик; поведение однозначно.
- CAT-S003-02: Note отсутствует без пустого отступа.

### S004 — Hero с интерактивным демо / Product Demo Hero

**Доступ:** pro; **набор:** PACK-PRODUCT; **slug:** `product-demo-hero`.

**Задача:** Показать пользу цифрового продукта прямо в первом экране.

**Композиция:** Типографический блок, CTA и собственный абстрактный demo-panel с переключением метрик; реальные API не подразумеваются.

**React API (кодовый):** `title`, `description`, `actions`, `demoStates[2..4]`, `initialState`, `accent`, `surface`, `radius`, `motion`.

**Поля Studio:** `title` (plain-text); `description` (plain-text); `actions` (safe-link-list); `demoStates` (bounded-structured-list); `initialState` (enum-from-current-item-ids); `accent` (hex-color); `surface` (hex-color); `radius` (number); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Переход между выбранными demo-states; без автопереключения по умолчанию.

**Адаптация:** Панель идёт после текста; контрольные элементы остаются доступны на touch.

**Ресурсы:** Свои SVG/HTML схемы без брендов и скриншотов чужих продуктов.

**Включаемые зависимости:** C001, C004.

**Дополнительная приёмка:**

- CAT-S004-01: Демо явно использует примерные данные.
- CAT-S004-02: Переключение клавиатурой меняет видимую панель; отключённое движение не скрывает данные.

### S005 — История возможностей по шагам / Product Feature Steps

**Доступ:** pro; **набор:** PACK-PRODUCT; **slug:** `product-feature-steps`.

**Задача:** Объяснить 3–5 возможностей продукта с визуальным примером.

**Композиция:** Список шагов/вкладок рядом с общей областью схемы и пояснения; контент не зависит от скролл-перехвата.

**React API (кодовый):** `title`, `steps[3..5]`, `initialStep`, `accent`, `surface`, `density`, `motion`.

**Поля Studio:** `title` (plain-text); `steps` (bounded-structured-list); `initialStep` (enum-from-current-item-ids); `accent` (hex-color); `surface` (hex-color); `density` (enum); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Контролируемая смена панели и stagger видимых деталей; никакого scroll-jacking.

**Адаптация:** На mobile переключатель над панелью; вертикальный список доступен без hover.

**Ресурсы:** Собственные SVG/HTML схемы для каждого шага.

**Включаемые зависимости:** C002, E002.

**Дополнительная приёмка:**

- CAT-S005-01: После выбора шага подпись и иллюстрация соответствуют одному ID.
- CAT-S005-02: Скрытые панели не оставляют интерактивные элементы в tab-order.

### S006 — Сравнение тарифов / Product Pricing Compare

**Доступ:** pro; **набор:** PACK-PRODUCT; **slug:** `product-pricing-compare`.

**Задача:** Отобразить тарифы конечного сайта пользователя, без реализации оплаты.

**Композиция:** 2–4 тарифные карточки, переключение периода и сравнимый список функций; ссылки задаёт интегратор.

**React API (кодовый):** `title`, `plans[2..4]`, `billingPeriods`, `initialPeriod`, `disclaimer`, `accent`, `surface`, `motion`.

**Поля Studio:** `title` (plain-text); `plans` (bounded-structured-list); `billingPeriods` (enum-list); `initialPeriod` (enum-from-current-item-ids); `disclaimer` (plain-text); `accent` (hex-color); `surface` (hex-color); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Мягкая смена значений периода, без анимации изменения размера текста.

**Адаптация:** Карточки вертикально на mobile; таблица сравнения заменяется семантически читаемыми группами.

**Ресурсы:** Только код и реальные подписи demo-данных.

**Включаемые зависимости:** C001.

**Дополнительная приёмка:**

- CAT-S006-01: Период, сумма и подпись расчёта меняются согласованно.
- CAT-S006-02: Нет фиктивного платежа, нерабочих CTA и придуманной скидки.

### S007 — Редакционный типографический hero / Editorial Title Hero

**Доступ:** pro; **набор:** PACK-EDITORIAL; **slug:** `editorial-title-hero`.

**Задача:** Открыть портфолио или студийный сайт крупной типографикой.

**Композиция:** Асимметричный заголовок, короткая подпись, одна локальная работа/изображение, ссылки навигации по смыслу.

**React API (кодовый):** `title`, `description`, `image`, `imageAlt`, `caption`, `actions`, `accent`, `surface`, `motion`.

**Поля Studio:** `title` (plain-text); `description` (plain-text); `caption` (plain-text); `actions` (safe-link-list); `accent` (hex-color); `surface` (hex-color); `motion` (enum); `demoPresetId` (enum-from-bundled-demo-presets). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Появление по смысловым группам без посимвольного разбиения доступного текста.

**Адаптация:** Один поток на mobile; крупный заголовок ограничен clamp и не перекрывает ссылки.

**Ресурсы:** Собственная абстрактная композиция/SVG, заменяемая локальным изображением.

**Включаемые зависимости:** E001.

**Дополнительная приёмка:**

- CAT-S007-01: Отключение картинки оставляет завершённую композицию.
- CAT-S007-02: Заголовок остаётся одним понятным текстом для screen reader.

### S008 — Редакционный список проектов / Editorial Project Index

**Доступ:** pro; **набор:** PACK-EDITORIAL; **slug:** `editorial-project-index`.

**Задача:** Показать 3–8 проектов со своими ссылками и медиа.

**Композиция:** Нумерованный список/сетка работ; крупная область выбранного проекта дополняет доступные карточки.

**React API (кодовый):** `title`, `projects[3..8]`, `initialProject`, `accent`, `surface`, `density`, `motion`.

**Поля Studio:** `title` (plain-text); `projects` (bounded-structured-list); `initialProject` (enum-from-current-item-ids); `accent` (hex-color); `surface` (hex-color); `density` (enum); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Смена превью по focus/выбору; hover не является единственным способом управления.

**Адаптация:** На mobile карточки с собственными изображениями; общий preview может убираться без потери информации.

**Ресурсы:** 3–8 своих/разрешённых локальных иллюстраций.

**Включаемые зависимости:** C005.

**Дополнительная приёмка:**

- CAT-S008-01: Фокус и touch дают доступ к названию, описанию и переходу.
- CAT-S008-02: Выбранная работа не вызывает автопрокрутку страницы.

### S009 — Редакционный контактный footer / Editorial Contact Footer

**Доступ:** pro; **набор:** PACK-EDITORIAL; **slug:** `editorial-contact-footer`.

**Задача:** Закрыть сайт контактами и содержательной навигацией.

**Композиция:** Контактный заголовок, email, ссылки, локальное время/подпись как необязательный статичный контент, юридическая строка.

**React API (кодовый):** `title`, `email`, `links`, `note`, `copyright`, `accent`, `surface`, `motion`.

**Поля Studio:** `title` (plain-text); `email` (email-text); `links` (safe-link-list); `note` (plain-text); `copyright` (plain-text); `accent` (hex-color); `surface` (hex-color); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Однократное появление декора; ссылки работают независимо от движения.

**Адаптация:** Контактный адрес переносится; колонки превращаются в один поток.

**Ресурсы:** Своя SVG линия или декоративный знак; никакого обязательного фото.

**Включаемые зависимости:** C001.

**Дополнительная приёмка:**

- CAT-S009-01: Email сформирован безопасно и имеет читаемую подпись.
- CAT-S009-02: Не создаётся SSR hydration ошибка из локального времени или текущего года.

### S010 — Hero с графическими стикерами / Playful Sticker Hero

**Доступ:** pro; **набор:** PACK-PLAYFUL; **slug:** `playful-sticker-hero`.

**Задача:** Создать характерный первый экран бренда через собственные формы и иллюстрации.

**Композиция:** Заголовок, 3–5 абстрактных стикеров с фиксированной композицией, короткий текст, CTA.

**React API (кодовый):** `title`, `description`, `action`, `stickers[3..5]`, `accent`, `surface`, `radius`, `motion`.

**Поля Studio:** `title` (plain-text); `description` (plain-text); `action` (safe-link-object); `accent` (hex-color); `surface` (hex-color); `radius` (number); `motion` (enum); `demoPresetId` (enum-from-bundled-demo-presets). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Небольшой отклик декора на pointer; движение выключается на reduced motion.

**Адаптация:** Стикеры не перекрывают текст; на touch статичная композиция.

**Ресурсы:** Только собственные SVG/формы с записанным происхождением.

**Включаемые зависимости:** C007.

**Дополнительная приёмка:**

- CAT-S010-01: Декор aria-hidden и click-through.
- CAT-S010-02: Движение не смещает текст и кликабельные зоны.

### S011 — FAQ в карточках / Playful Question Cards

**Доступ:** pro; **набор:** PACK-PLAYFUL; **slug:** `playful-question-cards`.

**Задача:** Ответить на 4–8 вопросов с выразительной, но читаемой композицией.

**Композиция:** Набор раскрывающихся карточек, смысловой заголовок, необязательная ссылка поддержки.

**React API (кодовый):** `title`, `questions[4..8]`, `allowMultiple`, `initialOpenIds`, `supportAction`, `accent`, `surface`, `motion`.

**Поля Studio:** `title` (plain-text); `questions` (bounded-structured-list); `allowMultiple` (boolean); `initialOpenIds` (bounded-id-list); `supportAction` (safe-link-object); `accent` (hex-color); `surface` (hex-color); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Раскрытие ответа без скрытия фокуса; при reduced motion мгновенное.

**Адаптация:** Одна колонка на узких экранах, ответы не обрезаются фиксированной высотой.

**Ресурсы:** Только код и свои маркеры.

**Включаемые зависимости:** E001.

**Дополнительная приёмка:**

- CAT-S011-01: aria-expanded/controls соответствуют состоянию; ID уникальны у двух экземпляров.
- CAT-S011-02: Весь длинный ответ доступен при zoom и клавиатуре.

### S012 — CTA с орбитальной графикой / Playful Orbit CTA

**Доступ:** pro; **набор:** PACK-PLAYFUL; **slug:** `playful-orbit-cta`.

**Задача:** Завершить страницу одним заметным действием и авторским декоративным акцентом.

**Композиция:** Центральный заголовок/CTA и несколько геометрических элементов вокруг; без пользовательского drag-редактора.

**React API (кодовый):** `title`, `description`, `action`, `decorations[2..5]`, `accent`, `surface`, `radius`, `motion`, `paused`, `onPausedChange`, `includePauseControl`.

**Поля Studio:** `title` (plain-text); `description` (plain-text); `action` (safe-link-object); `accent` (hex-color); `surface` (hex-color); `radius` (number); `motion` (enum); `paused` (boolean); `includePauseControl` (boolean); `demoPresetId` (enum-from-bundled-demo-presets). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** В expressive допускается медленный декоративный цикл с Pause; off/reduced motion статичны.

**Адаптация:** Орбиты схлопываются в безопасное обрамление; CTA остаётся в нормальном потоке.

**Ресурсы:** Собственные SVG/кодовые формы.

**Включаемые зависимости:** C007, E004.

**Дополнительная приёмка:**

- CAT-S012-01: Pause доступен и останавливает цикл, настройки сохраняют смысл.
- CAT-S012-02: Эффект не захватывает scroll/pointer основного действия.
- CAT-S012-03: Экспорт включает доступную нативную Pause/Resume кнопку, если включён декоративный цикл; onPausedChange — только кодовый callback. Панель сервиса не заменяет этот контроль.


### C001 — Кнопка с откликом / Press Button

**Доступ:** free; **набор:** FREE-STARTER; **slug:** `press-button`.

**Задача:** Базовая настраиваемая кнопка или ссылка с чёткой обратной связью.

**Композиция:** Нативный button или link, текст, необязательная иконка, pending/disabled.

**React API (кодовый):** `label`, `hrefOrOnClick`, `icon`, `pending`, `disabled`, `size`, `accent`, `radius`, `motion`.

**Поля Studio:** `label` (plain-text); `action` (safe-link-object); `pending` (boolean); `disabled` (boolean); `size` (enum); `accent` (hex-color); `radius` (number); `motion` (enum); `demoPresetId` (enum-from-bundled-demo-presets). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Небольшое нажатие и focus feedback; off сохраняет различимые состояния.

**Адаптация:** Минимальная зона касания 44×44 CSS px, текст не обрезается.

**Ресурсы:** Своя SVG иконка или без иконки.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-C001-01: pending защищает от повторного действия и объявляется доступно.
- CAT-C001-02: link/button семантика выбрана корректно, без вложенных interactive элементов.

### C002 — Контентные вкладки / Content Tabs

**Доступ:** free; **набор:** FREE-STARTER; **slug:** `content-tabs`.

**Задача:** Переключать небольшой связанный набор панелей.

**Композиция:** Tablist, 2–6 tabs, панели с управляемым активным ID.

**React API (кодовый):** `tabs[2..6]`, `value`, `defaultValue`, `onValueChange`, `orientation`, `accent`, `motion`.

**Поля Studio:** `tabs` (bounded-structured-list); `defaultValue` (enum-from-current-item-ids); `orientation` (enum); `accent` (hex-color); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Подвижный индикатор, при reduced motion статичный; панели без автоплея.

**Адаптация:** На mobile доступная прокрутка только tablist при необходимости, не всей страницы.

**Ресурсы:** Только код.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-C002-01: Стрелки/Home/End и Tab работают согласно выбранному паттерну APG.
- CAT-C002-02: Невидимые панели не получают фокус;controlled и uncontrolled режимы описаны.

### C003 — Сегментированная навигация / Segmented Navigation

**Доступ:** pro; **набор:** PACK-PRODUCT; **slug:** `segmented-navigation`.

**Задача:** Оформить короткую навигацию по страницам или якорям.

**Композиция:** 3–6 ссылок в общей оболочке, active state задаётся проектом.

**React API (кодовый):** `items[3..6]`, `activeId`, `ariaLabel`, `accent`, `surface`, `density`, `motion`.

**Поля Studio:** `items` (bounded-structured-list); `activeId` (plain-text); `ariaLabel` (plain-text); `accent` (hex-color); `surface` (hex-color); `density` (enum); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Индикатор активной ссылки; без автоматического изменения маршрутов.

**Адаптация:** Mobile: компактный перенос/горизонтальная полоса с видимыми краями; не dropdown без основания.

**Ресурсы:** Только код.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-C003-01: Используется nav и aria-current, а не tabs для настоящих ссылок.
- CAT-C003-02: Active маршрут не определяется обращением к window во время SSR.

### C004 — Переключатель метрик / Metric Switcher

**Доступ:** pro; **набор:** PACK-PRODUCT; **slug:** `metric-switcher`.

**Задача:** Переключать несколько компактных групп показателей с подписью.

**Композиция:** 2–4 состояния, заголовок, значение и единицы, краткое пояснение.

**React API (кодовый):** `states[2..4]`, `value`, `onValueChange`, `locale`, `accent`, `motion`.

**Поля Studio:** `states` (bounded-structured-list); `locale` (enum); `accent` (hex-color); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Переключение opacity, формат значений стабилен; не бесконечный счётчик.

**Адаптация:** Метрики переносимы в один столбец, длинная подпись видна.

**Ресурсы:** Только код.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-C004-01: Intl форматирование учитывает RU/EN, сервер и клиент получают один locale.
- CAT-C004-02: Цифры не объявляются screen reader покадрово.

### C005 — Карточка проекта / Project Card

**Доступ:** pro; **набор:** PACK-EDITORIAL; **slug:** `project-card`.

**Задача:** Показать работу с изображением, ролью и переходом.

**Композиция:** Изображение, категория, название, подпись, одна основная ссылка.

**React API (кодовый):** `title`, `category`, `description`, `image`, `alt`, `href`, `aspectRatio`, `accent`, `motion`.

**Поля Studio:** `title` (plain-text); `category` (plain-text); `description` (plain-text); `alt` (plain-text); `href` (plain-text); `aspectRatio` (enum); `accent` (hex-color); `motion` (enum); `demoPresetId` (enum-from-bundled-demo-presets). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Мягкий crop/подъём без изменения доступной информации.

**Адаптация:** На touch вся важная информация видна без hover.

**Ресурсы:** Своя локальная абстрактная обложка.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-C005-01: Нет вложенных ссылок и пустого alt для смыслового изображения.
- CAT-C005-02: Изображение резервирует размеры и не создаёт layout shift.

### C006 — Галерея с просмотром / Media Gallery

**Доступ:** pro; **набор:** PACK-EDITORIAL; **slug:** `media-gallery`.

**Задача:** Показать 3–12 изображений с доступным увеличением.

**Композиция:** Сетка миниатюр, native dialog просмотра, предыдущий/следующий, подпись, закрытие.

**React API (кодовый):** `items[3..12]`, `columns`, `initialIndex`, `accent`, `radius`, `motion`.

**Поля Studio:** `items` (bounded-structured-list); `columns` (number); `initialIndex` (number); `accent` (hex-color); `radius` (number); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Opacity/небольшой переход; без принудительного autoplay.

**Адаптация:** Touch-кнопки доступны;zoom браузера не блокируется; swipe необязателен.

**Ресурсы:** Собственные/разрешённые локальные изображения.

**Включаемые зависимости:** C005.

**Дополнительная приёмка:**

- CAT-C006-01: Escape закрывает, focus возвращается в исходную карточку, background не интерактивен.
- CAT-C006-02: Кнопки и клавиатура работают без swipe; без внешнего media embed.

### C007 — Кнопка с магнитным откликом / Magnetic Button

**Доступ:** pro; **набор:** PACK-PLAYFUL; **slug:** `magnetic-button`.

**Задача:** Добавить декоративный отклик на pointer, сохранив обычное действие.

**Композиция:** Нативная кнопка/ссылка со стабильной зоной действия и отдельным движущимся декором.

**React API (кодовый):** `label`, `hrefOrOnClick`, `strength`, `accent`, `radius`, `motion`.

**Поля Studio:** `label` (plain-text); `action` (safe-link-object); `strength` (number); `accent` (hex-color); `radius` (number); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Сдвигается декоративная оболочка, не реальная hit-area; off/reduced/touch без эффекта.

**Адаптация:** На touch обычная кнопка от 44×44 CSS px.

**Ресурсы:** Только код.

**Включаемые зависимости:** C001.

**Дополнительная приёмка:**

- CAT-C007-01: Hit-area не убегает от pointer и не вызывает потерю hover.
- CAT-C007-02: Фокус виден при любом состоянии, подписки очищаются при unmount.

### C008 — Переключатель отзывов / Testimonial Switcher

**Доступ:** pro; **набор:** PACK-PLAYFUL; **slug:** `testimonial-switcher`.

**Задача:** Показать несколько настоящих отзывов с ручным выбором.

**Композиция:** Цитата, автор, роль, необязательный avatar, кнопки prev/next и позиция.

**React API (кодовый):** `quotes[2..8]`, `initialIndex`, `onIndexChange`, `accent`, `surface`, `motion`.

**Поля Studio:** `quotes` (bounded-structured-list); `initialIndex` (number); `accent` (hex-color); `surface` (hex-color); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Смена карточки; autoplay по умолчанию отключён.

**Адаптация:** Высота следует тексту, кнопки не перекрывают цитату.

**Ресурсы:** Свои иллюстративные avatar; demo-отзывы явно вымышленные.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-C008-01: Демо не выглядит подтверждённым отзывом реального клиента.
- CAT-C008-02: Позиция доступна без навязчивого live announcement на каждую анимацию.

### E001 — Появление контента / Content Reveal

**Доступ:** free; **набор:** FREE-STARTER; **slug:** `content-reveal`.

**Задача:** Добавить однократное появление без потери доступности контента.

**Композиция:** Wrapper/hook с ограниченной дистанцией и duration, явным SSR fallback.

**React API (кодовый):** `children`, `once`, `distance`, `duration`, `motion`.

**Поля Studio:** `once` (boolean); `distance` (number); `duration` (number); `motion` (enum); `demoPresetId` (enum-from-bundled-demo-presets). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** IntersectionObserver запускает эффект; в off/reduced и при сбое контент виден.

**Адаптация:** Не привязан к фиксированной высоте viewport.

**Ресурсы:** Только код.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-E001-01: Без JS в SSR смысловой контент виден, не остаётся opacity:0.
- CAT-E001-02: Observer и listeners отключаются после unmount, несколько экземпляров независимы.

### E002 — Последовательное появление группы / Stagger Group

**Доступ:** pro; **набор:** PACK-PRODUCT; **slug:** `stagger-group`.

**Задача:** Согласованно показать небольшой список однотипных элементов.

**Композиция:** Wrapper группы и child helper с лимитом задержки, без изменения DOM-семантики.

**React API (кодовый):** `children`, `interval`, `maxDelay`, `once`, `motion`.

**Поля Studio:** `interval` (number); `maxDelay` (number); `once` (boolean); `motion` (enum); `demoPresetId` (enum-from-bundled-demo-presets). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** CSS delay с максимальной общей задержкой 400ms; off/reduced без ожидания.

**Адаптация:** Учитывает визуальный порядок после переноса сетки.

**Ресурсы:** Только код.

**Включаемые зависимости:** E001.

**Дополнительная приёмка:**

- CAT-E002-01: Первый интерактивный элемент доступен сразу, focus не ждёт animation.
- CAT-E002-02: Большое число children не превращает показ в длинную последовательность.

### E003 — Мягкий градиентный фон / Soft Mesh Background

**Доступ:** pro; **набор:** PACK-EDITORIAL; **slug:** `soft-mesh-background`.

**Задача:** Добавить локальный декоративный фон без WebGL.

**Композиция:** Несколько CSS gradient layers внутри ограниченного контейнера, контент поверх отдельным слоем.

**React API (кодовый):** `colors[2..4]`, `opacity`, `grain`, `motion`, `paused`, `onPausedChange`, `includePauseControl`.

**Поля Studio:** `colors` (hex-color-list); `opacity` (number); `grain` (boolean); `motion` (enum); `paused` (boolean); `includePauseControl` (boolean). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** В expressive очень медленный сдвиг с Pause; off/reduced статичная версия.

**Адаптация:** Ограниченная площадь отрисовки, без больших full-page blur.

**Ресурсы:** Собственный код, grain как локальная SVG/texture с происхождением.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-E003-01: Фон aria-hidden и не снижает контраст текста исходных пресетов.
- CAT-E003-02: Pause останавливает движение; нет перерисовки всей страницы на pointer.
- CAT-E003-03: Экспорт включает доступную нативную Pause/Resume кнопку, если включён декоративный цикл; onPausedChange — только кодовый callback. Панель сервиса не заменяет этот контроль.


### E004 — Локальная подсветка / Pointer Spotlight

**Доступ:** pro; **набор:** PACK-PLAYFUL; **slug:** `pointer-spotlight`.

**Задача:** Добавить локальную реакцию фона на pointer без изменения содержимого.

**Композиция:** Радиальная маска/градиент внутри корня с ограниченной интенсивностью.

**React API (кодовый):** `radius`, `intensity`, `accent`, `motion`.

**Поля Studio:** `radius` (number); `intensity` (number); `accent` (hex-color); `motion` (enum). Полные ограничения см. в JSON; callbacks и ReactNode не принимаются.

**Движение:** Позиция через CSS variables и throttled rAF только в активной области; off/reduced/touch статично.

**Адаптация:** Не требует pointer на mobile; ширина контейнера не влияет на hit-area.

**Ресурсы:** Только код.

**Включаемые зависимости:** Нет отдельных item-зависимостей.

**Дополнительная приёмка:**

- CAT-E004-01: Нет listener на всей странице без необходимости; цикл останавливается вне экрана/вкладки.
- CAT-E004-02: Декор pointer-events:none, сообщение и действия доступны без эффекта.

## 5. Промпты и документация

Для каждого из 24 элементов генерируются preserve/adapt на RU/EN: всего 96 семейств mode × locale, из них 24 Free и 72 Pro. Для Next/Vite получается 192 комбинации сборки, которые проверяются автоматизированно по контракту; это не 192 пользовательские сессии и не дополнительные items. Они создаются из версионированных шаблонов и manifest, а не поддерживаются как 96 независимых описаний. Промпт доступен в том же доступе, что и содержащийся в нём исходник.

Отдельно доступны 4 общих бесплатных шаблона (8 локализованных текстов):

| ID | RU / EN |
| --- | --- |
| P01 | Разобрать существующий проект перед интеграцией / Inspect a Project before Integration |
| P02 | Сопоставить токены и оформление / Map Theme Tokens |
| P03 | Проверить движение и доступность / Review Motion and Accessibility |
| P04 | Проверить интеграцию и перечислить изменения / Verify Integration and Report Changes |

8 тем публичной документации (16 страниц RU/EN):

| ID | Slug | RU / EN |
| --- | --- | --- |
| G01 | `quick-start` | Быстрый старт / Quick Start |
| G02 | `next-integration` | Интеграция с Next.js / Next.js Integration |
| G03 | `vite-integration` | Интеграция с Vite / Vite Integration |
| G04 | `theme-and-tokens` | Оформление и токены / Theme and Tokens |
| G05 | `using-with-ai` | Использование с AI / Using with AI |
| G06 | `motion-and-accessibility` | Движение и доступность / Motion and Accessibility |
| G07 | `assets-and-license` | Ресурсы и лицензия / Assets and License |
| G08 | `troubleshooting` | Решение проблем / Troubleshooting |

Общие шаблоны не содержат платных исходников и не обещают работу с любым агентом. Выбор инструмента не создаёт отдельный платный продукт. Сам сервис не выполняет AI-запросы.

## 6. Сопутствующие материалы, учитываемые отдельно

| Материал | Точный план | Доступ |
| --- | --- | --- |
| Демо-страницы коллекций | 3 набора × 2 языка = 6 страниц | Public |
| Страницы элементов | 24 элемента × 2 языка = 48 адресов | Public metadata/demo; source по правам |
| Постеры | 24 набора с RU/EN = 48 изображений | Public marketing/demo |
| Документация по элементам | RU/EN README и INTEGRATE внутри каждого bundle | Free/Pro как у элемента |
| Примеры подключения | Один Example под выбранный Next/Vite из двух проверяемых adapters | Free/Pro как у элемента |
| Ресурсы | Только нужные элементу собственные/разрешённые SVG/изображения, с manifest | По лицензии элемента и ресурса |
| Changelog | Общая лента плюс изменения каждого релиза, RU/EN | Public |
| Юридические страницы | License, Terms, Privacy, Refunds × RU/EN, финал после проверки рынка/продавца | Public до оплаты |

Это не дополнительные «шаблоны сайтов». В первой версии нет отдельных downloadable full-page templates, shader library/MP4, dashboard kits, Figma library или фотостока. Задания на новые продукты проходят отдельное решение по scope.

## 7. Контентный процесс и критерии

Каждый item проходит: brief → собственная композиция → код → props/config → RU/EN → источник ресурсов → демо/постеры → две среды и accessibility → ZIP/промпт → peer review → immutable release. Наличие записи в JSON не означает ready.

Поля производства в будущем: assigned_owner, design_status, code_status, locale_status_ru/en, qa_status, provenance_status, release_status и evidence_links. Смена release_status на published блокируется при неполных полях или недействительных checksums.

| ID | Условие |
| --- | --- |
| CAT-01 | Ровно 24 уникальных ID/slug, правильные типы, нет циклов зависимостей. |
| CAT-02 | Free зависит только от Free; Pro только от Free или элементов своего набора; standalone ZIP самодостаточен. |
| CAT-03 | Покупка каждого набора разблокирует ровно перечисленные item IDs и все необходимые локальные files/helpers. |
| CAT-04 | Повторное использование item в секции не создаёт новую позицию и новую оплату. |
| CAT-05 | Оба языка, оба prompt modes и оба host-проекта готовы у каждого опубликованного item. |
| CAT-06 | Неодинаковые props между RU/EN исходниками не поддерживаются: код общий, тексты и форматирование локализованы. |
| CAT-07 | Демо-отзывы/метрики отмечены как примеры; реальные бренды, скриншоты и фото не используются без основания. |
| CAT-08 | В manifest включены лицензии и происхождение всех поставляемых ресурсов, включая вложенные dependencies. |


## 8. Кодовый API, Studio и безопасность конфигурации

`runtime_props` описывает допустимый API исходного React-компонента. `studio_fields` — отдельный whitelist сериализуемых настроек конкретного элемента: типы, пределы и безопасные встроенные media presets. Studio не создаёт функции, не принимает ReactNode/произвольные HTML/SVG/JS, не загружает удалённые медиа. Настройка callbacks и собственных локальных изображений остаётся в коде проекта после экспорта. Поля bounded lists окончательно типизируются в configSchema каждого реализованного релиза; пока это производственное задание.

Default share содержит только оформление/движение. Пользовательские тексты и ссылки добавляются отдельным явным opt-in с предупреждением о публичности. Контекст проекта никогда не включается. Полный ZIP и prompt отражают текущий валидированный draft независимо от share projection.

Декоративный цикл E003/S012 требует доступного Pause/Resume и в экспортируемом коде. Toolbar сервиса не заменяет этот контроль. Скрытие встроенной кнопки допустимо при выключенном цикле или после подключения равноценного внешнего контроля интегратором; произвольный JSON не может отключить единственную доступную кнопку при активном цикле.

## 9. Полнота коллекции и формат получения v1

На странице каждого набора показаны все шесть купленных позиций: три секции в общей композиции и самостоятельные демо двух компонентов и эффекта. Особенно не пропускать C003, C006, E003, C008, которые не входят в секции своего набора. Повторная демонстрация не увеличивает число items.

В v1 ZIP и AI-комплект формируются для одного элемента за раз. Покупка pack/bundle открывает соответствующие индивидуальные комплекты; единый ZIP изменённой пользователем страницы не входит в v1. Совместимость нескольких отдельно полученных элементов проверяется в host-fixture.

Плановый JSON не является готовым production manifest: локализованные описания, тексты демо, aria labels, docs и prompt templates на обоих языках создаются и вычитываются до публикации.
