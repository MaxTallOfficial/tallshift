# Инженерное ТЗ и контроль качества v0.2

Дата: 21 октября 2026. Статус: предлагаемые требования; приложение, исходники элементов и проверки ещё не реализованы. Подтверждено пользователем: React + TypeScript, Next.js и Vite, публичный запуск на русском и английском. Технические решения ниже рекомендуются для первой версии и требуют проверки на одном сквозном элементе. Коммерческие правила являются продуктовым предложением до оформления условий продавца.

## 1. Техническое решение и границы

Продукт состоит из сайта библиотеки, изолированной среды демонстраций и проверяемых комплектов исходников. Один авторский исходник элемента порождает демо, просматриваемые файлы, ZIP и комплект для AI. Интеграция не требует SDK сервиса и не обращается к его backend после переноса файлов.

| Решение | Для v1 | Причина и ограничение |
| --- | --- | --- |
| Сервис | Next.js App Router + TypeScript, модульный монолит | Каталог, документация и аккаунт в одном приложении; отдельные микросервисы пока не оправданы |
| Переносимый код | React + TypeScript + CSS Modules | Не требует Tailwind, токенов или глобального reset целевого проекта |
| Хранилище авторского контента | Git: manifest, TSX/CSS, схемы, инструкции, локализации | Review и связь версии с коммитом; CMS не нужна для 24 элементов |
| Выдача артефактов | Неизменяемые базовые комплекты в object storage; Free публичны, Pro через серверную проверку прав | Платные исходники не импортируются в публичное приложение |
| Конфигурация и итоговый экспорт | В браузере после получения базового комплекта | Пользовательские тексты и контекст проекта не нужны серверу |
| Демонстрации | Статически собранный runtime на отдельном registrable domain/site | Изоляция CSS, JS и сессии аккаунта |
| Учёт оплаты и прав | Одна PostgreSQL БД на коммерческом этапе | Транзакции для заказа, webhook и grant; инфраструктурный поставщик выбирается после региона продавца |
| Поиск | Два локализованных статических индекса | Для 24 элементов внешний поисковый SaaS избыточен |
| AI | Локальный шаблон промпта, без вызова LLM | Нет модельных ключей, серверного доступа к репозиторию или обещания одинакового результата всех агентов |

В бесплатном сквозном выпуске БД, аккаунт и платёжная интеграция отсутствуют. Схемы releases и manifests сразу совместимы с будущей коммерческой выдачей. Не создаются CMS, registry CLI, MCP, пользовательские публикации, file uploads, облачная генерация кода, редактор произвольного JS и конструктор сайтов.

### 1.1. CSS Modules или Tailwind

| Критерий аудитории | CSS Modules | Отдельный Tailwind-экспорт |
| --- | --- | --- |
| Вставка в неизвестный Next/Vite-проект | Локальные CSS-файлы, без обязательной настройки CSS-фреймворка | Требует совместимого Tailwind pipeline и проверки контекста проекта |
| Вайбкодер с существующим Tailwind | Может использовать вместе с Tailwind; токены подключаются через props/CSS variables | Привычные utility classes, но возможны расхождения версий и конфигурации |
| Читаемость собственных эффектов | Явные keyframes и media queries рядом с элементом | Комбинация utilities, arbitrary values и иногда отдельного CSS |
| Стоимость авторского производства | Один проверяемый вариант | Вторая поддерживаемая реализация каждого элемента, синхронизация исправлений и удвоение части проверок |
| Обещание дизайна | Один канонический результат | Нельзя считать автоматическую AI-конвертацию проверенным форматом |

Рекомендация: CSS Modules в v1, наследуемый шрифт и локальные CSS-переменные. Проект с Tailwind поддерживается как целевая среда совместного использования, а не как второй формат выдачи. Если данные интеграций покажут устойчивый спрос, Tailwind добавляется как отдельный variant со своей матрицей и acceptance. Такой variant не становится новым самостоятельным элементом каталога.

