# Раздел «Анимации»: каталог и контракт поставки v0.3

Статус: дополнение к ТЗ, задания на производство. Скрипты, демонстрации и проверки ещё не выполнены. Источник состава — [catalog.json](catalog.json); motion собственного сайта — [site-motion.ru.md](site-motion.ru.md).

## 1. Назначение и счётчики

Анимация поставляется как воспроизводимое поведение с конкретным markup/API контрактом, готовым локальным исходником, промптом и инструкцией. Это отдельный способ найти и применить motion; он не требует покупки полной страницы или встроенного AI.

На старт предлагаются 12 записей: E001–E004 из прежнего каталога и 8 новых A001–A008. Существующие E не пересоздаются и не считаются новыми товарами. Всего в продукте 32 уникальных материала: 12 секций, 8 компонентов, 4 эффекта, 8 animation recipes; 9 Free и 23 Pro. В animation-разделе 4 Free и 8 Pro.

Это уточнение scope: запуск не обязан начинаться со всех 32. Первая бета прежних шести остаётся; следующие три Free A добавляются после проверки сквозного motion-комплекта. 12 motion записей готовы до продажи полного PACK-MOTION. Счётчик опубликованного контента строится по release_status, не по плановому JSON.

## 2. Категории

| Category slug | RU / EN | ID |
| --- | --- | --- |
| `entrances-scroll` | Появление и скролл / Entrances and Scroll | E001, E002, A007 |
| `controls-feedback` | Отклик контролов / Control Feedback | A001 |
| `navigation-transitions` | Навигация и переходы / Navigation and Transitions | A002 |
| `text-numbers` | Текст и числа / Text and Numbers | A003, A008 |
| `cards-media` | Карточки и медиа / Cards and Media | A004 |
| `overlays-menus` | Панели и меню / Overlays and Menus | A005 |
| `lists-data` | Списки и данные / Lists and Data | A006 |
| `backgrounds-pointer` | Фоны и pointer / Backgrounds and Pointer | E003, E004 |

Категория основная одна; вторичные теги допустимы. Наличие двух тегов не даёт второй item. У C001/C002/C003/C004/C005/C006/C007 есть собственное движение, но это не дополнительные позиции раздела: связанные компоненты показываются как примеры применения. Позднее включать их как recipes можно только при честном счёте variant того же ID.

## 3. Точный список animation-раздела

| ID | RU / EN | Доступ | Источник права | Новый item? |
| --- | --- | --- | --- | --- |
| E001 | Появление контента / Content Reveal | free | Публично / FREE-STARTER | Нет, прежний E |
| E002 | Последовательное появление группы / Stagger Group | pro | PACK-PRODUCT или PACK-MOTION | Нет, прежний E |
| A007 | Прогресс глав при скролле / Scroll Chapters | pro | PACK-MOTION | Да |
| A001 | Отклик состояний / State Relay | free | FREE-STARTER | Да |
| A002 | Связанный переход контента / Context Bridge | pro | PACK-MOTION | Да |
| A003 | Сборка строк заголовка / Line Assemble | free | FREE-STARTER | Да |
| A008 | Лента изменения чисел / Metric Roll | pro | PACK-MOTION | Да |
| A004 | Переход общего кадра / Focus Plane | pro | PACK-MOTION | Да |
| A005 | Раскрытие от края / Edge Unfold | pro | PACK-MOTION | Да |
| A006 | Перестроение списка / Ledger Reflow | free | FREE-STARTER | Да |
| E003 | Мягкий градиентный фон / Soft Mesh Background | pro | PACK-EDITORIAL или PACK-MOTION | Нет, прежний E |
| E004 | Локальная подсветка / Pointer Spotlight | pro | PACK-PLAYFUL или PACK-MOTION | Нет, прежний E |

Free: E001, A001, A003, A006. PACK-MOTION: E002, E003, E004, A002, A004, A005, A007, A008. У трёх тематических наборов остаются прежние E; действительное право на item работает в любом разделе сайта. Уже купленный E не требует повторного unlock. Доступ вычисляется по объединению grants, а повторная полная покупка пересекающегося набора требует прозрачного server quote.

Новый предлагаемый BUNDLE-LAUNCH revision 0.3 объединяет четыре набора: 18 + 8 − 3 повторяющихся E = 23 уникальных Pro. Старый snapshot 18 не расширяется молча. Цены Motion и расширенного bundle нужно определить отдельно; $59 из прежнего scope не считается ценой нового состава.

