# Инженерные решения, контракты и ИБ v1.0

**Обновление языковой политики:** EN — основной, RU и VI — дополнительные. [Требования от 22 октября 2026](locale-and-copy-update.ru.md) заменяют прежний срез RU/EN ниже; прежние отчёты и planned fixtures не означают готовность трёхъязычного выпуска.

Дата: 21 октября 2026. Статус: согласованная постановка для разработки; проверки продукта ещё не выполнены. Локальный React/Vite-прототип доказывает только перечисленные в его отчёте сценарии. JSON Schema и тесты контрактов в этой папке проверяют постановку, а не подтверждают безопасность, совместимость или готовность каталога.

## 1. Принятые решения и границы

| Область | Решение v1.0 |
| --- | --- |
| Состав | 32 уникальных ID: 12 секций S, 8 компонентов C, 4 эффекта E, 8 рецептов A. Free 9, Pro 23. Раздел «Анимации»: 4 E + 8 A = 12 записей, из них 4 Free и 8 Pro; это подмножество общего каталога. |
| Основной сайт | Next.js App Router + React + TypeScript, модульный монолит. Каталог/документация статичны или кешируемы; commerce/delivery — server-only. |
| Переносимые материалы | React + TypeScript + CSS Modules; native CSS и Web Animations API. Канонические исходники без Next/Vite imports, env, path aliases и глобального reset. Шрифт наследуется. Нет обязательного motion runtime, CDN-скрипта, телеметрии или SDK сервиса в выданном коде. |
| Контент | Git/review/release pipeline, конкретная schema каждого itemVersion. Произвольный JS/HTML/CSS, пользовательские uploads и удалённые imports в Studio отсутствуют. |
| Экспорт | Один item за раз, все обязательные helpers и ресурсы внутри комплекта. Генерация config/Example/ZIP/prompt локально из одной разрешённой версии. Многотоварная покупка даёт права на отдельные комплекты; batch ZIP не входит в v1. |
| Preview | Отдельный registrable domain/site, cookie-free, статическая сборка. Локальный односайтовый Vite-прототип — явное исключение для разработки; не подтверждение production isolation. |
| Auth | Для бесплатного запуска не нужны аккаунты. Для коммерческого этапа — адаптер hosted OIDC либо verified passwordless provider, без собственных паролей. Конкретный провайдер выбирается после проверки доступности во Вьетнаме и требований продавца. |
| Учёт прав | PostgreSQL, server-side opaque sessions, transactional payment inbox/order/grants/audit, объектное private storage. Без микросервисов и отдельного брокера очередей на v1. |
| Продавец и commerce | Страна продавца — Вьетнам, подтверждена пользователем. Entity, банк, eligibility/onboarding и провайдер ещё требуют фактов. `payment_enabled=false` по умолчанию; коммерческие ключи не создаются заглушками. |
| AI | Два локальных шаблона preserve/adapt на RU/EN. Сервис не вызывает LLM и не получает доступ к проекту пользователя. |