CSS Modules поддерживаются стандартными средствами [Next.js](https://nextjs.org/docs/app/getting-started/css) и [Vite](https://vite.dev/guide/features). Настройка Tailwind в Vite использует свой плагин и CSS import; это конкретная интеграция, которую пришлось бы поддерживать дополнительно. [Официальная установка Tailwind](https://tailwindcss.com/docs/installation/using-vite).

## 2. Модульный монолит и границы исполнения

Предлагаемая структура будущего репозитория:

```text
apps/web/                      # Next App Router: каталог, docs, аккаунт, API
apps/preview/                  # статическая сборка авторских demo runtimes
packages/contracts/            # JSON schemas, типы, validators, error codes
packages/exporter/             # pure config -> Example/prompt/ZIP routines
packages/catalog/              # public projections, search index, release selection
packages/commerce/             # offers/orders/grants, server-only
packages/delivery/             # server-only доступ к private bundles
content/items/{itemId}/         # авторские исходники и RU/EN тексты
content/packs/                  # pack/offer revisions, item membership
content/releases/               # release metadata и remediation relations
fixtures/vite/                  # чистые проекты с lockfile
fixtures/next/                  # SSR/App Router проекты с lockfile
reports/                       # CI evidence, размеры, accessibility, provenance
scripts/                       # validate/build/package/publish
```

Это логические модули и один backend deployment. `preview` отделяется по домену и сборке, а не превращается в произвольную песочницу исполнения. Таблицы commerce не читаются напрямую компонентами страницы; используются серверные функции с проверкой пользователя. Инфраструктурные адаптеры auth/payment/storage не содержат правила доступности релизов.

**Server:** публичные страницы, metadata и документация; доступ к DB/storage; создание checkout; проверка webhook; вычисление прав; отдача private artifacts. `commerce` и `delivery` маркируются `server-only`. Публичные каталожные проекции исключают source contents, приватные object keys, purchase data и скрытые промпты с кодом.

**Client:** фильтры, panel настроек, iframe bridge, локальное избранное, просмотр разрешённого кода, генерация Example/ZIP/prompt, clipboard. Код Pro загружается только после действия авторизованного владельца. Не помещать его в общий bundle, Server Component props, HTML/RSC prefetch, public search index или source maps. Установка сессии не меняет публичную кешируемую страницу в носитель закрытых данных.

Для экспортируемых элементов применяются три явных профиля: `server-compatible` для статического JSX без hooks; `client-interactive` с `"use client"` в минимальном entry; `client-motion` для browser lifecycle и движения. Browser API не используется при import или серверном render. Статический смысловой контент присутствует в SSR HTML; эффект лишь улучшает уже видимый результат. В Next.js страницы и layouts по умолчанию серверные, а директива `use client` задаёт границу клиентского графа. [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

Интерактивные callbacks задаются внутри клиентского адаптера; функция не передаётся через Server/Client границу как JSON. Генератор знает профиль: статической секции выдаёт обычный Example, интерактивному элементу — клиентский Example с директивой. Импорты `next/link`, `next/image`, env и path aliases не допускаются в каноническом переносимом TSX; при необходимости предлагается отдельный пример host-adapter.

## 3. Версии и единый комплект

Различаются пять независимых версий:

1. `schemaVersion` — формат manifest/bundle.
2. `itemVersion` — исходники и поведение конкретного элемента.
3. `configSchemaVersion` — допустимые пользовательские настройки и defaults.
4. `exporterVersion` — правила генерации Example, prompt и ZIP.
5. `offerRevision` — конкретный коммерческий состав и правила продажи.

`itemId` стабилен, английский slug человекочитаем и может иметь redirect. Locale не меняет item identity или покупку. Любое изменение исходников, поставляемых docs, prompt templates или demo defaults выпускается новой `itemVersion`. Старые байты, схемы и templates не перезаписываются. Для security notice допускается отдельная изменяемая запись статуса с журналом; исходный архив остаётся неизменяемым, выдача опасной версии может быть запрещена.

Статусы: `draft -> review -> verified -> published -> deprecated`; дополнительно `revoked` запрещает новую выдачу. Публикация атомарно продвигает public release registry только после загрузки всех объектов и проверки digest. `latest` — изменяемый указатель, не версия в bookmark/export. Удаление версии из latest не удаляет историю или права на неё. Внутренние CI rebuild при тех же исходниках не могут незаметно заменить опубликованный artifact: новый bytes digest требует новой itemVersion либо устранения нарушения воспроизводимости до публикации.

CI из одного source tree создаёт public manifest projection, private/public base bundle, preview runtime и evidence report. Runtime содержит build digest manifest. При handshake panel сверяет `itemId + itemVersion + configSchemaVersion + sourceDigest`; при расхождении настройки/экспорт отключены до reload с явным сообщением. Канонический source tree включает переносимые локальные helpers, а demo host отвечает только за фон/размер контейнера/режим демонстрации.

### 3.1. Контракт bundle

Ниже валидный JSON примера структуры S004, **не опубликованный релиз и не фактический результат проверок**. 64 нуля — только placeholder digest. Кандидатный peer range не является заявлением о проверенной совместимости. В production schema запрещает нулевые digest и `verification.status != passed` для публикации.

```json
{
  "schemaVersion": "1.0.0",
  "itemId": "S004",
  "itemVersion": "1.0.0",
  "slug": "product-demo-hero",
  "kind": "section",
  "collectionId": "product",
  "access": "pro",
  "sourceDigest": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
  "configSchemaVersion": "1.0.0",
  "exporterVersion": "1.0.0",
  "publishedAt": null,
  "locales": ["ru", "en"],
  "entry": "src/ProductDemoHero.tsx",
  "exportName": "ProductDemoHero",
  "renderProfile": "client-interactive",
  "styles": "css-modules",
  "dependencies": {
    "peer": [{"name": "react", "range": ">=19.0.0 <20.0.0"}],
    "required": [],
    "optional": []
  },
  "targets": ["vite-react-ts", "next-app-router"],
  "files": [
    {"path": "src/ProductDemoHero.tsx", "kind": "source", "encoding": "utf8"},
    {"path": "src/ProductDemoHero.module.css", "kind": "source", "encoding": "utf8"},
    {"path": "src/internal/C001/PressButton.tsx", "kind": "source", "encoding": "utf8"},
    {"path": "src/internal/C001/PressButton.module.css", "kind": "source", "encoding": "utf8"},
    {"path": "src/internal/C004/MetricSwitcher.tsx", "kind": "source", "encoding": "utf8"},
    {"path": "src/internal/C004/MetricSwitcher.module.css", "kind": "source", "encoding": "utf8"},
    {"path": "config.schema.json", "kind": "schema", "encoding": "utf8"},
    {"path": "defaults/ru.json", "kind": "config", "encoding": "utf8"},
    {"path": "defaults/en.json", "kind": "config", "encoding": "utf8"},
    {"path": "templates/Example.tsx.tpl", "kind": "template", "encoding": "utf8"},
    {"path": "README.ru.md", "kind": "documentation", "encoding": "utf8"},
    {"path": "README.en.md", "kind": "documentation", "encoding": "utf8"},
    {"path": "prompts/preserve.ru.md", "kind": "prompt", "encoding": "utf8"},
    {"path": "prompts/preserve.en.md", "kind": "prompt", "encoding": "utf8"},
    {"path": "prompts/adapt.ru.md", "kind": "prompt", "encoding": "utf8"},
    {"path": "prompts/adapt.en.md", "kind": "prompt", "encoding": "utf8"},
    {"path": "LICENSE.txt", "kind": "license", "encoding": "utf8"},
    {"path": "THIRD_PARTY_NOTICES.txt", "kind": "license", "encoding": "utf8"}
  ],
  "assets": [],
  "helpers": [],
  "includedItems": [
    {"itemId": "C001", "itemVersion": "1.0.0", "entry": "src/internal/C001/PressButton.tsx"},
    {"itemId": "C004", "itemVersion": "1.0.0", "entry": "src/internal/C004/MetricSwitcher.tsx"}
  ],
  "verification": {
    "status": "planned",
    "testedAt": null,
    "reportId": null,
    "environments": []
  },
  "limitations": ["No verified compatibility report exists for this illustrative manifest."]
}
```

Production `files[]` дополнительно требует `byteLength`, `sha256` каждого файла, MIME для бинарных ресурсов и `licenseRef` ресурса. Размеры измеряются по конечным байтам. Manifest не хеширует сам себя; `base-bundle.index.json` содержит digest manifest и остальных файлов, а digest всего base bundle хранится в release registry. `verification.environments[]` включает точные версии React/React DOM, TypeScript, Node, package manager, Next/Vite и browser builds; lockfile digest; commit; команды; exit codes; ссылки на отчёты. Пустая матрица не допускается к публикации.

Для зависимости различаются `peer` целевого проекта, `required` runtime и `optional` действительно отключаемой возможности. Если import без пакета ломает сборку, пакет не optional. Указывается диапазон совместимости, точная проверенная версия, вес сжатого добавленного JS и license. Все 24 элемента v1 планируются без обязательного стороннего motion runtime: CSS, Web Animations API и React достаточны для текущего замысла. Если контентный прототип докажет необходимость библиотеки, нужен отдельный ADR и повторная проверка бюджета/лицензии/экспорта; зависимость не добавляется скрыто. Экспорт не устанавливает react повторно и не обновляет зависимости автоматически.

`config.schema.json` — JSON Schema с `additionalProperties: false`, численными/строковыми пределами, motion enum `off|subtle|expressive`, list limits и проверкой безопасных URL. Настройки содержат данные, без ReactNode, callback, HTML, CSS fragments и исполняемых выражений. `runtime_props` (например, children/onClick/onValueChange) и `studio_fields` visual editor различаются; каталог API не является автоматически схемой JSON. Реальные callbacks подключаются пользователем в Example после экспорта. Допустимые target URL публичной studio: `https`, относительный путь и anchor; `mailto`/`tel` только у разрешающих их полей. `http://localhost` допустим лишь в локальной интеграции/Example, не как настройка публичной studio. Сервер не скачивает переданные URL. Media props в кодовом API допускают последующую интеграцию собственных ресурсов в проекте, но studio v1 выбирает только bundled media IDs: без upload, remote-media URLs и пользовательского SVG.

## 4. Локальная настройка и детерминированный экспорт

Единственный поток: `validate(raw) -> normalize(config) -> resolvedConfig -> render preview / generate files / generate prompt`. В `resolvedConfig` применены defaults выбранной immutable версии. Переключение RU/EN интерфейса не перезаписывает уже введённый пользователем текст; отдельное действие «Загрузить текст примера» явно заменяет demo content. `config.locale` управляет штатными ARIA labels; это не locale аккаунта.

Пределы v1: resolved config до 16 KiB UTF-8; до 30 элементов в одном списке, до 2 000 символов в текстовом поле, до 2 048 в URL. Schema конкретного элемента может задавать меньшие пределы. Невалидное значение остаётся в поле с ошибкой, последнее валидное состояние продолжает работать; экспорт не создаётся из невалидного черновика.

Детерминизм означает одинаковые байты при одинаковых `baseBundleDigest + config + locale + target + mode + exporterVersion`. Ключи объектов сортируются рекурсивно, порядок массивов сохраняется; UTF-8 без BOM, LF, без timestamp пользователя и случайных ID; числа конечные, отсутствующие поля нормализуются до defaults, запрещены `undefined`, NaN и циклы. ZIP entries сортируются по POSIX-пути, имеют фиксированную допустимую ZIP дату, одинаковые permissions и версию compression implementation. В корне ZIP — только item-specific directory, без абсолютных путей, `..`, symlink и имени из пользовательского ввода.

Итоговый ZIP содержит `manifest.json`, `base-bundle.index.json`, `checksums.json`, `config.json`, `Example.tsx`, исходники, `README.ru.md`, `README.en.md`, `INTEGRATE.ru.md`, `INTEGRATE.en.md`, обе лицензии/notices и разрешённые ресурсы в `assets/`. `checksums.json` фиксирует выбранный target, exporterVersion, configDigest и digest каждого итогового файла, кроме самого `checksums.json`; generated files явно помечены. Оба `INTEGRATE.{locale}.md` содержат выбранный режим инструкции и пользовательский контекст, только если пользователь включил его в ZIP. Четыре prompt templates на item генерируют два режима на двух языках: 96 комбинаций для 24 элементов не являются 96 отдельными продаваемыми items и не требуют 96 вручную независимых промптов. Контекст никогда не добавляется автоматически в share link или analytics.

Генератор не делает string replacement внутри авторского кода. Example импортирует validated JSON и передаёт типизированные props; пользовательский текст не вставляется в TSX как необработанный фрагмент. Файлы копируются по полному списку из bundle; binary assets доступны только через ZIP. Предел item bundle: 200 файлов, 20 MiB суммарных распакованных данных, 5 MiB на файл. Возможный будущий multi-item архив имеет отдельные пределы 2 000 файлов/100 MiB; такой exporter не входит в v1. Общий сжатый base bundle одного item — до 5 MiB. Это launch limits, проверяемые на первых fixtures. Перед копированием показываются размер текста и количество файлов. При превышении 100 KiB текста интерфейс предлагает ZIP плюс короткий attachment prompt; молчаливого обрезания нет. Факт clipboard success определяется результатом Clipboard API; при отказе доступно выделение текста и скачивание.

### 4.1. Ресурсы и пути Next/Vite

Компоненты получают `assetBaseUrl` либо конкретные media URLs через props; размер/alt входят в данные. В ZIP ресурсы размещаются в `assets/`; manifest указывает `projectDestination: public/library/{itemId}/{itemVersion}/`, README явно объясняет копирование в `public` проекта без перезаписи других файлов. Именование использует ID/версию и digest basename. В portable source — обычный `img` с размерами и корректным loading; optional пример Next/Image описывается отдельно, без скрытого framework import. Next/Image имеет отдельные возможности оптимизации. [Next.js Image Optimization](https://nextjs.org/docs/app/getting-started/images).

В Vite Example передаёт `${import.meta.env.BASE_URL}library/{itemId}/{itemVersion}`. В Next Example передаёт явно заданный `publicBasePath` + `/library/{itemId}/{itemVersion}`; default `publicBasePath = ""`. README просит сверить `basePath` deployment; root-relative `/library/...` не объявляется универсальным при подпути. В Vite public files копируются без переименования; `base` deployment требует корректной базы URL. [Vite Static Asset Handling](https://vite.dev/guide/assets).

Font наследуется; demo font не копируется скрыто. Для платного/ограниченного media в preview допускается отдельный demo asset, но он не должен влиять на обещание конечной композиции; ZIP показывает, что именно поставляется и что требуется заменить. Предпочтение v1 — все нужные media разрешены для поставки и включены локально, без зависимости от hotlink CDN сервиса. SVG author assets проверяются до публикации; пользовательские SVG не принимаются.

### 4.2. Несколько элементов в одном проекте

Каждый элемент самодостаточен: helpers находятся внутри `src/{itemId}/internal/`; экспорт не ссылается на `@/lib/utils` или внутренний npm package продукта. Версия helper включена в manifest. Разные элементы могут иметь копии одинакового небольшого helper: это сознательная плата за переносимость, а не обязательная общая runtime-зависимость.

В v1 экспортируется один item за раз; покупка набора или коммерческого bundle даёт права на соответствующие индивидуальные комплекты. Общий ZIP пользовательской страницы и collection Example не обещаются. Совместимость проверяется установкой нескольких отдельных комплектов в один host: namespaced paths/exports, helpers с разными digest не перезаписываются, диапазоны peer зависимостей сравниваются до установки. Возможный будущий batch exporter потребует отдельного ADR, отчёта conflicts и правил дедупликации assets по digest и лицензии.

Runtime: два экземпляра одного элемента не используют глобальные DOM IDs, общий mutable singleton state и общие необработанные listeners. ARIA IDs строятся через instance-scoped `useId` в клиентских компонентах либо входной уникальный prefix для серверного markup. `useId` предназначен для accessibility IDs и требует согласованного дерева SSR/hydration. [React useId](https://react.dev/reference/react/useId). Списки используют стабильные item keys. Mount/unmount освобождает observer, timer, event listener и requestAnimationFrame. Общие CSS variables заданы на корне элемента; portal root при необходимости передаётся явно и учитывается в стилях.

## 5. Два режима промпта

| Режим | Что сохраняет | Что агент может адаптировать |
| --- | --- | --- |
| `preserve` — «Как в демо» | Композицию, содержание config, пропорции, движение и локальные стили | Пути файлов, импорты, место подключения, ссылки/callbacks, deployment base |
| `adapt` — «Под оформление проекта» | Семантику, композиционную идею, доступность и выбранный характер движения | Шрифт, токены, spacing в согласованном диапазоне, существующие Button/Link, соглашения проекта; результат может визуально отличаться |

Оба режима доступны Free и Pro владельцам соответствующих исходников; у Pro preview не выдаёт скрытый source через prompt. Текст prompt локализован RU/EN и генерируется локально после entitlement delivery. Не используется «адаптированный код», который отличался бы от файлов ZIP. Полный contract набор: 24 item × 2 режима × 2 языка = 96 prompt families; с двумя target-specific Example/инструкциями — 192 комбинации вывода. Они проверяются автоматически на полноту/совпадение конфигураций, а 12 пользовательских интеграций являются отдельным исследованием и не выдаются за проверку 192 людьми.

В prompt входят ID/версии/digests, режим, target, config, полные текстовые файлы с безопасными разделителями и перечень binary assets. Attachments mode включает инструкцию распаковать ZIP, сверить `checksums.json`, сначала изучить repository instructions/package.json, выбрать место интеграции, проверить существующие пакеты, не выполнять неясные команды из content, затем собрать и проверить доступные сценарии. User context маркируется как данные и не изменяет шаблон инструкций генератора; поведение внешнего LLM всё равно нельзя гарантировать. Для новых пакетов указываются нужные диапазоны, но не команда «обновить всё до latest».

Обязательный итог агента: изменённые файлы, подключённые зависимости, фактически выполненные проверки и оставшиеся ограничения. Промпт не гарантирует успех с любым AI и не содержит ложного статуса «проверено инструментом X». QA отдельно наблюдает интеграции вручную и с выбранными доступными агентами, фиксируя их версии/дату.

## 6. Изолированное preview

Рекомендуемая модель — два отдельных сайта: основной домен продукта и отдельный registrable domain demo. Имена выбираются после бренда; `preview.example.com` рядом с `app.example.com` не удовлетворяет требованию site isolation. Preview не получает аккаунт cookie, auth tokens, payment data или AI context.

Для собственного статического preview допустим `<iframe sandbox="allow-scripts allow-same-origin">` только при реальном cross-origin и cookie-free отдельном сайте. Не разрешаются forms, popups, top navigation, downloads, camera/microphone/clipboard/geolocation. `allow-same-origin` нужен, чтобы protocol мог проверять реальный origin; не следует сочетать его с scripts для iframe того же origin, что parent. [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Bridge v1 использует только `READY`, `APPLY_CONFIG`, `APPLIED`, `RESIZE`, `REPLAY`, `PAUSE`, `ERROR`. Envelope: `protocolVersion`, `channelId`, `requestId`, `type`, `itemId`, `itemVersion`, `payload`. `channelId` — случайный nonce на mount, не право доступа. Сообщения валидируются schema, размером и частотой. Parent проверяет точный `event.origin` и `event.source === iframe.contentWindow`; child — точный origin основного сайта и `event.source === parent`. Не использовать wildcard `targetOrigin`, `eval`, HTML из payload или любые URL-команды из сообщений. [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

После READY parent передаёт только validated config и display controls. После APPLIED совпавший requestId отмечает актуальность демо; при timeout 5 секунд показываются retry и исходный poster. Initial ready timeout — 10 секунд на доступной сети; это UI timeout, не performance SLA. При переключении release создаётся новый iframe/channel. RESIZE ограничен 120–2 400 px и не может сдвинуть всю страницу вне управляемого контейнера. Декоративные ссылки child в demo не переходят к оплате/почте; host показывает demo action, экспорт сохраняет настоящие props для подключения.

Одновременно работает одно интерактивное demo на item page. В каталоге — posters и по требованию один preview. `document.hidden`, offscreen и родительский PAUSE останавливают декоративные loops; substantive controls остаются работоспособны. Reduced motion системного уровня имеет приоритет над `expressive`. У экспортируемых S012/E003 и других продолжительных декоративных циклов Pause работает также вне studio: `includePauseControl=true` по умолчанию, нативная доступная кнопка в штатном экспорте; `paused/onPausedChange` — optional controlled code API. Скрыть кнопку можно только при отсутствии loop или при подключённом доступном host control, что явно описывается и проверяется в Example. Сбой iframe не отключает каталог, документацию или доступный экспорт.

Public Pro demo JS загружается посетителю и может быть исследован. Продажей защищаются удобный исходный комплект, документы/промпт с кодом и права использования; абсолютная недоступность восстановления JS не обещается. Public preview builds не содержат приватных source maps и storage paths.

## 7. Ссылки состояния и локальное хранение

Публичная ссылка: `/{locale}/library/{slug}?version={itemVersion}#config={base64url}`. Fragment содержит UTF-8 canonical JSON envelope `{schemaVersion,itemId,itemVersion,configSchemaVersion,shareMode,configProjection}`. По умолчанию `shareMode=appearance`: только allowlisted оформление/движение; пользовательские тексты, CTA links и URLs исключены. Явная галка «Включить текст и ссылки / Include text and links» с public notice разрешает `shareMode=content-and-appearance` и соответствующие дополнительные поля. Account/order IDs, cookies, email, secrets и project context никогда не включаются. Версия в URL обязательна; `latest` не сохраняется в share. Payload максимум 16 KiB после decoding, весь URL максимум 6 KiB для функции «Скопировать ссылку». Более длинное состояние скачивается `config.json`; сервис не создаёт анонимное серверное хранилище. Fragment не попадает в обычный HTTP request, но остаётся доступным обладателю ссылки и браузерным инструментам, поэтому перед share показывается короткое объяснение видимости данных.

При open decode/validate до передачи в iframe. Projection применяется к immutable defaults выбранной версии/локали: поля, исключённые из share, остаются демо-примерами этой версии. Roundtrip equality относится к явно выбранной projection; ZIP/prompt всегда используют полную текущую validated config, поэтому share без текста закономерно не воспроизводит пользовательский заголовок. Невалидный fragment не исполняется, отображается ошибка со сбросом. Неизвестная schema — понятная incompatibility, без догадок. Старые ссылки используют старую immutable схему/defaults/preview. Deprecated version можно открыть и экспортировать при наличии прав. Revoked version показывает причину и явно предлагает безопасный replacement; автоматическая незаметная замена запрещена. История public statuses проверяется отдельным запросом, поэтому controlled delivery не выдаёт отозванный source через старый URL; ранее скачанные/закешированные публичные Free bytes отозвать невозможно.

Share не передаёт платную лицензию: настройки Pro доступны как preview, скачивание source требует собственных прав. Избранное хранит `itemId + preferredVersion`, не source; название storage key содержит schema version. После logout Pro source удаляется из application memory; сервис не обещает удалить ранее скачанный код с устройства. Service worker не кеширует закрытые артефакты. При заблокированном localStorage избранное временно живёт в памяти с понятным статусом. Для отозванного Free bundle отключают новую выдачу на контролируемом origin/CDN и очищают управляемые caches, но уже публично скачанный или закешированный immutable bundle невозможно отозвать у пользователя; это не трактуется как гарантированное удаление.

## 8. Модель данных и права

Контентное ядро — Git/release registry, транзакционные сущности — SQL. Публичный индекс можно перестроить из утверждённого Git release; покупки и grants нельзя восстанавливать только из текущего каталога.

| Сущность | Ключи и важные поля | Инвариант |
| --- | --- | --- |
| Item | `itemId`, kind, collectionId, canonicalSlug, access class | Стабильный ID; 24 самостоятельных элемента: 12 секций, 8 компонентов, 4 эффекта |
| ItemRelease | `(itemId,itemVersion)`, configSchemaVersion, sourceDigest, bundleDigest, publishedAt, status | Неизменяемые source/docs; publish time не задним числом |
| LocalizedContent | release + locale, title, description, tags, docsDigest | Для publish имеются RU и EN; одинаковая identity |
| VerificationReport | reportId, release, fixtures/lockfiles, browsers, results, reviewer, timestamp | Только прошедшая версия получает compatibility badge |
| PackRevision | `(packId,revision)`, ordered itemIds, included files | Ровно 6 уникальных Pro IDs в каждом стартовом pack |
| OfferRevision | offerId, revision, sku, packRevisions, itemIds snapshot, update policy, license/terms refs | Неизменяемая проданная конфигурация; BUNDLE-LAUNCH — union 18 Pro, Free не считаются новыми товарами |
| User | userId, verified auth identity, locale | Email не используется как единственный ключ права без проверенной сессии |
| Order | orderId, userId, state, providerReference, currency, monetary totals, termsRevision | Денежные суммы в integer minor units с currency metadata |
| OrderLine | lineId, orderId, offerRevisionId, quantity, price snapshot | Проданный SKU сохраняется независимо от актуальных цен |
| PaymentEvent | `(provider,eventId)`, payloadDigest, receivedAt, state | Уникальность обеспечивает идемпотентность |
| AccessGrant | grantId, userId, orderLineId, itemIds snapshot, paidAt, updatesStart/End, status | Refund одного заказа не отменяет независимую покупку того же элемента |
| SecurityRemediation | revoked/supported release line -> safe release, reason, severity, source scope | Даёт минимальное безопасное исправление владельцу, даже вне functional window |
| DeliveryAudit | requestId, userId, release, grantId/reason, result, timestamp | Без source/config/prompt body и bearer secrets |
| AuditEvent | actor, action, entity, previous/next references, timestamp | Изменения offer/release/grant объяснимы |

SKU стартовой рекомендации: `FREE-STARTER`, `PACK-PRODUCT`, `PACK-EDITORIAL`, `PACK-PLAYFUL`, `BUNDLE-LAUNCH`. Free: S001/S002/S003/C001/C002/E001; Product: S004/S005/S006/C003/C004/E002; Editorial: S007/S008/S009/C005/C006/E003; Playful: S010/S011/S012/C007/C008/E004. Каждый paid pack содержит 3 секции + 2 компонента + 1 эффект. Обязательная зависимость от платного элемента другого набора запрещена. Free-зависимости и helpers разрешены при явном включении локальных файлов; вложенность не выдаёт дополнительный платный товар. Master-каталог ведётся в [catalog.json](catalog.json); engineering валидирует его суммы и отсутствие двойного счёта.

### 8.1. Вычисление покрытия релизов

Покупка разовая; один individual contributor, собственные и клиентские конечные проекты в рамках оформленной лицензии. Право на использование выданной версии отделяется от функции повторной загрузки. Нет account sharing, автопродления или обещания получить все новые коллекции.

При подтверждённом `paid` создаётся grant на immutable itemIds snapshot оффера. Окно функциональных обновлений — 12 календарных месяцев, UTC, от серверного подтверждённого `paidAt`; конец исключительный. Для даты 29 февраля/конца месяца применять заранее утверждённое календарное clamp правило и одинаковую функцию checkout/entitlement/account UI. Grant даёт исходные релизы, существовавшие при покупке, и функциональные релизы этих itemIds, опубликованные до `updatesEnd`. Истечение окна не удаляет покрытые релизы из списка повторной загрузки, пока сервис работает.

Manual renewal — отдельный явно оплаченный SKU с новым подтверждённым событием, а не молчаливое продление. Рекомендуемая логика: если renewal приобретён до конца активного окна, продлить от `updatesEnd`; после истечения — открыть новое 12-месячное окно от нового `paidAt` и включить текущие версии тех же купленных IDs. Цена, SKU и включение промежуточных выпущенных версий показываются до оплаты; без утверждённого оффера endpoint renewal не активируется.

Release security patch поддерживаемой линии доступен владельцу соответствующего itemId вне update window. Рабочее предложение: поддержка минимум 24 месяца от первого платного выпуска ветки, предупреждение EOL за 90 дней; `supportStartsAt/supportEndsAt` явно отражены в registry и оффере до продажи. Чтобы не выдавать все функции более новой Pro коллекции под видом безопасности, `SecurityRemediation` явно ссылается на допустимый safe release или специальный minimal patch bundle. Если старая линия EOL, до её отзыва назначается безопасная замена/миграция и зафиксированное дополнительное право на неё. Новые itemIds не включаются автоматически даже при совпадении collection name.

Проверка для private release: сначала `revoked?` -> блокировать; затем `free?` -> разрешить; иначе есть ли `active grant` на ID с release baseline/functional coverage либо разрешённой security remediation. Права объединяются по всем active grants; не использовать один `hasPro` или только `latestPurchase`. `revoked` private source не выдаётся даже владельцу; вместо него объясняется replacement. При refund/chargeback отключается affected grant/order line; другие grants продолжают действовать. Уже скопированный код невозможно технически отозвать из репозитория; условия использования после возврата описываются в legal terms отдельно.

### 8.2. Надёжность оплаты

`created -> checkout_pending -> paid | failed | canceled`; `paid -> partially_refunded | refunded | disputed`. Только проверенный provider webhook либо сверка provider API меняет paid state. Return URL из checkout означает «проверяем оплату», а не доказательство. Checkout подтверждает актуальную OfferRevision; при изменении цены/состава старая страница получает `409 OFFER_CHANGED`, пользователь видит новый состав и сумму до продолжения.

Webhook signature проверяется по raw body; event dedupe и переход order/grant фиксируются одной DB transaction. Повторы и поздние события не удваивают grant. Обработка out-of-order использует provider state/version или reconciliation, а не «последнее пришедшее событие всегда истина». Лёгкая durable inbox в SQL позволяет подтвердить получение после сохранения и повторять обработку. Для v1 отдельный message broker не нужен; требуются scheduler/reconciliation job и наблюдаемый backlog.

## 9. HTTP API v1

Контракты фиксируются OpenAPI/JSON Schema и проверяются в CI. API не требует locale-префикса; где нужен человекочитаемый текст, используется явный `locale=ru|en`, который входит в cache key. Backend возвращает стабильный error code, интерфейс локализует сообщение. Route handlers реализуются стандартными Request/Response; Next.js поддерживает HTTP methods в `route.ts`. [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).

| Endpoint | Доступ и результат | Кеширование/ошибки |
| --- | --- | --- |
| `GET /api/v1/catalog?locale=ru` | Public metadata/search/offer summaries, без source | `public,max-age=60,s-maxage=300`; ETag catalog digest; 400 locale |
| `GET /api/v1/items/{id}/releases/{version}?locale=ru` | Public manifest projection, status, limitations, verification | `public,max-age=60,s-maxage=300`; 404 неизвестный; revoked status виден |
| `GET /assets/free/{id}/{version}/{bundleDigest}.zip` | Public Free immutable base bundle | `public,max-age=31536000,immutable`; digest проверяется клиентом |
| `GET /api/v1/release-status/{id}/{version}` | Public latest status/replacement, без source | `public,max-age=0,s-maxage=30`; purge при emergency; private delivery всё равно проверяет DB/registry |
| `GET /api/v1/me` | Проверенная сессия: profile+locale | `private,no-store`; 401 |
| `GET /api/v1/me/entitlements` | Список grants и доступных версий, без private storage keys | `private,no-store`; 401; состояние loading/error не считается Free |
| `GET /api/v1/items/{id}/releases/{version}/bundle` | Free может redirect на public URL; Pro: session + release coverage, streaming base bundle | Для Pro всегда `private,no-store`; 401/403/410/429/503; запрет CDN/SW cache |
| `GET /api/v1/me/orders/{orderId}` | Только владелец; статус/сумма/offer snapshot | `private,no-store`; 401; 404 для чужого/несуществующего |
| `POST /api/v1/me/data-exports` | Свежая reauthentication+CSRF; создание экспорта своих учётных данных, без чужих данных и credentials | `private,no-store`; 202 с request ID; 401/409/429; выдача результата также только владельцу |
| `DELETE /api/v1/me` | Свежая reauthentication+CSRF; подтверждённый запрос удаления/псевдонимизации с объяснением обязательного ledger и backup retention | `private,no-store`; 202; revoke sessions, журнал tombstone, статус выполнения по защищённому каналу |
| `POST /api/v1/checkout-quotes` | Session+CSRF; snapshot цены/налогов/кредитов/состава, срок quote; duplicate ownership | `private,no-store`; 400/401/409/429/503; upgrade quote активируется только после утверждения правил |
| `POST /api/v1/checkout-sessions` | Session+CSRF; `quoteId`, `locale`, `Idempotency-Key`; quote привязан к user/offerRevision и серверной сумме, срок проверяется | `private,no-store`; 400/401/409/429/503 |
| `POST /api/v1/payment/webhooks/{provider}` | Без user session; signature+raw body+event dedupe | Без кеша; 2xx после durable receipt; 4xx invalid signature, 5xx transient persistence |
| `POST /api/v1/auth/{action}` | Auth adapter: login/request callback/logout; правила провайдера | `private,no-store`; rate limit; CSRF logout и других unsafe actions |
| `GET /health/live`, `GET /health/ready` | Без sensitive diagnostics; readiness DB/storage только внутренним мониторингом | `no-store`; 503 при неготовности |

Для v1 Pro выдаётся authenticated stream, не публичный permanent signed URL. HTTP range/etag для private bundle допускается только с повторной проверкой прав и без общего кеша; проще v1 вернуть полный небольшой bundle. Размер base bundle максимум 5 MiB; больше — отдельное обоснование и ZIP workflow. Повторный private запрос после истечения сессии требует login; panel сохраняет только локальный config и повторяет явно. Provider/storage недоступен — fail closed для private artifacts, но публичные docs/demo продолжают работать.

Истёкший quote или quote другого пользователя не создаёт checkout. Quotes фиксируют price/currency/tax/credit/composition и не доверяют этим значениям из клиента. Повтор Idempotency-Key с другим quote/payload отклоняется как конфликт. Free immutable ZIP остаётся публичным артефактом: отзыв блокирует новую управляемую выдачу и запускает доступный CDN purge, но не удаляет уже скачанные байты и browser caches.

Error envelope:

```json
{
  "error": {
    "code": "RELEASE_NOT_COVERED",
    "requestId": "req_example",
    "retryable": false,
    "details": {"itemId": "S004", "itemVersion": "2.0.0"}
  }
}
```

Коды: `INVALID_INPUT` 400, `UNAUTHENTICATED` 401, `RELEASE_NOT_COVERED` 403, `NOT_FOUND` 404, `OFFER_CHANGED` 409, `RELEASE_REVOKED` 410, `PAYLOAD_TOO_LARGE` 413, `RATE_LIMITED` 429 с Retry-After, `TEMPORARILY_UNAVAILABLE` 503. Internal error 500 содержит requestId, без stack/PII. Ответ 403 показывает доступные ранее покрытые версии и renewal только после отдельного `/entitlements`, не раскрывает информацию чужого заказа. Не передавать пользовательские тексты в URL API, error payload или query logs.

Все unsafe cookie-auth requests используют CSRF protection и проверку Origin; cookies `__Host-*`, Secure, HttpOnly, SameSite=Lax. CORS не разрешает credentials preview origin. Все private fetch/runtime caches явно `no-store`, независимо от framework defaults. Проверка сессии нужна на endpoint, одного скрытого пункта меню недостаточно. Подробные abuse/security требования согласуются с приложением по ИБ.

## 10. RU/EN, SEO и контентные контракты

Пути UI: `/ru`, `/en`, `/ru/library`, `/en/library`, `/[locale]/collections/{slug}`, `/[locale]/docs/...`, `/[locale]/pricing`, `/[locale]/account`. Английские slugs одинаковы в обеих локалях. `/` показывает лёгкий language chooser с RU/EN; сохранённый выбор выделяет основное действие, но не вызывает автоматический redirect. Нет redirect по геолокации или Accept-Language; явный locale URL всегда имеет приоритет. Locale не определяет страну, доступность оплаты, валюту или применимое право.

Для каждой публичной страницы — собственный canonical и reciprocal `hreflang` RU/EN; `x-default` ведёт на языковой entry. Search/filter URLs с произвольными сочетаниями не создают бесконечный индекс; базовые item/collection/docs страницы индексируемы. Account, checkout, share configurations и preview domain — noindex. Старый slug редиректится на актуальный, сохраняя version и fragment браузерным переходом. Поддержка локализованных подпутей соответствует модели Next.js. [Internationalization](https://nextjs.org/docs/app/guides/internationalization).

Один словарь интерфейса на locale с проверкой одинакового набора ключей и placeholders. Названия props/API/code identifiers на английском; тексты интерфейса, docs, prompt, checkout explanation и ошибки RU/EN. README и prompt обеих локалей входят в одну item release. Release блокируется при отсутствующем переводе обязательной страницы/инструкции, рассинхроне dependency commands или строковых placeholders. Приватный email-flow локализуется по явному выбору; email auth provider выбирается после продавца/географии доставки, а не закрепляется сейчас.

UI проверяется на длинном русском тексте, разной длине кнопок/цен, переносах и экранных увеличениях. `html lang` и accessible names соответствуют текущей локали. Даты/денежные суммы форматируются Intl; момент update cutoff показывается с timezone и точной датой, а расчёт остаётся UTC. Число 24 в локалях берётся из одной модели, не из разных вручную написанных строк.

## 11. Качество компонентов, доступность и матрица

Цель продукта — WCAG 2.2 AA для интерфейса сервиса и штатных поставляемых пресетов; индивидуальная пользовательская палитра требует собственной проверки. Одного автоматического аудита недостаточно для заявления соответствия. Основа требований — семантика, клавиатура, reflow, focus, contrast, target sizes и контроль движения. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Интерактивные tabs поддерживают roving tabindex, стрелки по ориентации, корректные tab/tabpanel отношения, фокус и явный режим активации. Accordion использует heading/button, `aria-expanded`, `aria-controls`, Enter/Space и обычный Tab. Не использовать ARIA там, где достаточно native HTML. Подробности поведения сверяются с [WAI Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) и [WAI Accordion Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).

Матрица фиксируется перед первым сквозным релизом; текущие версии в этом ТЗ не означают протестированных. Две fixture среды: стабильные на дату реализации Next.js App Router и Vite React TS с совместимым React/Node LTS/TypeScript, точными версиями и lockfile. Каждый опубликованный bundle проверяется в обеих. Дополнительный fixture использует существующий Tailwind/reset/global headings/buttons/images для проверки сосуществования, но выдаваемый code остаётся CSS Modules. Поддержка Pages Router, React 18, иных major versions, static export и специальных runtimes не обещается без отдельного report.

| Проверка | Автоматически | Вручную |
| --- | --- | --- |
| Среды | typecheck, lint, production build Next/Vite, runnable Example из распакованного ZIP | Минимальный README проход независимым reviewer |
| SSR/hydration | Импорт без window; server render; fail на hydration warnings; контент до JS | Настоящий Next deployment, поведение при JS failure |
| Browser engines | Playwright Chromium/Firefox/WebKit; mobile viewports | Актуальные Chrome/Firefox/Safari, реальный Safari iOS и Chrome Android; версии в report |
| Размеры | 320/360/768/1024/1440 px, long RU, doubled text, no overflow | 200% zoom, 400% reflow для UI, touch и portrait/landscape |
| Доступность | axe: 0 critical/serious; contrast штатных пресетов; корректные labels | Только клавиатура, VoiceOver+Safari, NVDA+Chrome; focus restore при modal/экспорт |
| Движение | Off/soft/expressive × reduce/no-preference, visible content, pause on hidden | Комфорт восприятия, отсутствие hover-only действий, pause controls |
| Инкапсуляция | Два экземпляра, styles leakage, fixture global CSS, mount/unmount | Сочетание коллекции на единой странице |
| Экспорт | Digests, config roundtrip, deterministic ZIP, install commands, missing files | Перенос в существующий внешний проект |
| Права | Anonymous/owner/non-owner/expired/refunded/overlap/security remediation | Задержка оплаты, восстановление доступа, сообщение пользователю |

Playwright позволяет запускать несколько engines/projects и mobile emulation, однако эмуляция viewport и WebKit не заменяют фактический Safari/iOS. Поэтому реальные устройства обязательны в release checklist, а не заявляются результатом одного headless job. [Playwright Browsers](https://playwright.dev/docs/browsers).

Тестировать смысловой сценарий, а не каждую строку implementation. Для элементов достаточно общих contract tests, interaction tests специфических контролов, export integration и ручного visual review. Скриншоты фиксируют fonts, viewport, data, reduced motion либо time at stable state. Допуск image diff назначается по fixture; изменения нельзя «чинить» массовым обновлением baseline без review. Смысловая и accessibility проверка не заменяется pixel diff.

## 12. Производительность

Бюджеты — предлагаемые launch gates, которые проверяются на сквозном hero и после него корректируются обоснованным решением, не молча:

| Объект | Бюджет и метод |
| --- | --- |
| Каталог | До 200 KiB gzip initial JS суммарно для маршрута, включая React/framework и клиентский поиск, без отдельно лениво загружаемого demo; отчёт build artifacts |
| Экспортер | Отдельный lazy chunk; не входит в initial catalog payload |
| Обычная CSS секция | До 15 KiB gzip incremental JS сверх React/runtime; статический JSX может требовать меньше |
| Дополнительная motion library | Вес показывается отдельно и в суммарном delta; exceeding budget требует item-specific rationale |
| Demo media | До 500 KiB total стандартных изображений выбранного item viewport; responsive sources и размеры |
| Платный base bundle | До 5 MiB download; ZIP assembling в worker если main-thread stalls >100 ms на контрольном устройстве |
| Настройки | Смена простого параметра до visual applied p95 ≤150 ms после загрузки runtime на контрольном устройстве; измеряются 30 операций, фиксируется машина |
| Lab page | LCP ≤2,5 s, CLS ≤0,1, TBT ≤200 ms в опубликованном mobile throttling profile, медиана 5 прогонов cold cache |

Lab TBT — диагностическая метрика, не замена реального INP. Полевые цели: LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 на 75-м перцентиле отдельно mobile/desktop при достаточном объёме данных. Пороговые значения и различие полевых метрик описаны в [Core Web Vitals](https://web.dev/articles/vitals). До достаточной выборки публичная карточка показывает только lab conditions, не статус полевого соответствия.

Сложный эффект не может замедлять каталог, блокировать scroll, перехватывать pointer поверх контента или создавать постоянный layout thrash. Анимации по возможности transform/opacity; expensive blur/filter/scroll listeners требуют profiling. Не измерять iframe-only effect как performance всего export: отдельный report запускает реальный компонент внутри fixture страницы.

## 13. CI и выпуск

Каждый PR контента проходит воспроизводимый pipeline. Production secrets недоступны непроверенному PR; deployment происходит из trusted reviewed commit. CI использует lockfile/frozen install, фиксированный runtime, hash-pinned workflow actions и минимальные permissions. Установка не меняет lockfile. [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/), [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use).

| Gate | Что блокирует публикацию | Артефакт доказательства |
| --- | --- | --- |
| Schema/catalog | Неверный manifest/config, дубли ID, несоответствие 6 Free/18 Pro/3×6 pack membership, отсутствующий перевод | validation report |
| Source/deps | Необъявленные imports, приватный path alias, лишняя runtime dependency, секреты, недопустимые license/media | dependency/provenance inventory |
| Security | Известная эксплуатируемая/критичная уязвимость пути исполнения, утечка закрытого source, нарушенная auth/isolation | security report с disposition |
| Package | Не совпадают digest, missing files/assets, traversal path, недетерминированный экспорт | bundle index + reproducibility report |
| Fixtures | Type/build/SSR/hydration/interaction fail в любой заявленной среде | logs + lockfile digest |
| Accessibility/visual | Critical/serious auto findings, keyboard failure, overflow, unreviewed visual regression | accessibility report + screenshots + reviewer |
| Performance | Превышенный согласованный item/page budget без утверждённого исключения | compressed sizes + lab results |
| Commercial | Grant/renewal/refund/overlap/idempotency/cache leak failures | API/payment simulation report |
| Publish | Не загружен preview/base bundle/docs/status; отсутствует manual QA | signed/checksummed release record |

Dependency audit используется как один источник, а не доказательство отсутствия уязвимостей. `npm audit` проверяет известные advisory из registry; поставляемый код и возможности эксплуатации требуют отдельного анализа. [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/). Автоматический `audit fix --force` не включается в publish pipeline.

CI дополнительно сохраняет SBOM/runtime dependency inventory, licenses, asset origin, source commit, package manager version и build provenance. Исключение security finding требует owner, rationale, scope, срока и компенсирующей меры; активная критичная эксплуатируемая проблема auth/payment/source confidentiality не выпускается по convenience waiver. Подробные severity/incident правила задаются приложением по ИБ.

Pipeline stages: validate -> trusted build -> package -> fixture tests -> reports/manual review -> upload immutable artifacts -> staging smoke -> advance release registry -> production smoke. Нельзя публиковать `latest` перед готовностью preview и docs обеих локалей. Коммерческая активация — отдельный feature flag после оплаты/refund rehearsals, а не побочный эффект публикации 24 карточек.

## 14. Наблюдаемость, backup и откат

Продуктовые события фиксируют itemId/version/locale/target/action/result. Не отправляются пользовательские config texts, project context, contents clipboard/source/ZIP, email в analytics, query fragments и payment card data. Технические логи содержат requestId, endpoint category, latency, status/error code, pseudonymous userId при необходимости; body redaction и allowlist полей обязательны. Session tokens и webhook signature/raw payload не пишутся в обычные логи. Evidence logs доступа отделены от маркетинговой аналитики.

Начальные эксплуатационные цели: 99,5% доступности public catalog и private delivery за месяц, исключая плановые окна только если они заранее отражены в политике; цели не становятся договорным SLA без отдельного решения. Payment-provider outage учитывается как ухудшение пользовательского сценария, а не исчезает из продуктовых отчётов. Alert: рост private delivery 5xx >2% за 10 min при ≥20 запросах; webhook oldest unprocessed >5 min; paid-without-grant >2 min; synthetic source leak; missing preview READY; backup failure. Для малого трафика synthetic checks важнее нестабильного процентного порога.

DB: ежедневный encrypted backup + continuous WAL/PITR на коммерческом этапе; предлагаемые RPO ≤1 h, RTO ≤8 h для учётных данных, с подтверждением restore drill. Реплика и object versioning не считаются независимым backup. Object bundles и release registry копируются независимо от production credentials; Git remote сохраняется отдельно. Политика backups — 35 дней оперативного восстановления, долгосрочные order/financial records по legal retention, не произвольное вечное хранение всех PII. После restore до открытия сервиса повторно применяются deletion tombstones, revoke registry и payment reconciliation. Поддержка PITR и restore зависят от выбранного хостинга; подходы документированы в [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html).

До приёма денег провести восстановление в isolated staging: DB, offers/grants и выборочное скачивание старой версии; сверить provider events после backup, повторно обработать inbox без дубликатов. В первые три месяца — monthly restore drill, затем не реже раза в квартал и после существенного изменения инфраструктуры. Backup без успешной restore проверки не закрывает acceptance.

Deploy: staging/prod разделены, платёжные test/live keys раздельны. Миграции expand/contract; предыдущий app release работает с новой additive schema. Откат приложения продвигает предыдущий verified deployment, но не «откатывает назад» оплату, grants и поступившие события. Откат каталога возвращает pointer, сохраняя immutable releases и историю. Аварийный отзыв версии немедленно блокирует private delivery, purge status caches и публикует remediation; продублированные private sources в public CDN считаются инцидентом, purge не доказывает удаления скачанных копий.

## 15. Приёмка с трассируемыми ID

Следующие требования — обязательный набор evidence будущей реализации; на дату ТЗ ни одно не помечается выполненным. В issue tracker ID сохраняются без переименования. Общие QA gates применяются ко всем 24 IDs, а статус каждого item отражается в release matrix.

| ID | Проверяемый результат | Метод/evidence |
| --- | --- | --- |
| ENG-01 | Preview, code viewer, ZIP и prompt используют одинаковые source/config версии | Одинаковые digests, config roundtrip, fixture screenshots |
| ENG-02 | Экспорт самодостаточен в Next App Router и Vite | Fresh fixture + production build из распакованного ZIP |
| ENG-03 | Canonical CSS Modules не меняет styles вне корня | Sentinel page + global CSS/Tailwind fixture |
| ENG-04 | Повторный экспорт identical inputs даёт byte-identical ZIP | Два независимых build runs, SHA-256 |
| ENG-05 | Client boundary корректна, source не обращается к window при SSR/import | Next SSR + console/hydration assertions |
| ENG-06 | Assets работают с root и configured deployment subpath | Next basePath и Vite base fixture, zero missing resources |
| ENG-07 | Pro source не доступен public HTML/RSC/JSON/maps/CDN | Anonymous crawls, cache cross-user test, security review |
| ENG-08 | Delivery авторизует release на каждом запросе | Owner/non-owner/refund/expiry matrix |
| ENG-09 | Frozen offer/item snapshot и 12-month coverage не зависят от latest каталога | Boundary clock tests + offer revision mutation scenario |
| ENG-10 | Overlap grants union сохраняет доступ после одного refund | Pack + Bundle overlapping purchase scenario |
| ENG-11 | Security remediation доступна вне functional window; revoked source закрыт | EOL mapping + 410 + safe release delivery |
| ENG-12 | Старые shared links сохраняют точную версию, не передают entitlement | Link 1.0 после 1.1 publish; anonymous Pro share |
| ENG-13 | Bridge принимает только correct origin/source/schema/channel | Cross-window forged messages, replay, oversized payload |
| ENG-14 | RU/EN completeness без изменения user draft при переключении | Dictionary/schema checks + locale E2E |
| ENG-15 | Повтор/перестановка payment events не удваивает права | Recorded test fixtures, SQL invariants |
| ENG-16 | Несколько отдельно экспортированных items не перезаписывают helpers/assets и не скрывают deps conflicts | Multi-item import fixture, conflicting dependency case |
| ENG-17 | Prompt preserve/adapt отражают один config, полный source/attachments | Snapshot contracts + observed integrations |
| ENG-18 | Exported Pause контролирует циклы без toolbar сервиса, default control доступен | Отдельные S012/E003 fixtures из ZIP, клавиатура/screen reader и controlled host Example |
| QA-01 | На 320–1440 px и длинном RU нет page overflow/закрытых действий | Screenshot/DOM width checks и manual review |
| QA-02 | Клавиатура/assistive tech проходят substantive paths | Keyboard script, VoiceOver/NVDA checklist |
| QA-03 | Штатные пресеты соответствуют согласованному accessibility audit | axe + manual WCAG evidence, not automated badge alone |
| QA-04 | Reduced motion/Off сохраняют контент и отключают пространственные/autoplay эффекты | Emulated preference + manual real browser |
| QA-05 | Два instances и mount/unmount не конфликтуют и не оставляют loops | Runtime interaction/lifecycle tests |
| QA-06 | Все заявленные браузеры проверены, real mobile отдельно от emulation | Versioned browser/device report |
| QA-07 | Установочные commands/README не требуют отсутствующих файлов | Независимый reviewer в чистом fixture |
| QA-08 | Initial JS/media/latency бюджеты соблюдены | Build sizes, controlled lab report, profiler |
| QA-09 | Ошибка preview/storage/session/payment не теряет draft и объяснима | Fault injection scenario, retry/logout/timeout |
| QA-10 | Public/private caches не смешивают данные пользователей | CDN/proxy/RSC/SW test и header evidence |
| QA-11 | Restore подтверждает RPO/RTO и сохраняет order/grant consistency | Timed isolated restore rehearsal |
| QA-12 | Rollback не стирает paid events/доступные версии | Staging deploy rollback rehearsal |
| QA-13 | Не менее 10 из 12 пробных интеграций успешны без правки library source автором | По 3 RU/manual, RU/AI, EN/manual, EN/AI; Next/Vite, медиана ≤15 min как экспериментальный порог |

## 16. Этапы, backlog и оценка

Оценка ведётся в person-days отдельно для разработки сервиса, авторского контента, дизайна, контента/переводов, QA и коммерции. Ниже диапазоны — предварительные сценарии при неполной информации, не календарное обещание. Один person-day — 6 часов focused work. AI-агенты не считаются отдельными штатными людьми, не заменяют ручной device review и не дают механического множителя скорости.

| Этап/backlog | Результат и зависимость | Предварительная трудоёмкость |
| --- | --- | --- |
| E0: contracts/decisions | Утверждённые schema, стилевой pipeline, support matrix, catalog IDs, seller-region questions | 3–5 tech/QA days + design/product работа отдельно |
| E1: сквозной hero | Один original hero, panel, iframe origin, local config, ZIP, 2 prompts, Next/Vite, RU/EN | 10–16 tech/QA days + 3–6 design/content days |
| E2: Free Starter6 | Ещё 5 items, каталог/search/docs, pipeline, mobile/a11y, 12 интеграций | 8–14 platform/QA days + 12–22 item production days |
| E3: Pro catalog | 18 Pro items, 3 collection pages, per-item exports, shared links, published reports | 6–10 platform days + 40–70 item production/QA days |
| E4: Commerce | Auth/account/offers/orders/grants/delivery/payment/refund/reconciliation/renewal, после seller/provider decision | 14–24 engineering/QA days + 3–6 security/ops days; legal отдельно |
| E5: Launch hardening | Performance/device matrix, isolated restore, rollback, terms/docs parity, production smoke | 6–10 cross-discipline days |

Полный диапазон пока не суммируется в дату запуска: есть перекрытия ролей, неизвестная сложность дизайна и повторный review. Рабочая команда для планирования — frontend/content engineer, fullstack/platform engineer, designer, QA с частичной security/ops и RU/EN редактурой. Один человек может совмещать роли, но объём работы не исчезает. Платёжная интеграция может стартовать параллельно после Free сценария, если продавец/юрисдикция/провайдер определены; оплачиваемая витрина не открывается до E4/E5 acceptance.

После E1 измерить cycle time «замысел -> verified bundle» и отдельно platform/export defects. Для каждого item назначить complexity S/M/L (статический / интерактивный / сложная композиция с media/motion), дать optimistic/likely/pessimistic days и независимый QA allowance; рассчитать weighted estimate `(O + 4M + P)/6` и риск-диапазон, не только среднее. После первых трёх элементов пересчитать capacity по фактическим review queues, доле возвратов и переводам. Сначала уменьшать количество сложных релизов/объём интерфейса при сохранении качества; не объявлять 24 элементы готовыми по числу posters.

Gate открытия бесплатной беты: 6 полных комплектов, parity RU/EN, две среды, source/export equality и применимые технические/ИБ проверки. На бете проводят 12 наблюдаемых интеграций; их успешность определяет готовность масштабировать каталог, а не возможность начать сам эксперимент. Gate paid: master-каталог 24, отдельный rights/commerce/security acceptance, продавец и условия, реальные test-mode checkout/refund/recovery и инфраструктурные rehearsals. Support matrix, prices и срок обновлений публикуются только после фактической готовности их выполнять.

## 17. Оставшиеся решения до начала реализации

Нужно утвердить конкретный visual direction hero; реальные framework/runtime patch versions первого fixture; регион продавца и доступность оплаты в целевых странах; auth/payment/storage providers; правила renewal/terms и operational support period каждой release line. IDs master-каталога S001–S012/C001–C008/E001–E004 уже согласованы внутри текущей редакции команды. Ни один из оставшихся пунктов не мешает спроектировать schema/export/Free hero, но seller/payment/terms обязательны до коммерческого запуска.

Источники проверены 21 октября 2026. Ссылки подтверждают возможности технологий и стандарты; архитектура, лимиты, бюджеты и срок работ — рекомендации команды для этого продукта, а не гарантии авторов библиотек.