## 4. Постановки восьми новых рецептов

### A001 — Отклик состояний / State Relay

**Доступ:** free; **slug:** `state-relay`; **категория:** `controls-feedback`.

**Задача:** Переход idle → pending → success/error с неподвижной областью действия.

**Отличие от компонента:** Рецепт состояния, не вторая копия кнопки C001: иконка, статус и текст реагируют на внешний результат операции.

**Trigger:** `state-change`.

**Состояния:** idle → pending → success | error → idle; результат приходит от приложения

**Markup-контракт:** Локальный button/status контейнер; операция и aria-live управляются интегратором; нативная разметка включена в Example.

**Прерывание:** Последнее переданное состояние приоритетно; error не теряется за success прошлой операции.

**Off/reduced motion:** Off/reduce меняют состояние сразу, сохраняют сообщения и индикатор реального pending.

**Touch/клавиатура:** Одинаковый отклик на touch/keyboard, без hover-only.

**React API:** `state`, `label`, `statusMessage`, `duration`, `motion`.

**Studio:** `state`, `label`, `statusMessage`, `duration`, `motion`, `demoPresetId`. Refs/callbacks/произвольная разметка не вводятся через редактор.

**Приёмка AN-A001:** success не появляется до результата Clipboard/operation; повторный запрос не создаёт очередь устаревших статусов. Unmount/Strict Mode/resize/off/reduce проверены в Next/Vite; нет оставшихся listeners/RAF/observers.

### A002 — Связанный переход контента / Context Bridge

**Доступ:** pro; **slug:** `context-bridge`; **категория:** `navigation-transitions`.

**Задача:** Короткий переход между готовыми представлениями внутри выделенного контейнера.

**Отличие от компонента:** Отдельно от C003: анимирует смену содержимого и сохраняет контекст, а не двигает индикатор навигации.

**Trigger:** `content-change`.

**Состояния:** current → incoming-ready → transition → current

**Markup-контракт:** Два presentation слоя в одном boundary; router/fetch/history принадлежат приложению. Next/Vite Example задаёт внешнее состояние.

**Прерывание:** Новый ключ отменяет старый переход; URL и commit содержимого не ждут конца анимации.

**Off/reduced motion:** Без travel/crossfade при off; reduce допускает только короткую opacity по политике.

**Touch/клавиатура:** Нет свайпа как единственного способа; focus новой страницы задаётся семантикой приложения.

**React API:** `transitionKey`, `direction`, `duration`, `distance`, `motion`.

**Studio:** `direction`, `duration`, `distance`, `motion`, `demoPresetId`. Refs/callbacks/произвольная разметка не вводятся через редактор.

**Приёмка AN-A002:** Back/Forward, быстрая смена ключей и pending fetch не теряют контент, фокус и историю. Unmount/Strict Mode/resize/off/reduce проверены в Next/Vite; нет оставшихся listeners/RAF/observers.

### A003 — Сборка строк заголовка / Line Assemble

**Доступ:** free; **slug:** `line-assemble`; **категория:** `text-numbers`.

**Задача:** Однократное проявление заголовка по визуальным строкам с локальной маской.

**Отличие от компонента:** Это текстовый рецепт с учётом переноса строк, не общий reveal wrapper E001.

**Trigger:** `enter-viewport`.

**Состояния:** visible-fallback → measured → enter → settled

**Markup-контракт:** Нативный heading сохраняет один доступный текст и выбор/copy; визуальная маска не создаёт повторных screen-reader фраз.

**Прерывание:** Resize/смена шрифта/локали пересчитывают строки без повторного нежелательного старта.

**Off/reduced motion:** SSR/нет JS/ошибка измерения показывают обычный текст; reduce без маски и смещений.

**Touch/клавиатура:** Работает без pointer; длинный RU/EN и zoom не обрезаются.

**React API:** `text`, `duration`, `lineDelay`, `once`, `motion`.

**Studio:** `text`, `duration`, `lineDelay`, `once`, `motion`, `demoPresetId`. Refs/callbacks/произвольная разметка не вводятся через редактор.

**Приёмка AN-A003:** Текст остаётся доступным до JS и при неудачной загрузке шрифта; нет принудительных переносов под один язык. Unmount/Strict Mode/resize/off/reduce проверены в Next/Vite; нет оставшихся listeners/RAF/observers.

