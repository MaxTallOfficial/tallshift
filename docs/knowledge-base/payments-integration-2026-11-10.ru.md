# Платежи: серверные quotes и заказы · 10.11.2026

По поручению Max Tall платежи продолжены параллельно почте. Это локальная подготовка следующего слоя, **не запуск приёма денег**. Production flags не менялись, переводы/кошельки/сервисы не вызывались, миграции в облаке не применялись.

## Реализовано

- `prototype/src/server/orders/store.ts`: immutable owner-bound D1 quotes и отдельные pending orders. Additive `0003_commerce.sql` требует уже применённых auth/TON миграций; таблицы auth_user не пересоздаются. Quote+order записываются одним atomic D1 batch, idempotency привязан к пользователю и плану. Повтор возвращает исходный quote/order/expiry, не создаёт новый счёт.
- `service.ts`: сервер использует существующий `quotePricingPlan` и канонический состав Product/All packs ($16/$39, eligible upgrade $23), серверные ownership/receipts и проверенный tax callback. Клиент не передаёт цену, налог, права, релизы или FX. Snapshot содержит item IDs, hash каждого immutable release, ownership digest, terms/tax revisions и expiry. Перед invoice повторно сверяются права, цены, релизы, условия, налог и срок.
- Реестр `publishedPaidReleases` намеренно пуст: **все 23 платных материала ещё planned**. В реальном host даже COMMERCE_ENABLED=true и TON_PAYMENTS_ENABLED=true не делают их продаваемыми. Нет fallback $1/USDT, фиктивных tax/grants или выдуманного fulfillment.
- `http.ts`: strict JSON `{plan}`, bounded streaming body, invalid UTF-8→400, exact HTTPS Origin, auth/CSRF/rate limits, owner-only order read и no-store. Все внутренние ошибки безопасно нормализованы.
- `host.ts`: factory подключает существующие primary D1 `readAuthSession`, CSRF HMAC к текущей сессии и durable identity/network rate limiter к commerce/TON HTTP factories. Opaque cookie проверяется заново; отзыв auth epoch немедленный. TON берёт только persisted owner-bound server quote; сохранены целые bigint base units и FX expiry.
- `paid` у order может появиться только из фактически settled TON invoice того же user/quote/items/terms/USD snapshot; SQL trigger отклоняет несовпадения. Order delivery остаётся **not_ready**, даже если оплата paid. `ton_payment_outbox` — намерение, не выдача доступа. Нет методов fulfilled/download grants, refunds или ручного paid=true.

Public Next routes и checkout UI **не смонтированы**: для них пока нет необходимых готовых коммерческих зависимостей. Новых страниц/публичных текстов не создавалось; копирайтер/Hallmark UI-проверка этому серверному этапу не приписываются.

## Проверено локально

`node --test prototype/tests/commerce.test.ts prototype/tests/ton-*.test.ts prototype/tests/auth.test.ts`: **82/82 pass** (10 commerce + 67 TON + 5 auth), 0 fail. TypeScript `npx tsc --noEmit -p tsconfig.next.json`: pass. Scoped diff check: pass.

Commerce tests исполняют настоящие 0001/0002/0003 SQL в SQLite D1 facade: concurrent idempotency, atomic rollback quote/order, server pricing/tax/upgrade, expired retry, changed ownership/terms/tax revision/release, planned gate, price/ownership injection, malformed UTF-8, owner privacy, actual primary auth/CSRF/session epoch, bigint TON amount, duplicate invoice asset conflict. Отдельно одна tx identity не может оплатить второй order другого owner/asset; paid invoice с неправильной USD суммой не повышает order до paid. Старые TON-тесты покрывают finality, under/over/early/late, fake jetton, global tx dedupe, inbox leases/retries.

Это не настоящий Workers/D1 E2E, не реальные FX/receipt/webhook и не тест живой покупки. Build/UI/code export проверки этого этапа не заявлены.

## Что блокирует реальный запуск

1. Готовые, проверенные immutable **платные** assets и заполнение server release registry только ими; private storage и idempotent fulfillment/grants/download authorizer. Пока купить нечего.
2. Авторитетные server ownership/receipts (не localStorage и не URL examples), утверждённые seller/terms revisions и расчёт применимых налогов. Текущие цены до налогов не решают налоговый контекст.
3. Настоящий USD FX provider для TON **и USDT** с источником/quotedAt/expiry; USDT=$1 не предполагается. API credentials и политика доступности/лимитов.
4. После review — применить additive `0003_commerce.sql` отдельно в staging, затем подключить host dependencies и публичные маршруты. Из текущего factory нельзя автоматически включать production.
5. Webhook secret/registration и cron/queue с existing inbox worker + persisted finalized scan cursor/backfill. Webhook — только hint, статус читается из D1, клиент txHash/paid не authority.
6. Testnet/реальные provider fixtures и полноценная цепочка auth→server quote→invoice→finalized payment→order→private delivery, review/refund operator audit; затем скопированный и свёрстанный RU/EN/VI checkout UI, отдельный разрешённый live smoke.

Адрес получения остаётся подтверждённым владельцем постоянным TON адресом из предыдущей передачи. Новые адреса/ключи кошелька не нужны и не создавались. Source modules использованы как источник истины; исторический статус «auth ещё нет» не переносился в текущую серверную интеграцию.

## Проверка основным агентом

Основной агент просмотрел server store/service/http/host и SQL, запросил обработку malformed UTF-8 и дополнительные проверки несовпадающего invoice. После исправлений полный `npm test`: **270/270 pass**, 0 fail; отдельный `tsc -p tsconfig.next.json --noEmit` без ошибок. `git diff --check` чистый. Изменения объединены с результатами Cloudflare/Resend и пересылок; production flags платежей не изменялись.
