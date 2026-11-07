# Параллельный этап 1–3: работа продолжается, 07.11.2026

Пользователь подтвердил объём: S001/S002, бесплатная production-платформа со справкой, A003/A006. Домены и хостинг выберет позже. Публичного развёртывания нет. Изменения пока не закоммичены и не отправлены; GitHub Actions не запускались.

В рабочем дереве добавлены четыре recipe-папки, их реестр/availability/share, справка (8 тем, 4 шаблона, glossary/changelog RU/EN/VI), Next.js 16.4.2 App Router поверх общего UI, отдельная Vite preview-сборка, строгий message bridge и локальный HTTP preview server, deployment policy на tldts. Это незавершённая интеграция, не опубликованный релиз. Все manifests пока local-prototype; immutable publisher/registry и production gates ещё предстоят.

Копирайтер проверил новые demos/docs/rules, справку и успел записать четыре item-specific overrides RU/EN/VI в example-copy.ts до ошибки лимита. Root удалил свои дублирующие overrides. Визуальная проверка этих текстов ещё впереди. Все три агента остановились по лимиту использования, их код остался в общей папке.

Проверки: npm run test:examples прошёл (8 новых recipes ×3 locales ×2 targets ×2 modes =96 cases;16 Vite consumer builds). Next main build с NEXT_PUBLIC_PREVIEW_ORIGIN=http://127.0.0.1:4175 прошёл до последних правок layout/copy; повторить после завершения. Отдельная preview-сборка прошла. Unit suite:185 passed/3failed; два устаревших ожидания5/27 обновлены9/23; fixture scroll-контейнера исправлен (scrollingElement документа отличен от вложенного контейнера); targeted15/15 прошли. Полный suite повторить.

Важный найденный дефект: прежние CSS Modules содержали bare :root, который Next отвергает как impure. Root временно сделал :root .localRoot; Next принимает и standalone source parity проходит, но закреплённый Hallmark lint распознаёт tokens только на :root/theme/tokens.css, поэтому recipes сейчас дают56FAIL/4REFLEX/2WARN. Нельзя считать дизайн-проверку чистой. Нужен нормальный перенос defaults в поставляемые tokens.css с обновлением точной dependency closure всех ZIP/vendor-файлов; не обходить проверку/не менять её hashes. Product20 files/platform3 files проходят0FAIL/REFLEX/WARN.

Тест tests/examples-next.mjs создаёт чистый Next consumer из9ZIP: первая попытка нашла React SSR comment separators в Hydrated 0 assertion, исправлено; следующая увидела favicon404, добавлен пустой data favicon вместо игнорирования ошибок. Последний запуск /tmp/tallshift-next-consumer.log, session35683 — результат нужно прочитать. Итоговый JSON сохраняется в docs/art-direction-2026/evidence/free-stage3-2026-11-07/next-consumer.json только при успехе.

Осталось: разобраться с Hallmark token packaging; проверить bridge lifecycle/origin/stale ack/timeout/PAUSE и обе CSP в реальном браузере; начать isolated preview с PREVIEW_LOCAL=1 PREVIEW_PARENT_ORIGIN=http://127.0.0.1:4174 PREVIEW_ORIGIN=http://127.0.0.1:4175 (build VITE_PREVIEW_PARENT_ORIGIN точно совпадает), main4174; полноценные browser checks всех4 новых examples и /docs всех3 языков на320/390/768/1024/1440; accessibility/reduced motion/focus; обновить общий отчёт/handoff только фактами. Исходный Vite4173 остаётся локальным исключением, его iframe sandbox не ослабляли. Production использует RemotePreview, если origin не задан — честный текст и файлы без интерактивного примера. Реальных платежей/auth/orders/backend SQL нет.

Технические источники сверены: официальная документация Next custom webpack, installation, CSP nonces/proxy. Скрипты Hallmark запускались только через защищённый npm run check:design. Одновременный browser QA и Vite SSR tests избегать; тесты меняют optimizer cache.

Обновление: последний test:examples:next прошёл:9ZIP-only Next production routes, HTTP SSR и browser hydration,0 runtime errors/remote requests. JSON evidence сохранён.

## Уточнение объёма: авторизация и оплата

Max Tall попросил включить авторизацию уже сейчас (ранее предлагалось отложить). Это решение о приоритете; способ входа, auth-библиотека, почтовый провайдер и конфигурация ещё не утверждены и не реализованы. Пользователь параллельно настраивает Cloudflare-шаблон Next.js App Router + D1 + Drizzle с другой нейросетью; его исходники здесь ещё не проверены и не интегрированы. Предложение хранить сессии в KV не принято: учитывать eventual consistency при отзыве, соблюдать контракт server-side opaque sessions.

Вопрос пользователя «Платежи же можно пока на крипту сделать?» рассматривается как обсуждение варианта, а не утверждение конкретного провайдера/сети/монеты/кошелька или разрешение на live приём. Технический вариант: отдельный payment adapter, server-created invoice, подтверждение settlement, проверка подписи webhook, durable inbox/idempotency/reconciliation и выдача прав только после verified settlement. Криптопроцессор не считается автоматически MoR. Применимость к продавцу из Вьетнама требует отдельной проверки: признание криптоактивов не означает разрешение их использования как средства оплаты. Источники: https://docs.btcpayserver.org/Development/ecommerce-integration-guide/ ; https://www.div.gov.vn/hoan-thien-khung-phap-ly-de-quan-ly-cac-loai-tai-san-ao-tien-ao ; https://developers.cloudflare.com/kv/concepts/how-kv-works/ .

## Контрольная точка перед commit/push по запросу Max Tall

07.11 повторены полный suite255/255 и основная сборка pass. Открытые Hallmark recipes56FAIL/4REFLEX/2WARN сохранены как явное ограничение checkpoint; проект не объявлен release-ready. TON-модуль завершён и имеет отдельную передачу/67тестов, входящих в255. Сгенерированные dist-preview/.open-next/.wrangler и .dev.vars исключены изGit. Пользователь явно запросил один commit/push всех накопленных изменений, без запуска Actions. Итоговую публикацию проверять по фактическому Git.