**Общий временной бюджет:** `duration` включает задержки всех строк и не превышает 480ms. При большом числе строк effective lineDelay уменьшается/обнуляется. Уже видимый заголовок не скрывается снова после поздней инициализации.

### A004 — Переход общего кадра / Focus Plane

**Доступ:** pro; **slug:** `focus-plane`; **категория:** `cards-media`.

**Задача:** Связать исходную миниатюру и готовую детальную область одним переходом геометрии.

**Отличие от компонента:** Рецепт shared-frame анимации, не карточка C005 и не новый lightbox C006; разметка/семантика детали входят в конкретный Example.

**Trigger:** `selection`.

**Состояния:** idle → target-ready → morph → settled → return

**Markup-контракт:** Измеримые source/target rectangles, стабильные ключи, зарезервированные размеры; overlay декоративный aria-hidden и click-through.

**Прерывание:** Отмена, повторный выбор и удаление исходной карточки завершаются стабильной обычной деталью.

**Off/reduced motion:** При off/reduce обычный переход к содержимому; действие и focus не зависят от overlay.

**Touch/клавиатура:** Touch использует явное действие; кнопка возврата доступна с клавиатуры.

**React API:** `sourceRef`, `targetRef`, `layoutKey`, `duration`, `motion`.

**Studio:** `duration`, `motion`, `demoPresetId`. Refs/callbacks/произвольная разметка не вводятся через редактор.

**Приёмка AN-A004:** Условие target-ready не задерживает маршрут; при изменении scroll/resize есть безопасный fallback без улетающей копии. Unmount/Strict Mode/resize/off/reduce проверены в Next/Vite; нет оставшихся listeners/RAF/observers.

### A005 — Раскрытие от края / Edge Unfold

**Доступ:** pro; **slug:** `edge-unfold`; **категория:** `overlays-menus`.

**Задача:** Показать и закрыть панель или меню от выбранного края с ограниченной амплитудой.

**Отличие от компонента:** Переиспользуемая motion-логика слоя с полным native-dialog Example; не заменяет семантику menu/modal.

**Trigger:** `open-close`.

**Состояния:** closed → opening → open → closing → closed

**Markup-контракт:** Dialog/sheet контейнер и trigger; native dialog adapter с focus restore, Escape и inert background.

**Прерывание:** Повторный toggle разворачивает переход из текущего состояния; close освобождает слой без ожидания animationend.

**Off/reduced motion:** Состояния меняются без сдвига; скрытый слой не остаётся tabbable.

**Touch/клавиатура:** Не требует edge-swipe; touch controls сохраняют target area.

**React API:** `open`, `edge`, `duration`, `distance`, `motion`.

**Studio:** `open`, `edge`, `duration`, `distance`, `motion`, `demoPresetId`. Refs/callbacks/произвольная разметка не вводятся через редактор.

**Приёмка AN-A005:** Escape, быстрый open-close, focus return и reduced motion одинаково работают в демо и в распакованном Example. Unmount/Strict Mode/resize/off/reduce проверены в Next/Vite; нет оставшихся listeners/RAF/observers.

### A006 — Перестроение списка / Ledger Reflow

**Доступ:** free; **slug:** `ledger-reflow`; **категория:** `lists-data`.

**Задача:** Анимировать добавление, удаление, фильтрацию и смену порядка уже обновлённого списка.

**Отличие от компонента:** Отдельно от E002: обработка изменений геометрии и стабильных ключей после обновления данных, а не первичное появление группы.

**Trigger:** `list-change`.

**Состояния:** stable → measure-before → data-commit → measure-after → settle

**Markup-контракт:** Список со стабильными item keys и локальными animation wrappers, не затирающими transform интегратора.

**Прерывание:** Новый data commit заменяет текущую раскладку; отсутствие измерения даёт мгновенный нормальный layout.

**Off/reduced motion:** Новый порядок виден мгновенно, нативный DOM и focus следуют данным.

**Touch/клавиатура:** Без обязательного drag; изменение позиции не уводит focus и опорную карточку за viewport.

**React API:** `itemKeys`, `duration`, `maxDistance`, `motion`.

**Studio:** `duration`, `maxDistance`, `motion`, `demoPresetId`. Refs/callbacks/произвольная разметка не вводятся через редактор.

