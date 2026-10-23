# ИБ, приватность и цепочка поставки — ТЗ v0.2

Дата: 21 октября 2026. Ответственная роль: security/privacy lead. Статус: требования к проектированию и будущей приёмке. Кода приложения ещё нет; аудит, сканирование и проверка защищённости работающего сервиса не проводились.

Документ уточняет `product-spec-v0.1.ru.md`. Первая публичная версия двуязычная: RU + EN; формат контента — React + TypeScript, Next.js и Vite. Коммерческая рабочая модель для согласования: разовые покупки именованных наборов и объединяющего bundle. Число бесплатных и платных элементов определяется реестром продукта; правила безопасности одинаковы для любого платного SKU.

## 1. Решения, влияющие на весь продукт

1. **Публичное демо изолируется на отдельном сайте с собственным регистрируемым доменом.** Сессия аккаунта существует только на основном сайте. `preview.app.example` под тем же основным доменом слабее изолирует cookies и same-site сценарии, поэтому такой вариант не является базовой архитектурой.
2. **В бесплатной бете нет аккаунтов, платежей, пользовательских загрузок, исполнения произвольного кода и AI API.** Настройки, контекст интеграции, сборка пользовательского ZIP и промпта выполняются локально. Аккаунты и хранилище покупок добавляются для коммерческого запуска.
3. **Витрина демо публична; исходный комплект платного элемента закрыт.** JS, CSS и медиа, которые выполняются в публичном демо, посетитель может исследовать и восстановить. Защита от этого не является обещанием. На сервере защищаем исходные TSX/CSS, подробные файлы экспорта и платный AI-комплект.
4. **Платные файлы выдаются авторизованным потоком через backend основного сайта.** Каждое получение проверяет пользователя, покупку, конкретную версию и статус отзыва. Публичного постоянного URL на платный ZIP нет. В v1 signed URL не нужен.
5. **Единица доверия — проверенный неизменяемый релиз.** Один manifest связывает commit, список файлов, SHA-256, зависимости, лицензии, инструкции и результаты проверок. Продажа не даёт возможности менять уже опубликованные байты под прежней версией.
6. **Промпт — поставляемая инструкция, а не средство безопасности AI-агента.** В нём нет указаний отключать защиты, читать секреты или загружать репозиторий куда-либо. Настройки и введённый контекст явно отделены от авторских инструкций; это снижает риск, но не гарантирует поведение внешней модели.
7. **Возврат отзываёт конкретное основание доступа, а не все права аккаунта.** Пересекающиеся действующие покупки сохраняют доступ. Уже скачанный код остаётся у пользователя; технически удалить его из чужого проекта нельзя.
8. **Страна продавца и платёжный провайдер пока неизвестны.** Это блокирует включение checkout, но позволяет завершить ТЗ и выпустить бесплатную бету.