Схемы в [contracts](contracts/) имеют dialect JSON Schema 2020-12 и фиксированные идентификаторы в зарезервированном `.invalid`: это локальные ID, не сетевой сервис. Все известные объекты запрещают неизвестные поля. Валидатор загружает только локально зарегистрированные схемы, не делает fetch по `$ref` из пользовательского ввода. При композиции схем закрытие полей выполняется на уровне соответствующего объекта; этого не обеспечивает одно перечисление `properties`. [JSON Schema: object](https://json-schema.org/understanding-json-schema/reference/object), [JSON Schema 2020-12 Core](https://json-schema.org/draft/2020-12/json-schema-core).

ADR-01: CSS Modules выбран для копирования в существующий проект без настройки CSS-фреймворка. Tailwind-проект совместим как host, отдельный Tailwind export отсутствует. ADR-02: native CSS/WAAPI вместо дополнительного runtime для объявленного набора; изменение требует измерения размера и ADR. ADR-03: vendor-neutral auth adapter до подтверждения продавца, а не самостоятельная реализация паролей/магических ссылок. ADR-04: authenticated private streaming вместо постоянных Pro URLs. ADR-05: один backend deployment с логическими границами, отдельным preview site и SQL inbox.

Референсы технического решения уже изучены в предыдущем ТЗ: [Next Server/Client boundary](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next CSS Modules](https://nextjs.org/docs/app/getting-started/css), [Vite features](https://vite.dev/guide/features), [WAAPI](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate), [React cleanup](https://react.dev/reference/react/useEffect). Версии ниже отдельно проверены по registry родительской задачей 21.10.2026; это выбор для lockfiles, без утверждения совместимости до сборок.

### 1.1. Зафиксированная стартовая матрица зависимостей

Node 24.19.0, npm 11.17.0, React/React DOM 19.3.1, TypeScript 7.0.2; Vite 8.3.5 и `@vitejs/plugin-react` 6.1.2 — локальный fixture. Production/второй target: Next.js 16.4.2. Все exact версии фиксируются в package manifests и lockfiles; их фактические resolve/build результаты записываются в отдельный report. Кандидатный peer range `>=19.3.1 <20` в planned fixture не означает проверки каждой minor/patch. Node LTS/engine совместимость и React framework integration — обязательная проверка перед первым публикуемым релизом. Изменение версии требует обновить lockfile и relevant cases, не переписывать старые отчёты.

## 2. Источники истины и контракты

| Файл | Что задаёт |
| --- | --- |
| [A001.config.schema.json](contracts/A001.config.schema.json) | Конкретный allowlist Studio для первого сквозного рецепта. |
| [A001.share-envelope.schema.json](contracts/A001.share-envelope.schema.json) | Конкретная appearance projection A001; locale берётся из пути/defaults, runtime state и тексты отсутствуют. |
| [item-manifest.schema.json](contracts/item-manifest.schema.json) | Полный author/bundle manifest, файлы, зависимости, entry, config schema, animation contract, verification. Для Pro — закрытая сущность. |
| [item-release.schema.json](contracts/item-release.schema.json) | Registry состояний planned/review/verified/published/deprecated/revoked и фактов проверки. |
| [offer-revision.schema.json](contracts/offer-revision.schema.json) | Immutable snapshot платного оффера, уникальный набор ID, currency/amount, договоры и update policy. |
| [public-item.schema.json](contracts/public-item.schema.json) | Закрытый allowlist публичной metadata. Нет файлов, source, private keys, prompt body или данных покупателя. |
| [private-artifact-index.schema.json](contracts/private-artifact-index.schema.json) | Server-only storage mapping; без включения в HTML/RSC/search/client assets. |
| [A001.manifest.planned.json](contracts/A001.manifest.planned.json), [A001.release.planned.json](contracts/A001.release.planned.json) | Валидные planned fixtures: null digest/размеры/report, пустая матрица. Не опубликованные материалы, не результаты QA. |

Не объявлять универсальную schema конфигураций 32 элементов по списку названий props. Перед публикацией каждого ID нужен конкретный `config.schema.json` с ограничениями всех вложенных полей, defaults RU/EN, projection schema и полноценные positive/negative fixtures. Наличие A001 schema закрывает пример формата и задачу сквозного прототипа; не завершает 31 другую schema.

Отдельные версии: schemaVersion, itemVersion, configSchemaVersion, exporterVersion, offerRevision. ID стабилен, slug может иметь redirect, locale не меняет покупку. Изменение source, поставляемых инструкций, prompt или defaults требует нового itemVersion. Опубликованные bytes неизменяемы. Статус/notice/ссылка на replacement живут в registry и журнале отдельно от bytes. Latest — указатель, в share и export закрепляются явные версии.

JSON Schema проверяет форму, но не истину свидетельств и внешние отношения. Семантический gate отдельно проверяет: уникальность `files[].path` и ID зависимостей, отсутствие path traversal/symlinks/запрещённых нормализаций, присутствие entry/schema/helpers в реальных файлах, SHA-256 конечных bytes, пределы суммарных размеров, равенство item/version/digest между manifest/release/preview/report, существование report, coverage обеих сред и обеих локалей, даты поддержки, currency exponent по утверждённым metadata и точный union коммерческого состава. Нулевой digest запрещён схемой; правдоподобная строка хеша сама по себе не доказывает наличие файла.

Для publication registry требует `verification=passed`, непустой реальный report, обе React среды с exit code 0 и реальные digests. Review/build candidate может иметь failed проверки; UI не показывает verified badge. Пример с fabricated 64 hex/reportId не допускается в релизное evidence.

## 3. Сквозной A001 State Relay

Скрипт — локальный hook/controller; он отображает внешнее состояние операции. Он не создаёт успех таймером и не подменяет бизнес-действие. UI состояния: `idle`, `pending`, `success`, `error`. Финитный контракт управления:

| Вход/событие host | Переход и правило |
| --- | --- |
| Новая операция с requestId | idle/success/error → pending. Host создаёт новый monotonically increasing token либо AbortController и инвалидирует прошлый результат. |
| Promise fulfilled для актуального requestId | pending → success. Для copy это только фактический resolve `clipboard.writeText`; разрешения/secure context проверяются по реальному API. |
| Promise rejected для актуального requestId | pending → error, понятное сообщение и доступный повтор. Не показывать success при отказе clipboard. |
| Поздний result прошлого requestId | Игнорируется host; не меняет более новую success/error/pending. |
| Reset/cancel | Любое → idle, pending операция отменяется/инвалидируется host; controller не обещает отменить чужую business operation. |
| Новый внешний state во время motion | Предыдущее движение отменяется, показывается актуальное состояние; нет очереди transitions. |
| destroy/unmount | Освободить только свои Animation/listener/observer/RAF; игнорировать поздние callbacks и отменённый `Animation.finished`. |

Фактический кодовый API прототипа: createStateRelay() возвращает begin(message), settle(ticket,outcome,message), run(operation,messages), reset/cancel, destroy и snapshot/subscribe. Host передаёт реальную operation либо settle актуального ticket; controller выдаёт state/statusMessage/requestId. useStateRelay() подписывает React на snapshot и отменяет pending при cleanup. StateRelayDemo принимает locale/motion/accent/duration и сам подключает Clipboard host. Отдельного setState в этом API нет. Для production внешний бизнес-state можно отобразить через host adapter, не добавляя его в Studio config. Root/ref локален, глобальный поиск по пользовательскому selector отсутствует. Native button и `role=status` в полном Example; aria-live обновляет host при реальном результате, визуальные дубли помечены aria-hidden. Нативный click/keyboard/touch одинаковы; focus остаётся на действии. Motion не задерживает выполнение callback, переход, сообщение или освобождение disabled. Во время pending повторный запуск либо честно блокируется host, либо замещает предыдущее действие с токеном; выбранная политика указана в Example.

Studio/export config A001: `locale=ru|en`, `motion=off|subtle|expressive`, `accent=#RRGGBB`; optional `duration` 0–480 ms, без override Off=0/Subtle=120/Expressive=180 ms. `state`, `label`, `statusMessage` — внешний runtime API, не сериализуемые поля Studio. Это уточняет предварительный v0.3 список по контракту первого сквозного прототипа. Прямой выбор примера state допустим только в явно помеченном демонстрационном управлении, не доказательстве выполнения операции. Рабочая кнопка демо должна использовать реальную локальную операцию; тестовый «пример ошибки» явно маркируется как симуляция. Системный reduced motion и Off исключают travel/scale/rotation/декоративный spinner, сохраняя текст реального pending. Анимация состояния не меняет ширину кнопки, primary target остаётся неподвижным. Отсутствие WAAPI → мгновенная смена допустимого состояния.

A001 proof требует: полный исходник/стили, полный Example Next и Vite, рабочий config roundtrip, оба prompt mode на RU/EN, INSTALL/INTEGRATE/README RU/EN, разрешённые лицензией notices, действительную упаковку и интеграционные проверки. Наличие design-preview на Vite закрывает только design-preview.

## 4. Настройки, ссылки, AI и экспорт

Настройки хранятся в памяти браузера. Config ≤16 KiB UTF-8; до 30 элементов в списке, до 2 000 символов поля, до 2 048 символов URL, а конкретные schemas могут ужесточать. Callback/ReactNode/children/ref/JS/CSS fragments не JSON поля. Text используется как plain text, цвета — strict hex; URL проверяются нормализованным parser/allowlist, с отказом `javascript:`, `data:`, protocol-relative и control chars. Разрешены https, безопасный относительный путь/anchor; mailto/tel только в полях, которые это явно объявляют. Studio не делает server fetch по ссылке. Медиа выбираются только из bundled preset IDs.

Невалидный черновик остаётся в поле с ошибкой; preview показывает последнее валидное состояние. Export/copy нельзя создавать из невалидного текущего черновика без явного возврата к последнему валидному config. Example импортирует безопасно сериализованный JSON; авторский TSX не редактируется поиском/заменой пользовательской строки. Namespace item/version, local CSS variables и scoped IDs допускают несколько items рядом; недостающие helpers не заменяются runtime зависимостью от сервиса.

Share: `/{locale}/library/{slug}?version={itemVersion}#config={base64url}`. Envelope содержит только schema/item/config versions, shareMode и конкретную projection. Appearance A001 разрешает только duration/motion/accent, без locale/label/statusMessage/state. Текста в A001 config нет, режим content-and-appearance для него не нужен. Для текстовых items отдельная projection schema и явная опция «Включить текст» с объяснением публичности разрешают content-and-appearance. Share не передаёт лицензию; Pro source отдельно требует прав. После decoding ≤16 KiB, URL для copy ≤6 KiB; более длинный config скачивается файлом. Перед iframe — валидация, проверка версии, merge projection с immutable locale defaults и повторная полная валидация. Некорректный fragment → ошибка/сброс, не guessed migration. Старый revoked release → notice/replacement с явным переходом пользователя.

Контекст проекта для AI — opt-in текстовое поле, по умолчанию пусто и свернуто. Запись только в память; перед добавлением в clipboard/ZIP пользователь видит, что включит его. Никогда не попадает в share, URL, server requests, аналитику, localStorage и auto-save. Нет доступа к clipboard на чтение, repo, env или модельным ключам. User context и исходники отделены от авторских инструкций как данные; это не гарантия защиты внешнего агента от prompt injection. Авторские шаблоны не требуют upload проекта/секретов и не обновляют пакеты до latest.

### 4.1. Самодостаточный ZIP

На каждый релиз/выбранный target ZIP содержит `src/*`, полные local helpers, CSS Modules, `Example.tsx`, `config.json`, конкретный `config.schema.json`, `manifest.json`, `base-bundle.index.json`, `checksums.json`, README/INSTALL/INTEGRATE RU/EN, preserve/adapt prompt templates и итоговый prompt выбранного mode/locale, LICENSE, THIRD_PARTY_NOTICES, нужные bundled assets. Секциям без отдельного motion hook не добавляется фиктивный скрипт. Для animation/effect manifest явно указывает animationEntry, markup/trigger/state/interruption/focus/cleanup/reduced-motion policy и только реализованные capabilities.

Базовый bundle неизменяемый, итоговый ZIP добавляет текущий config и target Example. Base index хранит digest manifest/source; manifest не хеширует себя. `checksums.json` хранит SHA-256 всех конечных payload файлов кроме себя, target/configDigest/exporterVersion, base source/bundle digests; не создаётся циклический self-hash. Verify сверяет набор paths и hashes, отсутствие лишних/missing файлов и безопасность extraction. Нельзя называть checksum DRM или цифровой подписью. Настройки/target/prompt из одного snapshot; локальный ZIP не должен включать только один TSX с отсутствующим CSS/import.

Пределы одного item: ≤200 payload файлов, ≤20 MiB распакованного, ≤5 MiB файл, ≤5 MiB сжатый base bundle. ZIP generation не исполняет пакетные install hooks. UTF-8/names/newline policy и фиксированные archive timestamps задаются exporterVersion для детерминизма. Копирование >100 KiB текста предлагает ZIP + короткий attachment prompt, без молчаливого обрезания. Clipboard success определяется фактическим API, при отказе доступны выделение текста и скачивание.

Portable source не знает deployment base. Bundled assets копируются в `public/library/{itemId}/{itemVersion}/`, имена не перезаписывают чужие файлы. Vite Example учитывает `import.meta.env.BASE_URL`, Next Example принимает explicit publicBasePath с учётом проекта. Asset width/height/alt присутствуют; обязательные helpers локальны. Source не делает автоматический сетевой запрос сервиса после интеграции.

## 5. Изоляция preview и границы публичного/закрытого

Production main и preview используют разные registrable domains, HTTPS и отдельные deployment credentials. `preview.main.example` рядом с `app.main.example` не удовлетворяет этому требованию. Preview cookie-free, без аккаунта, покупок, project context, auth tokens и private storage credentials. Sandbox собственного cross-origin iframe: `allow-scripts allow-same-origin`; без forms/popups/top-navigation/downloads/camera/microphone/geolocation. Same-origin с parent не допускается. [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Bridge envelope: protocolVersion/channelId/requestId/type/itemId/itemVersion/payload. Только READY, APPLY_CONFIG, APPLIED, RESIZE, REPLAY, PAUSE, ERROR. Parent проверяет точный origin и `event.source===iframe.contentWindow`, child — origin parent и `event.source===parent`; конкретный targetOrigin, без wildcard. Nonce случайный на mount и не заменяет entitlement. Payload ≤16 KiB, размер/frequency limited, config — по конкретной schema; никаких HTML, selectors, functions и URL commands. APPLIED подтверждает актуальный requestId, иначе stale state не считается показанным. Ready timeout 10 s, apply 5 s; ошибка ведёт к poster/retry. RESIZE 120–2400px внутри контейнера. [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

Одно активное demo в каталоге, одно на detail. Offscreen/document.hidden/PAUSE останавливают декоративные loops; системный reduced motion имеет приоритет. Для непрерывных декоративных E/S pause control входит и в переносимый export, а не только в наш сайт. Preview security policy действует также при прямом открытии URL. CSP и Permissions-Policy задаются отдельными allowlists; main `frame-src` только preview, preview `frame-ancestors` только main; прочий default deny, без unsafe-eval. Хеши/nonces нужны реальной Next сборке, а не выдуманный общий CSP header, который ломает framework scripts. До выпуска проверяются фактические response headers и CSP console/report без user data.

Capability A001: в production iframe Clipboard — отдельная allowlist-возможность, разрешённая только опубликованному A001 и точному preview origin через parent Permissions-Policy и iframe allow="clipboard-write". Secure context и реальное нажатие обязательны. Никаких clipboard-read, camera, microphone, geolocation. Остальные preview не получают clipboard-write. Реальные браузеры могут потребовать разрешение/не поддержать операцию: пример показывает error и ручной способ копирования, success только после resolve. Проверить parent/iframe policy и отказ отдельно в Chromium/WebKit/Firefox; локальный single-origin прототип этого gate не закрывает. Если deployment policy запрещает Clipboard полностью, A001 preview использует явно обозначенное локальное host-действие с фактическим результатом и обновлённым evidence; нельзя имитировать Clipboard success. [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API).

Публичны metadata/posters и JS демо. Pro source, helpers, готовые prompts с кодом и закрытый index не импортируются в клиентский граф Next, HTML/RSC, preload/prefetch, search/sitemap, static JSON или source maps. Public Pro demo JS можно исследовать: защита удобного исходного комплекта и лицензии не означает невозможность восстановления JS. Sourcemaps private preview отсутствуют; publisher public allowlist строит отдельный artifact, а не удаляет поля из случайного полного объекта в UI.

Leak gate: canary строка только в закрытом исходнике/шаблоне → сборка public web/preview → поиск во всех HTML/JS/JSON/RSC/maps/manifests и network trace anonymous → отказ публикации при утечке закрытого canary/private path/token. Демо содержит только утверждённый compiled runtime, отдельно проверяется лицензия assets; невозможность скрыть визуальную идею или уже загруженный demo JS не обозначается как утечка авторизованного private bundle.

## 6. Auth, права, оплата и отзыв

Сессия opaque server-side, cookie `__Host-*; Secure; HttpOnly; SameSite=Lax`, без Domain. Устанавливается только после verified provider identity; email из формы/return URL не ключ права. Provider tokens — только server adapter; session rotation после login, revoke при logout/current/all-devices/deletion, TTL и idle policy фиксируются до paid fixture. Browser tokens не localStorage. Все unsafe cookie-auth actions — CSRF + exact Origin, GET не меняет состояние. Auth callback проверяет state/nonce, PKCE где применимо, single-use/TTL для passwordless; return paths только local allowlist. Reauth для удаления/экспорта учётных данных. Административные действия — отдельная роль с phishing-resistant MFA и audit; публичная admin UI в v1 не нужна. [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

OfferRevision сохраняет exact itemIds snapshot и ссылки на утверждённые terms/license/tax/refund policies. Все itemIds уникальны; Bundle — union четырёх Pro packs, 23 ID, а не сумма 26 с повторными E. Launch price гипотезы: $29 каждый pack, включая Motion, $79 expanded Bundle; это не live offers. Free авторский код — MIT, Pro draft — собственные/клиентские конечные проекты; voluntary refund 14 дней с приоритетом закона/MoR; first support reply target 2 рабочих дня по времени Вьетнама, без SLA. Финальные документы и processor approval обязательны до checkout. Прежний snapshot 18 не получает новые A молча. Права не зависят от страницы/языка/категории. Ownership overlap показывается до оплаты. Утверждённый launch алгоритм: полную цену оффера распределяем в minor units по отсортированным unique itemIds — quotient каждому и +1 первым remainder ID. Уже owned eligible ID исключаются; quote равен сумме allocations только missing ID. Новый grant содержит только оплаченные missing ID, полный offer snapshot хранится отдельно. При missing=0 оплаты нет, показывается существующий download; нулевая сумма не создаёт grant новых A. Нет cash credits, зачёта исторически потраченных сумм и зависимых заказов. Refund прежней покупки может отозвать её ID, но не затрагивает оплаченные missing ID нового заказа. Eligible ownership проверяется сервером на актуальные релизы и действительные grants; expired функциональное окно не превращается молча в бесплатный renewal, нужен отдельный утверждённый renewal SKU. Цена/налог/валюта из клиента не принимаются.

Grant создаётся только при подтверждённом paid и содержит missingIds оплаченного quote. Покрытие: исходные релизы этих itemIds на момент оплаты + функциональные релизы тех же ID, опубликованные раньше exclusive `updatesEnd`. Окно — 12 календарных месяцев UTC от подтверждённого paidAt; end-of-month/leap-year clamp единый в backend/quote/UI. Истёкшее окно не убирает ранее покрытые версии, пока работает сервис. Покупка/renewal не подписка: нет автоматического списания. Manual renewal до истечения продлевает от updatesEnd, после — от нового paidAt; текущие версии тех же IDs включаются по явному quote. Если renewal SKU не утверждён, endpoint не активен.

Effective access — union всех действительных grants; отзыв/refund одного order line не снимает право от другого. Refund revokes связанный grant по утверждённой line policy, partial refund требует explicit allocation, disputed status не равен окончательному chargeback. Политика временного доступа при dispute определяется до live payments и сохраняется в termsRevision. Право использования уже выданного кода отделено от нового download и регулируется договором; сервер не удаляет файлы у клиента.

Security remediation к уже принадлежащему item доступна вне functional window. Поддержка линии: минимум 24 месяца от первого платного выпуска, EOL notice за 90 дней; dates фиксируются в registry/terms. Если старую линию нужно отозвать после EOL, назначаются safe replacement/minimal patch и дополнительное право для прежних владельцев. Замена не выдаёт всю новую коллекцию автоматически и не меняет существующий проект пользователя.

### 6.1. Checkout/webhook: точные правила

1. Сервер создаёт quote с userId, offerRevision, полным itemIds snapshot, sorted missingIds, allocation per ID, integer minor amount, currency/exponent, tax/total и expiration 15 минут. Quote один раз привязан к order; exact TTL виден пользователю. Если сумма/состав/offering поменялись — `409 OFFER_CHANGED`, пользователь видит обновлённый quote перед продолжением.
2. Checkout принимает только quoteId/locale и Idempotency-Key; связывает merchant/mode/order/user/currency/amount на сервере. Повтор того же ключа и payload возвращает тот же результат, другой payload — `409 IDEMPOTENCY_CONFLICT`. Return URL показывает «Проверяем оплату», не выставляет paid.
3. Webhook получает raw body с пределом размера до parsing; проверяет provider signature/replay window и merchant/account/mode. Invalid signature → 400/401; не включает body/секрет в ответ/лог. Provider adapter обязан иметь конкретный signature test fixture.
4. После проверки событие durable записывается в SQL inbox с unique `(provider,eventId)` и payload digest. 2xx только после durable receipt; DB outage → retryable 5xx, без фиктивного ack. Duplicate валиден, возвращает 2xx без второго grant. Webhook не требует browser CSRF и не проходит CAPTCHA.
5. Worker проверяет order identity/сумму/валюту/merchant и актуальное provider state/version. Order+grant+event transition — одна транзакция. Stale/out-of-order event не откатывает paid/refunded состояние; при неоднозначности нужен provider API reconcile. Ошибки уходят в ограниченный retry/dead-letter с audit replay, без ручного `paid=true`.
6. Начальная reconciliation: каждые 15 минут для pending/error последних 24h и daily для изменённых покупок в доступном окне провайдера. До live stage проверить API limits, лаг, retry, refund/dispute сценарии, loss/replay и восстановление после outage. Нет отдельного message broker до доказанной нагрузки.

### 6.2. HTTP API

API без locale prefix. Где нужна локализованная metadata — `locale=ru|en`, часть cache key. Error envelope `{error:{code,requestId,retryable,details}}`, details содержит только allowlisted item/version, без config/source/чужих order IDs. Общие коды: 400 INVALID_INPUT, 401 UNAUTHENTICATED, 403 RELEASE_NOT_COVERED, 404 NOT_FOUND, 409 OFFER_CHANGED/QUOTE_EXPIRED/IDEMPOTENCY_CONFLICT, 410 RELEASE_REVOKED, 413 PAYLOAD_TOO_LARGE, 429 RATE_LIMITED с Retry-After, 503 TEMPORARILY_UNAVAILABLE/COMMERCE_DISABLED. 500 — только безопасная ошибка и requestId.

| Endpoint | Авторизация и результат | Cache/error особенности |
| --- | --- | --- |
| GET `/api/v1/catalog?locale=ru` | Public-item projection + публичные offer summaries. | `public,max-age=60,s-maxage=300`, ETag. Никаких private indexes. |
| GET `/api/v1/items/{id}/releases/{version}?locale=ru` | Public projection/status/compatibility summary. | Public TTL 60/300; 404 unknown, revoked виден как status. |
| GET `/api/v1/release-status/{id}/{version}` | Публичный актуальный статус/notice/replacement. | `max-age=0,s-maxage=30`, emergency purge. Не authority для private issuance. |
| GET `/assets/free/{id}/{version}/{digest}.zip` | Публичный immutable Free base bundle. | `max-age=31536000,immutable`, byte digest. Для отозванного origin блокирует новое получение, cache boundary ниже. |
| GET `/api/v1/items/{id}/releases/{version}/bundle` | Free redirect только для опубликованного safe release; Pro verified session + effective grant coverage + current release status. | Pro `private,no-store`, streaming ≤5MiB, 401/403/410/429/503, без общего CDN/SW. |
| GET `/api/v1/me`, `/api/v1/me/entitlements` | Текущий владелец: профиль/список grants и covered releases. | `private,no-store`, 401; loading/error не трактуется как отсутствие покупки. |
| GET `/api/v1/me/orders/{orderId}` | Только владелец, snapshot/итоговый статус. | `private,no-store`, чужой/unknown →404. |
| POST `/api/v1/checkout-quotes` | Session+CSRF+Origin, server quote. | `private,no-store`; default 503 COMMERCE_DISABLED до readiness. |
| POST `/api/v1/checkout-sessions` | Session+CSRF+Origin+idempotency, quote принадлежит user и не истёк. | `private,no-store`; 400/401/409/429/503. |
| POST `/api/v1/payment/webhooks/{provider}` | Нет user session; verified raw signature/merchant/mode + durable receipt. | no-store; 2xx durable, 4xx invalid, 5xx transient storage. Не включать пока adapter не настроен. |
| POST `/api/v1/auth/{action}` | Provider-specific request/callback/logout; logout CSRF+Origin. | no-store, throttling, constant generic login response. |
| POST `/api/v1/me/data-exports` | Fresh reauth+CSRF+Origin, request своих данных. | 202 requestId, no-store; result отдельным owner-only GET requestId endpoint. |
| DELETE `/api/v1/me` | Fresh reauth+CSRF+Origin, подтверждённый deletion request с объяснением ledger/backup exceptions. | 202, revoke sessions/tombstone; выполнение отслеживается по защищённой процедуре. |
| GET `/health/live`, `/health/ready` | Публичный минимальный health, detailed readiness только внутреннему monitor. | no-store, 503 not ready, без secrets/DB metadata. |

Private bundle — authenticated stream, не permanent/signed public URL. Каждый запрос заново проверяет session, coverage, revoke registry; не доверяет клиентским grant IDs или старому кешу UI. V1 возвращает полный небольшой bundle, без Range/HTTP 304 обхода проверки. При отказе auth/DB/storage выдача fail closed; публичные docs живут отдельно. Релиз нельзя восстановить из private bucket через static route или storage listing. CORS не разрешает credentialed requests preview. Logout очищает Pro bytes из application memory; исходники уже скачанного файла удалить невозможно.

Withdrawal: journal status revoked → hard deny private delivery (`410`) → убрать из UI/latest/export → отключить affected preview/origin objects → edge purge и проверка → notice RU/EN + safe remediation. Длинный immutable Free/browser cache и ранее скачанные копии отозвать невозможно. Registry/share показывает актуальное предупреждение, UI не заменяет версию молча; старый public URL в уже прогретом браузере может вернуть локальные bytes. Это известная граница public publication, не заявленный успех глобального удаления.

## 7. Контроли ИБ, данные и эксплуатация

Авторские PR и зависимости — недоверенные до review. CI builds без production secrets, lockfile frozen, secret scanning, dependency/license review и provenance для исходников/изображений/шрифтов/иконок. Publisher — отдельные ограниченные credentials только для approved immutable artifacts; private/public upload списки разделены. Runtime не принимает URL для server fetch/thumbnail/import и не исполняет пользовательский код. SVG/Markdown авторские и проверены, SVG scripts/foreignObject/external references и raw HTML по умолчанию запрещены. Content-Type/nosniff, attachment disposition, ограничение размера/CPU/queue/egress и audit не заменяют проверку прав.

Launch throttles для измерения: downloads ≤30/min/user и ≤3 параллельных stream; checkout create ≤5/10min/user; login request ≤5/10min/normalized identity плюс IP/network budget и cooldown. Shared NAT не ведёт к постоянному бану. Webhook имеет отдельную bounded queue/rate policy, valid retries не блокируются browser anti-bot. Значения проверяются нагрузкой перед paid; 429 и Retry-After доступны RU/EN.

Без обязательной product analytics в beta. При добавлении — allowlist событий item_open/preview_start/config_changed(group name only)/copy_success/bundle_download/integration_feedback(enum); item/release/locale/device class/outcome. Запрещены config values, context, prompt, clipboard, search text, query/hash/full URL, email, payment data, session replay/fingerprinting. Настройки и context не передаются error monitoring. Security audit хранит correlation/actor internal ID/action/object ID/reason/time, без bearer/keys/body/source. Webhook raw payload ≤30d с redaction/encrypted ограниченным доступом; минимальный ledger отдельно.

| Данные | Целевое хранение/удаление |
| --- | --- |
| AI context | Только память вкладки, очищается reset/close; persistence отсутствует. |
| Config | Память; локальное сохранение только opt-in, clear action и schema version; project context исключён. |
| Избранное/locale | Локально до очистки, только IDs/preferences; при blocked storage временно в памяти. |
| Профиль/email | Пока аккаунт активен; удаление/псевдонимизация рабочей БД целево ≤30d после verified request. |
| Edge/access logs с IP | 14d. |
| Error/product raw events | ≤30d; агрегаты product ≤12m при оценке reidentification. |
| Security/audit | 90d по рабочей политике, особый incident hold документируется. |
| Поддержка | ≤180d после закрытия, кроме активного спора. |
| Order/license/accounting ledger | Минимум по фактическому закону/договору Vietnam/провайдера; точный срок и purpose нужны до live checkout. Не наследует автоматически срок профиля. |
| Encrypted DB backups | Rolling 35d, отдельный principal. Tombstones/revokes/ledger reapplied до открытия restore. |

До paid — retention inventory с реальными settings processors и purge owners, privacy/terms RU/EN, seller/entity/регион/data transfer review. Язык RU/EN не определяет резидентство покупателей или применимое право. Account deletion отзывает сессии, удаляет профиль/optional telemetry, сохраняет только обоснованный ledger; договор до продажи объясняет восстановление покупок и ранее выданную лицензию. Идентичность подтверждается, знание order ID не авторизует export/deletion.

Операционные цели: daily encrypted snapshot + WAL/PITR, где поддерживает DB; **RPO ≤1h, RTO ≤8h** для orders/grants после restore drill, это внутренние цели без SLA. Бета: каталог восстанавливается из Git/immutable artifacts, RTO ≤1 рабочего дня. Source/objects/evidence — отдельная восстановимая копия. Provider reconciliation помогает восстановить платежные факты, не заменяет snapshots состава. Restore применяет deletion tombstones и revoke ledger прежде открытия трафика; payment write возобновляется только после проверки согласованности.

Monitor: hash mismatch, unauthorized deliver, auth failures, invalid signatures, queue lag/dead-letter, reconciliation mismatch, public build leak, backup/purge failures, unexpected outbound/CSP. Critical обнаруженная утечка ключа/массовая выдача заражённого source → auto-disable affected release/checkout, человек ≤1h в назначенном режиме дежурства, containment ≤4h после подтверждения, patch либо disabled feature ≤24h. High: acknowledge ≤4 рабочих часа, containment ≤1 рабочего дня, patch цель ≤3 рабочих дней. Medium: ≤2 рабочих дня/14 календарных дней; Low: ≤5 рабочих дней/30 календарных дней. График/владелец дежурства утверждаются до обещания покупателю. Законные сроки уведомления — отдельное решение по фактической юрисдикции.

## 8. QA и выпускные gates

Полный каталог: **32 × 2 prompt modes × 2 locales = 128 семейств**, с двумя React targets = **256 contract cases**. Для motion subset: 12×2×2 =48 семейств/96 cases. Это план генерации/проверки, не проведённые интеграции и не число людей. Каждая case проверяет совпадение ID/версий/config/source, полноту файлов/инструкций, target Example и build. Motion Off/reduce, browsers и inputs — дополнительные измерения, не включённые молча в эти 256.

| Gate | Обязательное завершение до перехода |
| --- | --- |
| Сквозной prototype A001 | Дизайн/Studio, реальная local operation, config/prompt/export roundtrip, RU/EN, Vite production build и отдельный report. Next production/import/SSR ещё отдельно. Нельзя называть это Free release либо security audit. |
| Beta — 6 материалов | S001/S002/S003/C001/C002/E001, обе среды, 24 prompt families/48 target cases; provenance, config schemas, реальные ZIP, keyboard/touch/reduced-motion, public/private build boundary, separate preview site, rollback/revoke drill, RU/EN. Commerce/auth не нужны. |
| Free — 9 материалов | Beta + A001/A003/A006, 36 families/72 cases; A hooks/install/cleanup/SSR examples, category nav, content readiness и применение схем всех девяти. |
| Full — 32 материала | Ещё 23 Pro, 128 families/256 cases всего; concrete schemas всех ID, originality/composition review, локализации, release evidence, private delivery/leak gates. Платный checkout только после отдельного commerce readiness: entity/onboarding/terms/tax/refunds, payment/refund/dispute/reconcile/restore сценарии. |

Нет автоматического продвижения «planned» в passed по заполненным счётчикам. Контент может быть подготовлен Pro disabled при неизвестном merchant; публичная карточка показывает честный coming soon, не ложный доступный export. Если страна/провайдер не позволяют commerce, Free продолжает выпускаться. Прототип не заменяет лицензии, реальные контентные комплекты и production safety controls.

Минимальный набор meaningful cases:

1. A001 фактический fulfilled/rejected clipboard, stale result после новой операции, unmount и system reduce во время motion; success только от актуального результата, без очередей и утечки lifecycle.
2. JSON/schema: unknown keys на каждом уровне, state enum/type, duration/accent bounds, oversize UTF-8, invalid share projections. Текст/code escape payload остаётся plain text, не исполняется в Example/preview.
3. Детерминизм: одинаковый source/config/target/exporter даёт одинаковый payload; diff конфигурации меняет только допустимые файлы; ZIP roundtrip/digest/prompt совпадают, нет missing helper/extra path.
4. SSR/import/build обеих сред с pinned lockfiles, no-window-at-import/hydration, два instances и два разных item рядом, inherited host CSS/Tailwind reset fixture, deployment base path.
5. Keyboard/real touch, 320/390/768/1440px, long RU/EN, 200%/400% zoom/reflow, focus/announcements, off/reduce/pause/fallback/no-JS. WCAG 2.2 AA — цель; автоматический scanner без manual evidence не доказывает соответствие. [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
6. Bridge wrong origin/source/stale channel/oversize/unknown command, прямое открытие preview; нет доступа к main cookies/private API, top navigation, popup, download и device permissions.
7. Anonymous/Alice/Bob получают только свои orders/grants/artifacts через все routes/methods, RSC/prefetch и прямой storage path; no-store/CORS/CSRF/session rotation/logout/revoke работают.
8. Duplicate/out-of-order/forged/wrong merchant/currency/mode webhooks; crash после durable receipt и до grant commit; idempotent retry/quote expiry; paid return URL не даёт доступ; reconcile восстанавливает пропущенное событие.
9. Expired update window, EOL patch, overlapping grants/partial refund/dispute; revoke одного основания не отменяет независимую покупку. Old 18-item snapshot не расширяется до 23 без покупки.
10. Revoked release с прогретыми CDN/browser caches, старой share ссылкой и действующим grant: private hard deny, public notice/purge/origin block, safe replacement, честная граница ранее выданных public bytes.
11. Restore чистого окружения с удалёнными аккаунтами/отозванными grants/releases; доказанные RPO/RTO и reconciliation. При недоступной DB private выдача закрыта.
12. Production leak scan/secret/license/provenance/dependency review, фактические headers/CSP и ограничения размера/egress/queues; отчёт по регрессии размера и long tasks относительно того же UI без движения.

Отчёт каждой проверки: дата/commit/lockfile digest, exact environments/browser builds, команды/exit codes, исходный artifact digest, проверенные кейсы, результаты и ограничения, reviewer. CI ссылки реальны и доступны reviewer. Синтетические mutation тесты схем отчётливо отделены от verificationReport публикуемого item.