**Приёмка AN-A006:** Сохраняются keyboard focus и scroll anchor; два списка независимы, уходящий элемент не интерактивен. Unmount/Strict Mode/resize/off/reduce проверены в Next/Vite; нет оставшихся listeners/RAF/observers.

### A007 — Прогресс глав при скролле / Scroll Chapters

**Доступ:** pro; **slug:** `scroll-chapters`; **категория:** `entrances-scroll`.

**Задача:** Показывать прогресс и активную главу рассказа при обычном прокручивании страницы.

**Отличие от компонента:** Оркестрация нескольких глав с индикатором; не копия E001/E002 и не перехват scroll.

**Trigger:** `native-scroll`.

**Состояния:** chapter-id + bounded progress; offscreen → paused

**Markup-контракт:** Семантические section anchors, необязательная sticky sidebar; обязательный контент в нормальном потоке.

**Прерывание:** Scroll назад корректно меняет главу; поздние measurements не прыгают страницу.

**Off/reduced motion:** Off/reduce сохраняют главы и индикатор, отключают пространственное перемещение.

**Touch/клавиатура:** На mobile главы следуют потоком; safe viewport высота не блокирует чтение.

**React API:** `chapters`, `stickyOffset`, `motion`, `onActiveChange`, `onProgressChange`.

**Studio:** `stickyOffset`, `motion`, `demoPresetId`. Refs/callbacks/произвольная разметка не вводятся через редактор.

**Приёмка AN-A007:** Нет wheel/touch preventDefault, auto-scroll и scroll-jacking; resize и anchor links работают обычно. Unmount/Strict Mode/resize/off/reduce проверены в Next/Vite; нет оставшихся listeners/RAF/observers.

**Вычисляемые выходы:** `activeId` и `progress` возвращает сам scroll-controller из native scroll и геометрии глав. Host получает readonly значения/callbacks; Example не требует второй ручной реализации. В Studio используется настоящий локальный scroll preset.

### A008 — Лента изменения чисел / Metric Roll

**Доступ:** pro; **slug:** `metric-roll`; **категория:** `text-numbers`.

**Задача:** Показать изменение числового значения через короткий переход локализованной цифровой ленты.

**Отличие от компонента:** Это анимация отдельного значения, не готовая карточка C004 и не генератор финансовых данных.

**Trigger:** `value-change`.

**Состояния:** formatted-current → new-value-ready → roll → settled

**Markup-контракт:** Одна читаемая подпись значения; визуальные reels aria-hidden; размер зарезервирован, реальное значение обновляется сразу.

**Прерывание:** Быстрое обновление идёт к последнему значению; не проигрывает все промежуточные числа.

**Off/reduced motion:** Off/reduce выводят конечное форматированное число без rolling.

**Touch/клавиатура:** Плюс/минус, дробная часть, разделители RU/EN и длинные значения сохраняют смысл.

**React API:** `value`, `previousValue`, `locale`, `formatOptions`, `duration`, `motion`.

**Studio:** `value`, `previousValue`, `locale`, `duration`, `motion`, `demoPresetId`. Refs/callbacks/произвольная разметка не вводятся через редактор.

**Приёмка AN-A008:** Нет покадрового live announcement, выдуманного прогресса, рассинхронизации сервера/клиента и изменения периода без цены. Unmount/Strict Mode/resize/off/reduce проверены в Next/Vite; нет оставшихся listeners/RAF/observers.

## 5. Формат «промпт + скрипт + инструкция»

Каждая из 12 записей имеет связанный готовый комплект. У E001–E004 это новая документированная точка входа того же item: нельзя продавать второй раз переписанное описание E или выдавать другой код, не выпустив новую itemVersion. Обязательная доступность старой версии по прежнему grant сохраняется; добавленные инструкции в новой версии подчиняются существующим update/security правилам.

### 5.1. Скрипт

Основной поддерживаемый формат — локальный React + TypeScript hook/controller и CSS Modules с полным Example для Next.js/Vite. Скрипт означает готовый исходник, который подключается в проект пользователя. Это не shell-команда и не удалённый `<script src>` сервиса.

Пример структуры нового recipe (реальные имена задаёт manifest):

```text
animation-A001/
  src/createStateRelay.ts
  src/useStateRelay.ts
  src/StateRelay.module.css
  Example.tsx
  config.schema.json
  config.json
  manifest.json
  base-bundle.index.json
  checksums.json
  README.ru.md
  README.en.md
  INSTALL.ru.md
  INSTALL.en.md
  INTEGRATE.ru.md
  INTEGRATE.en.md
  LICENSE.txt
  THIRD_PARTY_NOTICES.txt
```