Для требований используем стабильный [OWASP ASVS 5.0.0](https://asvs.owasp.org/) как базу будущей верификации. Для бесплатной беты — применимые контроли публичного web-приложения; для аккаунтов и покупок — применимые требования уровня L2 с отдельным списком исключений. Заявлять соответствие всему ASVS до проверки нельзя; внутренние `SEC-*` ниже не являются номерами требований ASVS.

## 2. Границы доверия и потоки данных

```text
[Посетитель: браузер, URL, DevTools, произвольные HTTP-запросы]
    |
    | HTTPS: публичные каталог, метаданные, документация
    v
[Основной сайт + same-origin backend]
    |                  |                    |
    | postMessage      | authenticated      | create checkout / reconcile
    | только config    | stream             | серверный API
    v                  v                    v
[Preview-сайт]    [Private object store]   [Платёжный провайдер]
 отдельный site    immutable source files      |
 без сессий       public access blocked       | signed webhook
 без PII                                     v
                        [Webhook inbox -> обработчик -> БД покупок/прав]
                                                   ^
                                                   |
                                        [Сессии / identity provider]

[Автор -> private Git -> review -> CI без prod-секретов -> release manifest]
                                            |
                           [отдельная публикация утверждённых артефактов]
                               |                         |
                        public CDN                  private storage

[Локально в браузере] config + context + разрешённые файлы
       -> безопасная сериализация -> preview props / ZIP / clipboard
       -> пользователь сам переносит комплект в свой редактор/AI
```

### 2.1. Что считаем недоверенным

- Любое значение из URL/hash, localStorage, DOM, `postMessage`, формы, заголовков и клиентского запроса; в том числе от вошедшего пользователя.
- Демо и его сообщения относительно основного приложения. Собственные исходники уменьшают вероятность атаки, но XSS или скомпрометированная зависимость не должны давать доступ к покупкам.
- Внешние webhook до проверки подписи и принадлежности merchant account; событие с правильной подписью также требует проверки бизнес-состояния.
- npm-пакет, CI action, новый шрифт, SVG, Markdown, перевод, PR и AI-сгенерированный исходник до review. Собственная команда может ошибиться; статус «авторский» не заменяет проверку.
- Любой файл после пересылки пользователю: наш сервис больше не контролирует изменения, зависимости и разрешения AI-агента в его среде.

### 2.2. Явные отсутствующие потоки

В v1 нет доступа к репозиториям пользователей, OAuth-разрешения на GitHub, чтения clipboard, обращения к LLM, приёма исходников/архивов/SVG от посетителей, импортирования удалённого компонента по URL, серверной сборки пользовательского кода и marketplace авторов. Добавление любого из этих потоков требует пересмотра модели угроз до реализации. Защита загрузок от вирусов не нужна на несуществующем пользовательском upload endpoint; безопасность наших экспортируемых файлов нужна уже сейчас.

## 3. Реестр активов и данных

Классы: **Public** — можно публиковать; **Restricted** — коммерческие исходники и служебные данные; **Personal** — данные аккаунта/поведения; **Secret** — ключи и активные credentials. Пользовательский текст локален по архитектуре, даже если иногда не содержит чувствительных сведений.

| Актив | Класс | Где хранится / кто получает | Правило |
| --- | --- | --- | --- |
| ID, название, описание, категории, постер, цена, публичная совместимость | Public | Git → публичный индекс, HTML, CDN | В индексе нет текста платных исходников и приватных storage keys |
| Собранное демо, его изображения и шрифты | Public | preview-сайт / CDN | Лицензия разрешает web-показ; отсутствие приватных API и телеметрии компонента |
| Бесплатные исходники, README, промпт, ZIP | Public | CDN и браузер | Версионирование, provenance и проверки те же, что у платных |
| Платные исходники, helpers, полный AI-комплект | Restricted | private Git / CI / private storage; после проверки — покупатель | Не включать в публичную сборку, RSC payload, sitemap, поиск или общие source maps |
| Настройки текста/палитры/ссылок | Локальные пользовательские данные | Память браузера; opt-in localStorage; fragment по явному действию | Не пересылать backend/аналитике; share link публичен для любого получателя |
| Контекст проекта для AI, желаемый путь файла | Локальные пользовательские данные | Только память браузера; явный экспорт в clipboard/ZIP | Не включать в share link и автосохранение; очищать при сбросе/закрытии страницы |
| Избранное, выбранный язык | Локальные предпочтения | localStorage основного сайта | Кнопка очистки; не содержат токенов или сведений о покупках |
| Internal user ID, verified email, external identity ID | Personal | Auth/БД аккаунтов | Минимальные поля, доступ владельца и ограниченных служебных ролей |
| Сессия, login/recovery tokens | Secret | HttpOnly cookie / серверное session store | Не помещать в JS storage, URL аналитики, логи и письма поддержки |
| Order ID, provider transaction ID, SKU snapshot, grants, суммы и валюта | Personal + Restricted | Серверная БД / платёжный провайдер | Не полагаться на email как единственный ключ владельца покупки |
| PAN/CVC и полные карточные данные | Вне нашего хранения | Hosted checkout провайдера | Наши формы и логи никогда их не принимают; обязанности merchant уточняются при выборе интеграции |
| Raw webhook | Personal + Restricted | Краткосрочный ограниченный inbox | Проверка подписи по исходным bytes; минимизация и срок хранения, см. §9 |
| Продуктовая аналитика | Personal, если есть идентификаторы | Выбранный аналитический сервис или своя агрегация | Только allowlist событий/полей, без текстов/URL hash/контекста/clipboard |
| Access/error/audit logs | Personal + Restricted | Выбранный logging storage | Редакция секретов и query; ограничение доступа и сроков |
| CI deploy credentials, webhook secrets, DNS/admin recovery codes | Secret | Secret manager / защищённые environment | Раздельные окружения, MFA, ротация и журнал выдачи |
| Лицензии, история происхождения, reviewer evidence, release hashes | Restricted; часть публикуется | Git и release registry | Сохранять вместе с релизом; публично давать необходимые notices |
| Резервные копии БД | Personal + Restricted | Отдельное backup-хранилище | Шифрование, отдельные права, тест восстановления и удаления |

## 4. Модель ролей и доступа

Публичная регистрация не создаёт административных прав. В v1 нет пользовательской CMS. Роли ниже — права людей и service accounts в выбранных инструментах, а не требование строить отдельную админку.

| Роль | Читать | Изменять / выполнять | Запрещено по умолчанию |
| --- | --- | --- | --- |
| Аноним | Public-каталог, демо, бесплатные файлы | Локальные настройки/избранное | Платные source/prompt/bundle; чужие аккаунты/покупки |
| Вошедший без покупки | Public + свои профиль/сессии/заказы | Свой checkout, выход, запрос удаления | Выдать себе grant; смотреть чужие order IDs |
| Покупатель | То же + покрытые активными grants версии | Скачать, скопировать комплект; повторно скачать eligible версии | Любой платный item только по флагу `isPro`; чужие квитанции |
| Автор контента | Git-контент и требования качества | Ветка/PR, документация RU+EN, provenance | Самостоятельная публикация в prod, доступ к customer DB и оплатам |
| Reviewer / release owner | Код, release evidence | Подтвердить релиз, инициировать публикацию/отзыв | Неограниченное чтение PII; отмена audit trail |
| Поддержка | Минимум по обращению: masked email, order state, grants | Запросить повторную сверку; выдать инструкции | Читать контекст проекта, экспортировать базу, менять произвольные grants |
| Finance owner | Суммы, provider IDs, возвраты | Возврат в консоли провайдера, проверка reconciliation | Доступ к CI, секретам auth и исходникам чужих проектов |
| Security/operations | Security events, настройки платформы | Отзыв релиза/сессий, ротация ключа, инцидент | Бесконтрольный постоянный superuser; неизбирательный экспорт PII |
| Build CI | Утверждённый commit и тестовые fixtures | Сборка и проверки во временной среде | Production DB, payment secrets, publish credentials |
| Release CI | Проверенный artifact ID/hash | Записать новые объекты релиза, переключить публикацию | Пересобрать подменённый исходник; читать все платежи |
| Backend runtime | Минимум session/entitlement данных, private objects read | Создать checkout, обработать очередь, выдать stream | Запись релизов, управление DNS, чтение CI secrets |
| Webhook service | Verify secret, inbox, относящиеся транзакции | Проверенная очередь событий/ledger | Создавать релизы; принимать user ID из браузера как владельца платежа |

Для изменений auth, правил доступа, CI, webhook, лицензии и платного состава требуется независимое review. Один человек может совмещать операционные роли, но нельзя утверждать собственное изменение критичной границы как независимую проверку. Если постоянного второго специалиста нет, перед платным запуском нужна разовая внешняя проверка этих границ с сохранённым отчётом. Временный emergency access выдаётся по отдельной процедуре, ограничен по времени и оставляет журнал.

Базовый принцип — отказ по умолчанию и проверка разрешения на каждый запрос, включая прямой API, а не только UI. Это соответствует [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## 5. Реестр рисков

Оценки предварительные: вероятность **Н/С/В**, ущерб **1–5**, где 5 — массовое заражение скачиваемого кода, захват административного контура или крупная утечка. Это оценка команды для проектирования, а не статистика инцидентов. **P0-B** блокирует бесплатную бету; **P0-P** блокирует оплату; **P1** выполняется в соответствующем этапе до широкого запуска. Коммерческие риски не требуют строить аккаунты в бесплатной бете.

| ID | Сценарий и затронутый актив | Вероятность / ущерб | Обработка и приоритет | Проверки |
| --- | --- | --- | --- | --- |
| R01 | URL config/текст вызывает XSS в основном UI, demo или исходниках | В / 4 | Типизированные поля, безопасные sinks/serializer, отказ от HTML/JS; P0-B | SEC-01–03 |
| R02 | Компрометация preview даёт cookies, навигацию или команды родителю | С / 5 | Отдельный site, sandbox, строгий messaging, no credentials; P0-B | SEC-04–07 |
| R03 | Просмотр исходника/подсветка/Markdown выполняет поставленный код | С / 4 | Код показывается текстом/AST; raw HTML отключён; P0-B | SEC-03, SEC-08 |
| R04 | Платный source попал в HTML/RSC/public assets/source map | С / 4 | Разделить public/private manifest и build graph; P0-P | SEC-09–10 |
| R05 | IDOR: чужой order, receipt или item скачивается по ID | В / 4 | Server-side owner + grant + release checks; P0-P | SEC-11–12 |
| R06 | CDN/Next cache отдаёт premium ответ другому посетителю | С / 4 | Authenticated stream, no-store во всех слоях, multi-user тест; P0-P | SEC-10, SEC-13 |
| R07 | Захват аккаунта через почту/OAuth/linking/recovery | С / 4 | Проверенный auth, одноразовые tokens, reauth, запрет неявного merge; P0-P | SEC-14–16 |
| R08 | CSRF/session fixation/open redirect меняют профиль или покупку | С / 4 | CSRF+Origin, ротация сессии, allowlist callback, безопасные cookies; P0-P | SEC-14–17 |
| R09 | Ложная оплата: success URL, подмена SKU/суммы, чужой payment ID | В / 4 | Серверная цена/order binding и проверка provider state; P0-P | SEC-18 |
| R10 | Повторный/старый/параллельный webhook повторно выдаёт доступ после refund | В / 4 | Inbox uniqueness, транзакции, state machine, reconciliation; P0-P | SEC-19–20 |
| R11 | Возврат одного набора отключает другой оплаченный grant | С / 3 | Grants по покупке, union доступа, покрытие snapshots; P0-P | SEC-12, SEC-20 |
| R12 | Malicious npm/action/авторский PR внедряет backdoor в тысячи экспортов | С / 5 | Review, pinned deps, SBOM, CI isolation, release evidence; P0-B | SEC-21–24 |
| R13 | Секрет backend/CI попадает в JS, ZIP, лог или PR build | С / 5 | Раздельные build/deploy права, secret scan, canary, no prod secrets in build; P0-B | SEC-21, SEC-23–24 |
| R14 | В ZIP неожиданные пути, symlink, `.env`, install hook или слишком большой файл | Н–С / 4 | Allowlist файлов и путей, лимиты, распаковка в disposable fixture; P0-B | SEC-25 |
| R15 | Шаблон промпта или контент атакует внешнего агента, навязывает эксфильтрацию | С / 4 | Review всех инструкций, разделение данных, никаких секретов/remote installers; P0-B | SEC-26 |
| R16 | Контекст/текст/fragment уходит в аналитику, error replay, referer или поддержку | С / 4 | Локальная обработка, allowlist telemetry, без session replay; P0-B | SEC-27–28 |
| R17 | Сервер пытается fetch пользовательского URL и обращается к metadata/internal IP | Н при текущем scope / 5 | Нет remote import/proxy; server asset map из manifest; P0-B | SEC-29 |
| R18 | Бот разгоняет auth email, downloads, стоимость edge или checkout | В / 3 | Лимиты, очереди, budgets, общий контроль egress; P1-B/P0-P | SEC-30 |
| R19 | CPU/memory демо или ZIP зависают браузер/основную навигацию | С / 3 | Только проверенный код, bounds на inputs/files, остановка демо; P1-B | SEC-02, SEC-31 |
| R20 | Потеря БД покупок, удаление backup, восстановление возвращает отозванные grants | Н–С / 5 | Отдельные backups, restore drill, replay ledger, deletion tombstones; P0-P | SEC-32–33 |
| R21 | Копирование публичного демо и перепродажа скачанного содержимого | В / 3 | Условия лицензии, авторство, сигнализация аномалий; остаточный риск принят; P1-P | SEC-34 |
| R22 | Неясная лицензия шрифта/медиа/кода ведёт к незаконному распространению | С / 4 | Provenance, license manifest, reviewer, takedown; P0-B | SEC-35 |
| R23 | Уязвимую версию продолжают скачивать после security incident | С / 5 | Runtime revocation registry, purge, безопасная замена, уведомления; P0-B/P0-P | SEC-36 |
| R24 | Администратор/поставщик скомпрометирован, DNS/storage захвачен | Н–С / 5 | MFA, минимальные права, отдельные recovery и журналы, key rotation; P0-B | SEC-23, SEC-37 |
| R25 | Неверный перевод условий или privacy текста меняет смысл RU/EN | С / 3 | Единая версия политики, bilingual review, явный язык договора; P0-P | SEC-38 |

При изменении архитектуры вероятности пересматриваются. Для любого оставленного открытым риска нужны владелец, причина, срок и компенсирующая мера; открытый P0 своего этапа блокирует выпуск.

## 6. Требования к реализации

### 6.1. Настройки, URL и экспорт

- У каждого item/version — фиксированная JSON schema: allowlist ключей, типы, enums, диапазоны чисел, длины строк/массивов. Unknown keys отклоняются; миграция схемы только явная. Не использовать рекурсивный merge с объектами пользователя; ключи `__proto__`, `constructor`, `prototype` не принимаются.
- Начальный лимит share fragment: **6 KiB для полной сериализованной ссылки**, decoded JSON ≤16 KiB, без сжатия и рекурсивных объектов. Превышение не обрезается: пользователь получает объяснение. Для длинного локального контента можно экспортировать ZIP; ссылка сохраняет только допустимое публичное состояние.
- Fragment использует canonical engineering envelope: `schemaVersion`, `itemId`, `itemVersion`, `configSchemaVersion`, `shareMode`, `configProjection`. По умолчанию `shareMode=appearance` передаёт оформление и движение. Пользовательские тексты и ссылки добавляются только через явный checkbox «Включить тексты и ссылки» с предупреждением о публичности (`content-and-appearance`); контекст AI не включается никогда. Roundtrip восстанавливает именно выбранную проекцию, остальные поля используют defaults закреплённой версии. Fragment не попадает в HTTP-запрос автоматически, но читается JS и может уйти через сторонние SDK. Убирать hash из analytics/error events; считать любую такую ссылку публичной, а не зашифрованной.
- Для текстов использовать React text nodes / DOM `textContent`. Не принимать HTML, произвольный CSS, обработчики или JSX. Цвет — разобранное значение согласованного формата, размеры — ограниченные числа, font — enum; строку не подставлять целиком в CSS rule.
- CTA URL в публичной Studio: относительный путь/anchor или `https:`; отдельное явно разрешённое поле может поддерживать `mailto:`/`tel:`. `http:` допустим только для localhost в локальном Example/API интегратора, не для удалённых ссылок Studio. Отклонять `javascript:`, `data:`, `file:`, protocol-relative URL, управляющие символы и обфускацию схемы. Изменённые посетителем ссылки в демо не осуществляют внешнюю навигацию: UI показывает безопасный режим демонстрации. Экспорт сохраняет валидированное значение.
- Изображения/видео v1 выбираются из заранее проверенных ресурсов. Пользователь не задаёт URL для серверного image optimizer, OG-renderer или asset proxy. Свои медиа добавляются после экспорта в проекте пользователя.
- `config.json` сериализуется JSON serializer; `Example.tsx` — AST/printer или фиксированный шаблон с корректным string literal serializer. Пользовательское значение не становится именем файла, import path, npm specifier или shell command.
- Перед экспортом сравниваются данные schema и release, файлы manifest и hashes. Выход содержит точно выбранную версию, локальный config и указанный способ интеграции. Copy и ZIP получают одинаковое состояние. Сервис не читает clipboard; запись только по явному действию.

Выбор безопасного способа вывода зависит от контекста HTML/URL/JS; общий «escape всё одной функцией» не заменяет это разделение. Основание: [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html). Длины и формат конфигурации выше — проектные ограничения, которые проверяются на RU/EN контенте.

### 6.2. Изоляция preview

- Отдельный preview-домен никогда не получает auth/payment cookies, production API keys или доступ к user store. Никаких `Domain=` cookies основного сайта. Preview host не устанавливает tracking cookies; отдельный health probe проверяет его заголовки и network requests.
- Базовый iframe: `sandbox="allow-scripts allow-same-origin"`, **только при реально отдельном origin/site**; это сохраняет обычный origin для строгого `postMessage` и локальных modules/assets. `allow-same-origin` не делает preview одноимённым с родителем: origin остаётся его собственным. Не разрешать forms, top navigation, popups, downloads, modals, pointer lock, storage-access. Отключить camera/microphone/geolocation/payment через Permissions Policy.
- Вариант `sandbox="allow-scripts"` создаёт opaque origin; нельзя затем «починить» проверки, принимая любой `origin="null"` или отправляя секреты с `targetOrigin="*"`. В v1 этот вариант не выбран. Комбинация scripts + same-origin на одном origin с родителем недопустима: MDN предупреждает о возможности снять sandbox. [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).
- Обе стороны сравнивают `event.origin` с полным ожидаемым origin (scheme+host+port), `event.source` — с конкретным `iframe.contentWindow`/`window.parent`. Сравнения по `includes`, `endsWith` или «наш домен где-то в URL» запрещены. Отправка — с точным `targetOrigin`. Envelope из engineering-контракта: `protocolVersion`, случайный `channelId` на mount, `requestId`, `type`, `itemId`, `itemVersion`, `payload`; каждое поле проходит schema и ограничение размера. Эти проверки исходят из свойств API, описанных в [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).
- Протокол v1 ограничен `READY`, `APPLY_CONFIG`, `APPLIED`, `RESIZE`, `REPLAY`, `PAUSE`, `ERROR`. Нет команд `eval`, `fetchUrl`, `navigate`, `download`, `getToken`, `readStorage` или произвольного метода. `RESIZE` ограничен 120–2 400 px и частотой, не вызывает бесконечную петлю обновлений. Stale сообщения старого iframe игнорируются. Viewport контейнера контролирует parent; актуальность config подтверждается совпавшим requestId в APPLIED.
- CSP preview: разрешить собственные script/style/image/font источники только из известного списка; `connect-src 'none'`, `form-action 'none'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors` только основного сайта и разрешённого staging. Если worker для конкретного эффекта не нужен, `worker-src 'none'`. Произвольные внешние runtime-ресурсы не нужны. Для динамических style props допустимое расширение `style-src-attr` согласуется отдельно; нельзя из-за CSS разрешать `unsafe-eval` для JS.
- CSP основного сайта: `frame-src` только preview; `frame-ancestors 'none'`; script nonce/hash без `unsafe-eval` и общего `unsafe-inline` для script; точный allowlist auth/checkout/observability. Платёжный checkout предпочтительно full-page redirect. Production policy проверяется на настоящей Next production-сборке; nonce может менять стратегию статического рендера и кэширования, это фиксируется в ADR. Сначала Report-Only, перед выпуском enforcement. CSP — дополнительная защита, не замена безопасным sinks. [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).
- На обоих сайтах HTTPS, `X-Content-Type-Options: nosniff`; основному — HSTS после проверки доменов и `Referrer-Policy: no-referrer` для чувствительных страниц/выдачи. Не включать HSTS preload вслепую до инвентаризации всех используемых доменов. CORS закрытого API не разрешает preview и произвольные origins.

Iframe не гарантирует отдельный OS-процесс или CPU quota. Защита от зависания строится на отсутствии произвольного кода, code review, ограничениях нагрузки, performance QA и возможности выключить проблемный релиз.

### 6.3. Source viewer, документация и зависимости

Source viewer принимает содержимое только утверждённого релиза и выводит код как текст/безопасное дерево tokens. Подсветка не исполняет TSX/MDX и не вставляет произвольный HTML из исходника. Raw HTML в Markdown отключён; MDX доступен только в доверенном build-процессе с review, не компилируется из URL. SVG — только проверенные авторские assets без scripts, foreignObject и удалённых ссылок; SVG, где нужен только постер, можно растрировать при сборке.

В source/ZIP не допускаются: наши session/payment keys, telemetry/tracking SDK, внешний runtime fetch для лицензии, hidden watermark callbacks, `eval`, обфусцированный код, self-updating загрузчик, непроверенные `postinstall`/`prepare`, `curl | sh`, секретный backend сервиса, абсолютный путь автора, `.env`, `.git`, `node_modules`. Разрешённые сетевые обращения пользователь подключает осознанно в своём проекте; в поставляемых демо формы не отправляют данные.

Для новых dependencies — карточка: назначение, registry/name/version, лицензия, maintainer source, browser/SSR footprint, install scripts, advisory review и разрешивший reviewer. CI использует lockfile и воспроизводимый frozen install; `npm ci` отказывается от рассогласованного lockfile, а `ignore-scripts` позволяет отключать lifecycle scripts. Если toolchain требует script, разрешать только конкретный проверенный шаг без prod-секретов. [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/). SBOM распространяемого элемента отделяется от SBOM самого сайта: зависимость CI не становится автоматически зависимостью покупателя.

### 6.4. Аккаунты, сессии и восстановление

До коммерческого запуска выбрать зрелый identity provider/library и один понятный сценарий входа. Не проектировать собственную криптографию или хранение паролей. Минимальный профиль: internal user ID, verified email, provider ID, policy versions; display name/avatar не обязательны.

- Session cookie `__Host-session`: `Secure; HttpOnly; SameSite=Lax; Path=/`, без `Domain`; backend проверяет активность сессии. `Lax` выбран для возвращения из почты/checkout; CSRF защищается отдельно. Не хранить auth token/JWT/refresh token в localStorage/sessionStorage. Рекомендации по cookie и ротации: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- Начальные проектные сроки: idle ≤7 дней, absolute ≤30 дней для обычного покупателя; для административных консолей — отдельные короткие сессии и MFA. После login/reauth session ID меняется. Logout отзывает текущую сессию; «выйти везде», подозрение на захват, смена критичного login identity — все сессии.
- Изменение email, привязка identity и удаление аккаунта требуют свежей повторной аутентификации. Нельзя автоматически объединять две учётки только по одинаковому email. OAuth state/nonce/PKCE, проверка issuer/audience и redirect URI реализуются выбранной библиотекой и проверяются на интеграции.
- Если выбран magic link: короткоживущий (целевой ≤10 минут), одноразовый, с rate limit; token не логируется. Почтовый security scanner не должен автоматически завершать вход простым фоновым открытием ссылки; landing/confirmation flow проверяется у провайдера. После обмена token удаляется из адресной строки. Recovery не выдаёт покупку лишь по знанию email/order ID.
- Cookie-auth unsafe mutations проверяют CSRF token и Origin/Fetch Metadata по принятой схеме; GET не меняет состояние. SameSite — дополнительный барьер. Webhook не использует browser CSRF token: у него собственная криптографическая проверка. Основание: [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- Callback/return URL — внутренний allowlist пути или заранее заданный origin. Никакого `redirectTo` на произвольный домен. Ошибки login/recovery не раскрывают существование email. В auth-интерфейсах нет session replay и сторонней рекламной аналитики.

### 6.5. Платный доступ и кэш

Все download/source/prompt/order/receipt endpoints используют один server-only authorization layer. Для Next Server Actions и route handlers проверки вызываются внутри операции; middleware, скрытая кнопка, unguessable UUID или общий `isPro` их не заменяют. Next рекомендует server-only DAL с проверкой прав и минимальными DTO. [Next.js: Data Security](https://nextjs.org/docs/app/guides/data-security).

Проверка выдачи: `valid session -> account active -> release exists -> not revoked -> at least one active grant covers item + eligible release -> stream exact manifest artifact`. ID и параметры из клиента не могут изменить owner, storage key, price или covered set. Недоступные покупки возвращают одинаковый 404/403 согласно принятой схеме без раскрытия чужих данных. Backend principal получает read-only доступ только к нужному private префиксу; storage public access/listing выключены.

`AccessGrant` по engineering-контракту хранит `grantId`, `userId`, `orderLineId`, immutable `itemIds` snapshot, `paidAt`, `updatesStart/End`, status; условия на момент покупки закреплены связанной OfferRevision. Набор и объединяющий bundle создают разные grants; эффективный доступ — объединение действующих grants. Добавление нового item в каталог или SKU не меняет старый snapshot. Функциональные обновления покрытых IDs — 12 месяцев по рабочей модели; ранее eligible версии доступны повторно, пока работает сервис и версия не отозвана. Ветку security support описать отдельно: минимальные исправления безопасности поддерживаемой линии предоставляются владельцам покрытого item независимо от истечения functional window. Связь `SecurityRemediation: revokedRelease -> safeReplacement` проверяется сервером. Это не даёт бесплатные новые IDs, переработки дизайна или новые платные наборы.

Source, AI-комплект с кодом, приватные JSON, заказы и stream responses: `Cache-Control: private, no-store` и явное отключение CDN/shared cache/prefetch, framework caches и service-worker cache. Не использовать persistent cache функции поверх user-bound результата. `no-cache` допускает хранение с перепроверкой, поэтому не является заменой `no-store`; `private` само по себе допускает браузерный cache. [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control). После logout очищать находящиеся под контролем приложения source state и Blob URLs; обещать удаление всех уже сохранённых копий нельзя.

Signed URL допускается позже отдельным ADR при доказанной необходимости: приватный объект, точные method/key, TTL ≤60 секунд, перед выдачей та же проверка доступа, отсутствие URL в логах/аналитике/referrer. Такой URL — переносимый bearer credential, обычно допускающий повторные скачивания до expiry; возврат покупки сам по себе не отзывает уже выданный URL. При экстренном отзыве нужны запрет object/version либо серверный stream. Эти ограничения подтверждает [AWS S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html); фактические свойства выбранного storage проверяются отдельно.

### 6.6. Платежи и финансовые события

Провайдер пока не выбран; конкретные названия API и подписи появятся в provider ADR. Требование — hosted checkout/платёжная страница, серверный расчёт корзины, sandbox/live separation, доступная история событий, подпись webhook, API сверки, возвраты и chargebacks. Перенос card entry к провайдеру уменьшает наш объём обработки, но не является утверждением об отсутствии обязанностей merchant.

Сервер создаёт order с internal owner ID, immutable SKU/item snapshot, ценой, валютой и provider merchant account. Клиент передаёт только SKU; сумма, скидка и entitlement не принимаются на веру. Checkout связывается с order сервером. Success page показывает `pending` до подтверждения; `?paid=true` или receipt screenshot не даёт доступ.

Входящее событие: проверить подпись по raw bytes и timestamp/replay policy провайдера; проверить live/test, merchant, transaction/order binding; надёжно записать в inbox с unique `(provider, eventId)`; после durable записи подтвердить приём; выполнить обработку транзакционно. При отказе inbox вернуть retryable ошибку. Секрет подписи не совпадает с payment API key; ротация поддерживает ограниченное перекрытие ключей.

Повторы и перестановки — нормальный вход. Например, Stripe прямо описывает повторную доставку и отсутствие гарантии порядка; это пример требований к адаптеру, а не выбор Stripe. [Stripe webhooks](https://docs.stripe.com/webhooks). State machine не ориентируется только на время получения/`created`: при неоднозначности запрашивает авторитетное состояние транзакции. Нужны idempotent side effects и уникальность grant на оплаченный order. Поздний `paid` после подтверждённого refund не включает доступ повторно.

Полный refund/подтверждённый chargeback отзывает grant этой покупки; частичный refund следует утверждённой политике SKU и требует явного расчёта. Dispute-open не равен итоговому chargeback: отдельный статус и заранее утверждённое правило временного доступа. Пересекающиеся grants сохраняются. Ручная поддержка не выставляет `paid=true`; повторная выдача прав — через сверку или отдельный журналируемый goodwill grant с основанием.

Начальная проектная частота reconciliation: каждые 15 минут для pending/error последних 24 часов, раз в сутки для активных/изменённых покупок в доступном окне провайдера. Сверка должна укладываться в API limits; после выбора провайдера расписание уточняется. Есть dead-letter queue, ручной replay с audit, метрики backlog/lag и тест восстановления после outage. Бизнес-правила refund, налоги, допустимые регионы и условия использования утверждаются до live checkout.

### 6.7. CI, релизы и целостность экспортов

Build job получает исходники и dependencies, но не prod DB, payment keys, deploy credentials. PR/fork jobs не получают production secrets; недоверенный PR не исполняется в привилегированном `pull_request_target`/аналогичном контексте. Изолированные временные runners; никакого общего Docker socket с production. Публикация выполняется отдельной identity и только для уже проверенного artifact ID/hash.

Для CI actions/workflows — фиксировать зависимости lockfile, где платформа это поддерживает, либо full commit SHA с проверкой source repository. В GitHub использовать минимальный `GITHUB_TOKEN`, environment protection, OIDC с ограничением repo/ref/environment/audience вместо долгоживущих cloud keys. Не вставлять PR title/branch/manifest text прямо в shell. Выбранные меры основаны на [GitHub Secure Use](https://docs.github.com/en/actions/reference/security/secure-use), включая предупреждение, что редактирование логов не гарантирует сокрытие всех вариантов секрета.

Release manifest фиксирует `itemId`, `release`, commit, build runtime/tool versions, source/asset/dependency hashes, SBOM, license/provenance references, schema, шаблон AI-инструкции, fixtures и reviewer evidence. Базовый bundle versioned и immutable; публичная metadata отделена от private file list/content. SHA-256 ловит повреждение и несовпадение, но checksum на захваченном сайте не доказывает подлинность. Для расследования сохранять подписанный/аттестованный build record в независимом от CDN контуре. Не писать «полностью reproducible build», пока равенство байтов повторной сборки не доказано.

У пользовательского ZIP есть base release manifest и отдельный export manifest с hash окончательных локальных файлов, включая config. Browser-generated export не подписывается нашим серверным ключом: ключ не попадает на клиент. Это проверяемая связь с базовой версией, а не гарантия авторства произвольного отредактированного пользователем архива.

ZIP формируется только из списка разрешённых файлов. Запрещены абсолютные/UNC/drive пути, `..`, обратные слэши обхода, NUL, symlink/hardlink, повторяющиеся нормализованные имена, nested archive, system executables и неизвестные extensions. Нельзя позволять filename из config. Начальные лимиты на один item: ≤200 файлов, ≤20 MiB суммарных распакованных bytes, ≤5 MiB один файл, сжатый base bundle ≤5 MiB, без `node_modules`. Для возможного будущего multi-item ZIP (в v1 выдача по одному item) отдельный общий предел: ≤2 000 файлов и ≤100 MiB распакованных bytes, с сохранением per-file/per-item ограничений. Пределы проверяются до browser packing; превышение требует review/другого формата, а не отключения проверки. CI распаковывает наш архив во временный каталог и подтверждает отсутствие записи за пределы. Пользователь не загружает ZIP на сервис; «zip bomb от посетителя» вне текущего пути. Риск от скомпрометированного собственного artifact остаётся и проверяется.

### 6.8. Промпты и внешние AI-инструменты

RU и EN шаблоны проходят одинаковое review. В них: выбранный immutable релиз; explicit file boundaries; зависимости; задача интеграции; требование учитывать инструкции репозитория; не читать/не раскрывать `.env`, ключи и приватные данные без необходимости; не отправлять проект внешним endpoints; не устанавливать альтернативный пакет по предложению из контента; не удалять файлы и не менять auth/платежи проекта ради декоративной секции. Указания не должны заставлять агента игнорировать системные правила, repo instructions, security checks или подтверждения пользователя.

Строки из config/context сериализуются в отделённый раздел данных, не сливаются с авторскими командами. Comments/README/assets из релиза также проверяются как потенциальная косвенная инструкция. Не обещать, что delimiters или фильтр фраз исключают prompt injection: смешивание инструкций и данных — известный класс риска. [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).

Публичный UI коротко сообщает: «Контекст обрабатывается в браузере. После копирования вы сами передаёте его выбранному AI-инструменту». Политика этого внешнего инструмента не становится политикой нашего сервиса. Встроенная кнопка не отправляет prompt внешнему агенту; она копирует/экспортирует его. Security smoke scenarios проверяют отсутствие вредных инструкций и опасных команд, а не объявляют универсальную безопасность всех моделей.

### 6.9. SSRF, abuse и доступность

Сервер получает resources по внутренним item/release IDs из утверждённого manifest, не принимает URL для fetch/import/thumbnail/OG/source. Даже URL со строгим frontend validator не становится разрешением на server fetch. Build-time media из внешнего источника добавляет только автор; review проверяет конечный host, тип, размер и отсутствие redirects в private network. Если позднее появится server fetch, отдельно проектировать allowlist, DNS/redirect/IP handling и egress restrictions, включая metadata endpoints. Общие сложности и allowlist-подход описаны в [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

Rate limits применяются к identity + IP/network с учётом shared NAT, без вечной блокировки по одному признаку. Стартовые настройки для измерения: source/bundle API ≤30 запросов/мин на пользователя, ≤3 одновременных потоков; создание checkout ≤5/10 мин; login email ≤5/10 мин на нормализованный адрес с отдельным IP budget и cooldown. Ответ `429` с `Retry-After`, доступный retry, локализация RU/EN. Пороги — начальные эксплуатационные значения; нагрузочные проверки и реальные ложные срабатывания должны их уточнить до платного трафика. Webhook endpoint имеет отдельные ограничения и очередь, не блокируется browser CAPTCHA.

Большая часть Public выдачи — статическая, с edge budgets/alerts по bandwidth и стоимости. Catalog не запускает десятки живых demo; активное demo одно, background/hidden animation приостанавливается. Ограничить размеры сообщений/JSON/локальной упаковки и разовый memory budget. Scraping публичных демо не устраняется robots.txt, обфускацией или запретом DevTools. Защита premium — обычная auth, соразмерные лимиты и условия лицензии; DRM, hardware fingerprint и скрытая телеметрия в экспортируемом коде не входят в продукт.

## 7. Проверяемая приёмка безопасности

Все пункты — будущие проверки. Evidence хранится с commit/release/date/browser or environment. **B** — до беты; **P** — до live оплаты; **R** — для каждого релиза; `N/A` допустимо только с письменным основанием. QA выполняет негативные сценарии на своих тестовых аккаунтах/данных. Production тесты на чужих пользователях не нужны.

| ID / этап | Проверка | Условие приёмки и evidence |
| --- | --- | --- |
| SEC-01 B,R | XSS в каждом text/URL/color поле, URL hash и localStorage: `<script>`, quotes, JSX breakouts, encoded schemes, CSS `url()` | Ничего не исполняется в app/preview/исходном Example; невалидное значение отвергается с RU/EN ошибкой; есть corpus + результат browser test |
| SEC-02 B,R | Oversized/unknown/deep config, prototype keys, массив сверх лимита, invalid enums, NaN/Infinity | Валидатор отказывает до render/packing; нет prototype mutation, memory crash и silent truncation |
| SEC-03 B,R | Source/Markdown с HTML/event handlers/closing tags/MDX code | Показан текст, нет исполнения; обработчик raw HTML отключён; сохранён DOM/network trace |
| SEC-04 B | Preview пытается читать parent DOM/cookie/storage и обращаться к private API | Ошибка SOP/отказ API; auth cookies не отправлены preview; нет session/PII в frame resources или сообщениях |
| SEC-05 B | Preview пытается top navigation, form submit, popup, download, camera/mic | Запрещено sandbox/Permissions Policy; проверено также прямое открытие preview URL, заголовки остаются безопасными |
| SEC-06 B,R | Сообщения с wrong origin, похожим доменом, `null`, wrong source, old channel, неверным item/release, unknown type | Нет изменения UI/state/навигации/выдачи; есть protocol unit tests и cross-origin browser scenario |
| SEC-07 B,R | Production CSP/headers в Chrome, Firefox, Safari и после CDN | Enforcement активен; injected script/eval/external connect заблокированы; штатные preview/config/экспорт работают; исключения перечислены |
| SEC-08 B,R | Source viewer highlighter и npm/SVG/Markdown inputs | Dependency review и негативные fixtures; никакой runtime compilation на основном origin |
| SEC-09 P,R | Просканировать public build graph, HTML, RSC, JSON, JS chunks, source maps, search/OG/feed и repo visibility | Canary уникальный TSX/comment из private bundle не обнаружен публично; demo compiled bytes явно признаны Public; приложен список проверенных ресурсов |
| SEC-10 P | Private storage/listing/cache configuration, случайные guessed keys и прямые requests | Public GET/LIST запрещены; private source не опубликован в CDN; auth response headers проверены после edge |
| SEC-11 P,R | Alice/Bob/anonymous: чужие account/order/receipt/item/version IDs, API methods и Server Actions | Каждый endpoint повторно проверяет owner + policy; чужие данные/файлы не возвращаются независимо от UI/UUID |
| SEC-12 P | Матрица grants: no purchase; pack A; pack B; bundle; overlapping; expired updates; new ID; revoked release | Выдаётся точное объединение eligible releases; старый snapshot не расширяется новым item; security replacement доступен нужному владельцу за functional window |
| SEC-13 P,R | Alice прогревает source/order/prompt; затем Bob и anonymous через тот же CDN/Next route, prefetch/RSC/reload/back/logout | Никакой общий cache не отдаёт Alice payload; local app source state очищается при logout; offline cache не включён для private data |
| SEC-14 P | Cookie flags, fixation, expired session, logout/current/all devices, session rotation | Secure/HttpOnly/__Host без Domain, отказ старой/отозванной session, токенов нет в JS storage/логах |
| SEC-15 P | OAuth/magic link invalid/expired/replayed tokens, wrong state/nonce/PKCE, mail scanner behavior | Вход только по валидному одноразовому flow, redirect allowlist; сканер не завершает вход; evidence согласно выбранному provider |
| SEC-16 P | Account linking/email change/recovery через совпавший email, чужой order ID, без свежего login | Нет auto-merge/передачи покупки; критичные операции требуют reauth; восстановление имеет журнал |
| SEC-17 P | Cross-site unsafe POST/action, отсутствующий CSRF, hostile Origin, GET mutation, open redirect | Состояние не меняется; легитимный auth/checkout return работает; webhook проверяется отдельно |
| SEC-18 P | Подменить цену/SKU/currency/user ID, success URL, transaction чужого merchant/test mode | Не выдаются права; checkout order bound сервером; итоговая сумма/состав проверены |
| SEC-19 P,R | Webhook без/с неправильной подписью, modified raw body, старый timestamp, live/test mismatch, secret rotation | Невалидное событие не меняет ledger; валидное принимает только нужный merchant; raw-body test fixtures и временные границы сохранены |
| SEC-20 P | 20 повторов/параллельных paid, refund-before-paid, paid-after-refund, partial refund, dispute, overlap grants, queue outage | Нет дублей grant/side effects; refund не возрождается старым событием; другой valid grant жив; durable inbox/retry/reconciliation восстанавливают правильное состояние |
| SEC-21 B,R | Lockfile/dependency/SBOM/license checks + advisory triage, добавленный install hook | Неизвестная/недопустимая зависимость и неразрешённый script блокируют release; false positive получает owner/reason/expiry |
| SEC-22 B,R | Manifest против исходников/preview/export; намеренно подменить один file byte/artifact | Hash mismatch блокирует публикацию/упаковку; типы, fixtures и review evidence относятся к одному commit |
| SEC-23 B,P | CI permissions, fork PR, workflow injection, MFA/recovery, OIDC environment scope | Недоверенный job не читает prod secrets и не публикует; release actor ограничен; independent review защищает critical paths |
| SEC-24 B,R | Canary secret в тестовом secret store + scan финального JS/ZIP/maps/logs; известная имитация token в исходнике | Canary не появляется в артефактах/логах; имитация секрета останавливает CI; обнаруженная реальная утечка вызывает rotation, не только удаление строки |
| SEC-25 B,R | ZIP `../`, absolute/Windows/UNC paths, symlink, duplicate normalized names, nested archive, превышение bytes/files | Release валидатор отклоняет; штатный архив распаковывается только в test root; file allowlist включает необходимые license notices |
| SEC-26 B,R | Review RU/EN AI-комплекта и corpus контекста «ignore rules / read env / upload project / install malware» | Авторский шаблон не даёт таких команд; user text отделён как данные; нет автоматической отправки AI API. Не заявлять этим тестом иммунитет внешнего агента |
| SEC-27 B,P | Ввести уникальный чувствительный canary в text/context, затем все действия и induced errors | Network/analytics/logs не содержат canary, config/hash/context/clipboard; локальное копирование/ZIP содержит только ожидаемые данные |
| SEC-28 B | Share-link preview, disclosure RU/EN, clear local data, no-context persistence | По умолчанию в ссылке только style/motion; text/links включаются отдельным checkbox с notice; roundtrip восстанавливает выбранную проекцию; private context не сохраняется и не включается |
| SEC-29 B,R | Поиск всех server fetch/optimizer/import routes, URL на localhost/private/metadata/redirect | Пользовательский URL не инициирует server outbound; manifest-only mapping; если маршрута нет — фиксируется отсутствующая поверхность |
| SEC-30 B,P | Burst downloads/login/checkout, shared-IP users, queue limits/budget alerts | Ограничения срабатывают без обхода simple ID change; легитимный retry доступен; ни flood email, ни unbounded queue/egress; threshold evidence |
| SEC-31 B,R | Самый тяжёлый допустимый RU/EN config, несколько viewport переключений, background tab и export at limit | Нет бесконечного resize/render; navigation/recovery работают, demo pause и packing bounds соблюдены |
| SEC-32 P | Восстановление пустого окружения из backup + replay ledger/reconcile provider | Grants/orders согласованы, отозванные покупки и релизы не восстановлены как active; подтверждены RPO/RTO |
| SEC-33 P | Удаление тестового аккаунта из primary/observability и последующий restore backup | Профиль удалён/псевдонимизирован по карте данных, минимальная законная запись отделена; tombstone применяется до открытия restored среды |
| SEC-34 P | Политика скачиваний и лицензии против реального demo behavior | Нет DRM/«защиты от копирования» обещаний; anti-abuse не ломает оплаченную повторную выдачу; спорная блокировка имеет путь поддержки |
| SEC-35 B,R | Проверить каждый font/image/icon/code/snippet dependency по provenance manifest | Указаны автор/источник/условия/дата/разрешение redistributable use; нет assets с неясными правами и лишними ограничениями |
| SEC-36 B,P | Учебный отзыв release и safe replacement, старый share link, прогретый CDN/browser cache, prior buyer за окном updates | Управляемые UI/registry прекращают предлагать и экспортировать релиз; private delivery отказывает; origin запрещает новую выдачу поражённых объектов, edge purge выполнен там, где поддерживается; UI не подменяет версию молча, safe patch доступен. Отдельно зафиксировано, что старые browser caches/копии публичных immutable Free assets могут оставаться доступными; их удаление не является критерием |
| SEC-37 B | Учебная утрата deploy credential/admin access | Отдельный recovery восстанавливает контроль, ключ отозван/заменён, независимая копия release evidence и домены доступны владельцу |
| SEC-38 P,R | RU/EN privacy/security/license/refund/login/error strings с одинаковой policy version | Нет взаимоисключающих условий; перевод проверен человеком; юридический язык и приоритет версии указан до checkout |

Для настоящего приложения позднее добавить SAST/SCA/secret scanning и ограниченный DAST выбранными инструментами. Успешный скан сам по себе не закрывает IDOR, payment race, entitlement logic, privacy canaries и ручное review. До появления кода нет результата этих проверок.

## 8. Условия выпуска

### 8.1. Бесплатная бета

- [ ] Назначены владельцы security/privacy/release и канал сообщения об уязвимости; указана рабочая зона времени поддержки.
- [ ] Нет лишних auth/payment/upload/remote import endpoints; scope соответствует §2.2.
- [ ] Все `B` и применимые `R` проверки завершены; открытых P0-B нет.
- [ ] Preview находится на отдельном site; production CSP/sandbox/messaging проверены в поддерживаемых браузерах.
- [ ] Локальный контекст и введённые тексты не попадают в сеть/SDK/logs; optional analytics перечислена в privacy notice RU/EN.
- [ ] Каждый бесплатный релиз имеет provenance/license/manifest, проверенный ZIP, dependency list и безопасный prompt.
- [ ] Есть резервная копия Git/release evidence, сценарий отката сайта и отзыв элемента; дежурный знает, как остановить выдачу.
- [ ] Публичные страницы не содержат заявлений «аудит пройден», «ASVS compliant», «абсолютно безопасно», «защищено от копирования», если соответствующих доказательств нет.

### 8.2. Платный запуск — дополнительно

- [ ] Решены юрисдикция продавца, допустимые рынки, merchant account, provider, договоры processors, hosting/data regions, налоги/квитанции/возвраты.
- [ ] Утверждены точный SKU snapshot, grants union, functional update window, security support line и safe replacement policy, включая время жизни сервиса/доступа.
- [ ] Пройдены все `P`, включая multi-user IDOR/cache, auth recovery, webhook гонки/повторы, refunds и overlapping purchases.
- [ ] В production выключены test keys/mode, merchant binding подтверждён, минимальная live transaction и согласованный возврат проходят по утверждённой процедуре до публичного включения оплаты.
- [ ] Hosted checkout не передаёт карточные данные в наши формы/логи; выбранный PCI/merchant scope оценён с провайдером.
- [ ] Есть независимая проверка критичных границ, дата/версия отчёта, закрыты critical/high exploitable findings; это отдельный будущий результат, не выполненная работа данного ТЗ.
- [ ] Backup restore и incident drill подтверждены; очередь платежей наблюдается; политика удаления данных реализована и проверена.
- [ ] Поддержка умеет найти order, инициировать reconciliation и refund; обход server authorization ручным `paid=true` запрещён.
- [ ] RU/EN terms/privacy/license/refunds связаны с версией, доступны до покупки; отдельное согласие на маркетинг, если он добавлен.

## 9. Приватность, сроки хранения и удаление

Сроки ниже — **техническое предложение**, не юридические сроки. До оплаты юрист/владелец должен привязать основания и сроки к стране продавца, целевым рынкам, processors и требованиям учёта. RU/EN интерфейс сам по себе не определяет применимость конкретного закона.

| Данные | Предлагаемый срок и действие | Доступ |
| --- | --- | --- |
| Контекст AI | Только память открытой страницы; без persistence и session replay | Только браузер пользователя |
| Конфигурация/избранное | Локально до очистки пользователем; автосохранение текста только явным opt-in | Только основной origin; clear local data в UI |
| Аккаунт/verified email | Пока аккаунт активен; удаление в рабочей БД целево ≤30 дней после подтверждённого запроса | Владелец + ограниченный support/auth |
| Session record | До absolute expiry/revocation; expired records purge ≤7 дней | Runtime/auth; support не видит token |
| Login/recovery tokens | До использования/expiry; хранить проверочное значение безопасным способом, purge ≤24 ч | Только auth |
| Security logs | 90 дней по умолчанию; отдельный incident hold документирован | Security/ops |
| Access/edge raw logs с IP | 14 дней; затем удалить или агрегировать без устойчивой идентификации | Ops; провайдерский retention также настроен |
| Product events | Необязательные pseudonymous raw events ≤30 дней; агрегаты до 12 месяцев с оценкой reidentification | Product analytics; без входного контента |
| Error events | ≤30 дней; без raw request body, headers/cookie, query/hash и user text | Разработчик/ops |
| Raw webhook | ≤30 дней; минимальные event IDs/type/status остаются в ledger по утверждённому сроку | Payment worker/finance по необходимости |
| Заказы/квитанции/лицензионный ledger | Срок определить по законодательству и договору; хранить минимум для учёта/прав, отдельно от профиля | Finance и минимальный authorization layer |
| Обращения поддержки | ≤180 дней после закрытия, если нет активного спора | Поддержка; запрос не должен содержать секреты |
| Encrypted DB backups | Скользящее окно 35 дней; удалённый профиль исчезает по истечении окна | Отдельный backup principal |

Это проектные сроки: до запуска составляется machine-readable retention inventory с actual provider settings и владельцем каждой purge job. Нельзя обещать «удаляем всё сразу», если backup и обязательный accounting ledger устроены иначе.

События allowlist: `item_open`, `preview_start`, `config_changed` с **именем группы**, `copy_success`, `bundle_download`, `integration_feedback` в ограниченном enum. Поля: event type, item ID/release, locale, public device class, outcome. Не отправлять config values, search/freeform feedback без отдельного согласованного endpoint, project path, prompt, clipboard, полный URL, order details в общий analytics. Email/account ID не использовать как analytics ID; fingerprinting/session replay/advertising SDK не входят в v1. Если analytics не нужна для беты, запускать без неё.

`checkout_started` и `order_confirmed` — исключительно события серверного commerce ledger с ограниченным доступом и соответствующими сроками хранения, не новые поля/события общего frontend analytics. Финансовая воронка строится по агрегатам этого ledger; frontend не подтверждает оплату и не пересылает туда личный контекст.

Security logging отдельно: request correlation ID, actor internal ID при необходимости, operation, object ID, allow/deny reason, timestamp, release/event ID, redacted error class. Запрещены пароли, raw session IDs/tokens, API keys, payment card data, личные тексты, полный prompt, signed URL query. Логи защищаются от изменения/инъекции переносов строк, экспорт ограничивается; audit высоких привилегий хранится отдельно. Принципы исключения секретов и защиты логов: [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

Deletion flow: свежий login → понятное описание последствий для восстановления покупок → подтверждённый запрос → revoke sessions → удалить/псевдонимизировать профиль и необязательную телеметрию → отдельно сохранить минимально обязательный учёт с ограниченным purpose/access → уведомить о выполнении и исключениях. Для удаления без доступа к email — проверяемая процедура поддержки; знание order ID не даёт права удалить чужой аккаунт. Экспорт своих данных доступен по аналогичной проверке личности. Доступ к купленному контенту после удаления аккаунта и возможность последующего восстановления должны быть определены в условиях до продажи.

Backups не редактируются хаотично для единичного удаления: шифрованное ограниченное окно, журнал удаления/tombstone, повторное применение tombstones **до** возврата восстановленного окружения в эксплуатацию. Тест SEC-33 это подтверждает. Маркетинговая подписка, если появится, отдельна от purchase/service notifications; переносная email-база не создаётся «на всякий случай».

## 10. Эксплуатация и реагирование

### 10.1. Наблюдаемость и восстановление

Мониторить: повышенный auth failure/401/403, download deny/egress всплеск, несовпадение release hash, неожиданный runtime outbound, CSP нарушения, invalid webhook signature, queue lag/dead-letter, reconciliation mismatch, publish/admin changes, backup/purge failures. CSP reports предварительно очищать от чувствительных URLs; не собирать samples с пользовательским контентом. Не слать каждое отклонённое сообщение владельцу: нужны пороги и агрегирование, чтобы атака не создавала alert flood.

До платного старта: зашифрованный daily snapshot + continuous/WAL recovery, если поддерживает выбранная БД. **Проектные цели** RPO ≤1 ч и RTO ≤8 ч для учётных данных, а не объявленный SLA; подтверждаются restore drill. Git/объекты релизов имеют отдельную восстанавливаемую копию, данные payment provider используются для reconciliation, но не заменяют entitlement snapshots. Бета: возможность восстановить каталог из Git и уже собранных артефактов, целевая RTO ≤1 рабочего дня. Ограничения провайдера/стоимости записать после выбора хостинга.

Restore не откатывает безопасность назад: применить revoke registry, event ledger и tombstones; сменить credentials при подозрении на утечку; открыть запись checkout только после восстановления согласованности. Отказ БД/authorization должен закрывать платную выдачу, а не включать временное `allow all`. Public-каталог может оставаться доступен независимо.

### 10.2. Отзыв и исправление релиза

Релиз имеет статус `published`, `deprecated`, `revoked`; изменение статуса журналируется вне неизменяемого content artifact. При revoked: запретить новую выдачу через private endpoints и управляемые UI/registry, отключить поражённое preview в интерфейсе и на origin, запретить origin-выдачу затронутых объектов, инициировать/проверить purge управляемого edge там, где он поддерживается; показать причину/дату/затронутую версию и безопасный путь. Старый share link показывает уведомление; никаких молчаливых подмен исходников.

Граница отзыва Public/Free явная: опубликованный ZIP имеет долгий `public,max-age=31536000,immutable` cache. Браузер, ранее получивший его, может продолжать отдавать байты без запроса к нашему серверу; скопированные URL/assets и сторонние caches также вне контроля. Purge нашего edge и блокировка origin не удаляют эти копии и не доказывают глобальное прекращение распространения. Registry/актуальный интерфейс больше не предлагают опасный релиз; уже публично выданные байты технически отозвать нельзя. Для Public demo действует та же граница кэшированных bytes. Это согласуется с отсутствием DRM и обещаний удалять код с чужого устройства. Пользователям сообщаются риск и инструкция обновления.

Safe replacement связан с исходным item/release через `SecurityRemediation`; скачивание такого patch не требует продления functional updates, если у пользователя есть действительное основание владения item. Изменение дизайна/API сверх необходимого исправления оформляется отдельно. Рабочая политика из product/engineering: security support минимум 24 месяца от первого платного релиза ветки, предупреждение EOL за 90 дней; окончательный срок и даты отражаются в offer/registry до продажи. Это предложение, не бессрочная поддержка всех исторических веток. При отзыве EOL-линии назначается безопасная замена/миграция и соответствующее дополнительное право. Обновление чужого проекта автоматически не выполняется.

Для коммерческой версии есть минимальная история grants/downloaded release IDs, если это необходимо для адресного security notice; её назначение/срок описаны в privacy inventory. Нельзя скрыто добавлять telemetry в код покупателя ради оповещений. Бесплатным пользователям без email доступна публичная security advisory/release page.

### 10.3. Целевые сроки обработки инцидентов

Это **предлагаемые внутренние цели после назначения ответственного**, не гарантированный 24/7 SLA и не нормативные сроки уведомления. Начало отсчёта для acknowledgement — фактическое получение дежурным/монитором; рабочего времени — явно опубликованный график с timezone. Для paid нужно решить, кто покрывает часы вне этого графика, до обещаний клиентам.

| Severity | Пример | Acknowledge / containment target | Цель исправления |
| --- | --- | --- | --- |
| Critical | Активная массовая выдача заражённого кода, prod key leak, обход всех покупок/аккаунтов | При обнаружении: автоостановка affected release/checkout по runbook; человек ≤1 ч в режиме дежурства; containment ≤4 ч после подтверждения | Проверенный patch или отключение уязвимой функции ≤24 ч; если невозможно — закрытая функция и публичный статус |
| High | Exploitable XSS/IDOR отдельного пути, account takeover, payment state corruption | ≤4 рабочих ч; containment ≤1 рабочего дня | Цель ≤3 рабочих дней либо временное отключение поражённого пути |
| Medium | Ограниченная утечка нечувствительной metadata/abuse bypass без захвата | ≤2 рабочих дней | Цель ≤14 календарных дней |
| Low | Hardening/низкий остаточный риск | ≤5 рабочих дней | Следующий плановый цикл, целево ≤30 календарных дней |

Advisory triage зависимостей — каждый рабочий день и перед каждым релизом; critical exploited dependency обрабатывается как инцидент, а не ждёт планового обновления. Severity зависит от применимости в продукте и экспортах, а не только от числа CVSS. Соответствие регуляторным срокам уведомления оценивается отдельно по применимой юрисдикции.

Runbook: зафиксировать время/границу/версию → остановить распространение → сохранить ограниченные evidence без лишних PII → отозвать credentials/sessions при необходимости → определить пользователей/артефакты → проверить минимальный patch в Next/Vite и все связанные exports/prompts → выпустить новую версию и notice RU/EN → сверить покупки/очереди → разобрать причину, обновить risk/контроли. Security contact должен поддерживать приватную передачу деталей; публичный issue tracker не использовать для публикации активных секретов. Наличие контакта не означает разрешение сканировать чужие среды.

## 11. Происхождение контента и юридические вопросы до коммерческого запуска

Самостоятельность идеи не равна праву копировать конкретные исходники, иллюстрации, тексты, название, композиции или лицензируемые ресурсы. Это практическое требование к разработке; документ не устанавливает юридическую оценку сходства с референсом и не гарантирует отсутствие претензий.

Для каждого item вести `PROVENANCE`: собственный замысел/автор/дата; список разнородных исследованных референсов; происхождение кода; exact dependency licenses; источник/лицензия/дата скачивания шрифта, иконки, медиа; допустимость показа, модификации и передачи в составе исходников; обязательные notices; reviewer. «Разрешено на сайте» не автоматически означает «разрешено включать в ZIP для дальнейшего распространения». Demo assets, которые нельзя передавать, не включать в обещанный полный export; использовать собственные или подходящие ресурсы с самого начала. Код и ассеты из конкурирующей платной библиотеки не становятся оригинальными от смены имени/цвета.

Юридические решения **открыты**, у каждого нужен владелец и срок до checkout:

- Страна/форма продавца, стороны договора, целевые/исключённые рынки, платёжные ограничения и обязательные данные покупателя.
- Какие privacy/data-transfer/localization/cookie требования применимы с учётом фактических клиентов и processors; местонахождение hosting/auth/logging/backups и договоры с ними. RU/EN язык не даёт достаточного ответа.
- Рабочая лицензия: собственные/клиентские конечные проекты, unlimited projects или лимит, seats/team usage, агентства, SaaS redistribution, публикация исходников клиентом, запрет перепродажи набора; права на prompt и media отдельно.
- Что происходит с уже скачанной версией после refund/chargeback, account deletion, закрытия сервиса; разграничение лицензии на использование и доступа к новым скачиваниям. Техническая система не должна делать юридические выводы за договор.
- Как фиксируются согласие с условиями, язык/версия договора, квитанция, taxes и refund policy для цифрового контента.
- Условия functional/security updates, поддерживаемые линии, дата/порядок прекращения поддержки и ожидания по доступности сервиса.
- Процедура copyright/licensing complaint, приостановка спорного элемента, уведомление владельцев и замена без потери легальных покупок.

Ни один из этих вопросов не мешает подготовить дизайн/верстку/контент и бесплатный авторский пилот. Включение live checkout требует закрыть применимые вопросы, а не поставить универсальный disclaimer.

## 12. Порядок реализации ИБ

1. **До первого сквозного hero:** schema/serializer, preview domain/protocol, source viewer, manifest/hash/provenance, CI без секретов, telemetry canary. Это дешевле встроить в основу, чем разделять origins и переписывать экспорты позднее.
2. **До бесплатной беты:** все B/R проверки, RU/EN privacy disclosure, безопасные ZIP/prompts, release revoke/rollback, security contact и наблюдаемость.
3. **До разработки checkout:** merchant/provider/auth ADR, grant model и матрица прав, snapshots/security replacement, retention inventory, private stream/no-store architecture.
4. **До первой оплаты:** полный P gate, independent critical-boundary review, sandbox→live verification, backup restore, payment/incident drills, юридические решения своего рынка.
5. **После запуска:** review каждого релиза, ежедневный advisory triage в рабочие дни, наблюдение платежных расхождений, регулярная проверка доступа и monthly restore drill в первые 3 месяца; затем частота по измеренным рискам, но не реже квартала.

Документ считается пригодным для реализации после согласования архитектурных ADR и назначения владельцев, а защищённость продукта — только после реализации, проверок и сохранения evidence. Пока это подробное проектное ТЗ.