Если recipe React-only, отдельный `create*.ts` не обязателен: это отражено в files/animationEntry. Если есть переносимый DOM controller, framework-free JS можно предложить как сборку того же TS после отдельной проверки. Полная vanilla-версия всех секций/рецептов не обещается; фильтр JavaScript появляется только у реально опубликованных adapters. Основной контракт 32 items проверяет React targets.

### 5.2. Контракт управления

Manifest recipe добавляет `animationEntry`, `trigger`, `stateMachine`, `markupContract`, `interruptionPolicy`, `focusPolicy`, `cleanupPolicy`, `reducedMotion`, `supportedAdapters` и `capabilities`. Пути указывают на реальные включённые файлы. Для функций управления используется явный capability list: play/pause/replay/scrub/reverse не объявляются всем рецептам автоматически.

Контроллер знает только свой root/refs, не сканирует весь document по введённому селектору. Управление данными, router, платежами и семантикой остаётся у host. Обязательная общая операция `destroy`/cleanup освобождает только собственные ресурсы; отменённый Animation.finished не оставляет unhandled rejection. React adapter корректно работает в Strict Mode.

### 5.3. Промпт

Два режима на RU/EN: «Сохранить выбранное движение» и «Подстроить под проект». Prompt собирается локально из той же itemVersion, script files, target и config. У Pro содержит исходники только после entitlement delivery. Никаких текстов «переделай весь сайт» или обязательного обновления пакетов до latest.

Пример каркаса RU, не готовая реализация:

> Подключи рецепт {itemId}@{itemVersion} из приложенных файлов к {targetElement} в существующем React/TypeScript проекте. Сначала прочитай инструкции репозитория, версии пакетов и разметку элемента. Используй приложенный hook/controller; сохрани семантику, focus, layout и текущую бизнес-логику. Настройки: {validatedConfig}. Режим: {preserveOrAdapt}. Подключи lifecycle cleanup и системный reduced motion. Действие и доступность не должны ждать окончания анимации. Проверь повторный ввод, unmount, touch, resize, RU/EN и доступную сборку. Перечисли изменённые файлы и фактически выполненные проверки. Исходники и markup-контракт приведены ниже.

Английский каркас с тем же поведением:

> Integrate {itemId}@{itemVersion} from the attached source into {targetElement} in the existing React/TypeScript project. Inspect repository instructions, package versions and markup first. Use the supplied hook/controller and preserve semantics, focus, layout and business logic. Configuration: {validatedConfig}. Mode: {preserveOrAdapt}. Include lifecycle cleanup and system reduced-motion support. Actions and accessibility must not wait for animation completion. Verify repeated input, unmount, touch, resize, RU/EN content and available project checks. Report changed files and checks actually performed. The source and markup contract follow below.

User context отделён от авторской инструкции и не отправляется сервисом в AI. Внешнему агенту нельзя обещать иммунитет к prompt injection или гарантированный результат с первой попытки.

### 5.4. Инструкция подключения

INSTALL.ru/en.md обязательны у каждого recipe и описывают:

1. Что делает анимация и какой markup/state contract требует.
2. Поддерживаемый target, peer dependencies, реальные файлы и пути копирования.
3. Минимальный полный Example; способ передать refs/state, не менять business callback.
4. Как подключить styles и настройки, в каких единицах duration/distance.
5. Как запустить trigger; применимые pause/replay/stop и способ безопасной отмены.
6. Cleanup, повторный mount/Strict Mode, resize и изменение locale.
7. Off/reduced motion, SSR/no-JS fallback, клавиатура, focus и touch.
8. Типовые конфликты CSS/transform/layout и исправление.
9. Как проверить: два экземпляра, быстрые действия, отмена, Next/Vite production build.
10. Версия, известные ограничения, размер и ссылка на проверяемый report, лицензия.

Кнопка «Скачать скрипт» отдаёт полный минимальный комплект нужных файлов или ZIP; нельзя выдавать один import с отсутствующим helper. API props, сериализуемая config и произвольный пользовательский JS строго разделены.

## 6. UI раздела и страницы

Маршруты: `/{locale}/animations`, `/{locale}/animations/{categorySlug}`. Детальная страница canonical прежняя `/{locale}/library/{itemSlug}`; ссылки из animation не создают вторую независимую страницу с другими исходниками. Hreflang/canonical и share закрепляют ту же item identity/version. Category pages имеют собственные RU/EN metadata; тонкие произвольные фильтры не попадают в sitemap.

В глобальной навигации появляется «Анимации / Animations». В общем каталоге пользовательская группа «Анимации» включает `effect` и `animation`; в registry это 4 E + 8 A. Счётчики «12 записей раздела» и «8 новых recipes» явно различаются. Типы S/C/E/A внутри схем не переименовываются.

Карточка: постер, короткое действие/результат, category, trigger, Free/Pro, code format, ограничения. У демо явный trigger: «Нажать», «Сменить состояние», «Прокрутить внутри примера», replay если применимо. Состояния успех/ошибка в demo помечены как пример. Никакого запуска двенадцати тяжёлых циклов сразу; в каталоге активно одно демо.

Фильтры: основная категория, trigger, Free/Pro, интенсивность, применимость к touch, поддержанный adapter. Неподдержанный adapter не отображается как готовый экспорт. Карточки не обещают «вставить на любой сайт» без markup contract.

Detail использует прежний Studio: Демо / Настройки / Код / Для AI. В Код видны entry скрипта и необходимые CSS/helpers, ниже или через якорь — инструкция. На desktop инструкция доступна рядом с code flow; на mobile существует явное действие «Инструкция», без обязательного пятого тесного tab. Параметры/код/промпт синхронизированы.

Для scroll-рецепта допускается локальная прокручиваемая demo область с явным обозначением; wheel/touch на странице не перехватываются. Произвольные пользовательские код, SVG, selectors и HTML в playground не исполняются.

## 7. Общие критерии приёмки

| ID | Проверяемое условие |
| --- | --- |
| AN-01 | 12 animation-записей с 8 новыми A и 4 прежними E, 8 непустых категорий, 4 Free / 8 Pro; общий registry 32, 9 Free / 23 Pro. |
| AN-02 | Каждый recipe содержит рабочий source entry, полный Example, props/config, INSTALL/INTEGRATE RU/EN и provenance. |
| AN-03 | Prompt, script, инструкция и demo ссылаются на один release/config/target; E не дублируются новым ID. |
| AN-04 | Повторное действие отменяет/заменяет актуальное движение из текущего состояния, не копит очередь старых переходов. |
| AN-05 | Focus/семантика/реальное действие не ждут animationend; отмена, ошибка и уходящий слой безопасны. |
| AN-06 | Системная настройка reduced motion работает и при изменении во время открытой сессии; Off полностью выключает декоративное движение. |
| AN-07 | Без JS в SSR и при отсутствии нужного browser API доступен полный статический результат. |
| AN-08 | После destroy/unmount и повторного Strict Mode нет лишних RAF/observers/listeners/inline styles. |
| AN-09 | Два экземпляра, длинные RU/EN, resize, font load, zoom и touch проходят реальную проверку в Next/Vite. |
| AN-10 | Декоративные циклы E003 и прочих имеют Pause вне сайта; background/offscreen останавливаются. |
| AN-11 | Paid source и prompt не обходят права через animation routes, previews или прямые API; overlap grants работают. |
| AN-12 | 32 × 2 modes × 2 locales = 128 семейств; 2 React targets = 256 contract cases. Motion 48 семейств / 96 cases — подмножество, не новые items и не проведённые тесты. |
| AN-13 | Измерены размер/память/долгие задачи и взаимодействие относительно того же UI без motion; FPS не обещается без report. |
| AN-14 | Только allowlisted config и bundled demos, без пользовательского eval, внешних script URLs и selectors. |
| AN-15 | Товарный состав/цена snapshot v0.3 не подменяют старый snapshot 18; новыеA не выдаются по старому update window автоматически. |

CSS и Web Animations API — рабочая техническая база для прототипа; дополнительные библиотеки требуют ADR и измерения. Методы запуска и отмены описаны в первичных источниках: [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate), [Animation.cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel). Lifecycle React требует cleanup: [useEffect](https://react.dev/reference/react/useEffect). Отключение необязательного движения задано продуктовым требованием; SC2.3.3 относится к Level AAA и не выдаётся за автоматическое выполнение WCAG AA: [W3C Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

