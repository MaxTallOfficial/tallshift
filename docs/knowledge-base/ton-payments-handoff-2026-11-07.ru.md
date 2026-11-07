# TON: локальный модуль и передача · 07.11.2026

Max Tall разрешил модуль native TON и USDT **в сети TON**, с отправкой через
подходящую биржу или кошелёк; Bybit Pay отложен. По решению пользователя один агент
ведёт крипту, основной агент — Cloudflare/auth с другой AI. Это разрешение на
локальный модуль, не утверждение готовности приёма денег или пользовательского UI.

Подтверждённый постоянный адрес:
`UQAwPV9w4h7ZP0CVe3QoJoJfVaYjrxp9Eqc3TSl6nENDaq2i`.
Raw: `0:303d5f70e21ed93f40957b742826825f55a623af1a7d12a7374d297a9c43436a`.
CRC проверен SDK. Bridge/exchange одноразовый адрес и Tron/TRC20 не используются.

## Реализовано

`prototype/src/server/payments/ton`: config/FX quote, immutable D1 invoice/payment
store, pure verifier, read-only Toncenter adapter, service, Web Request/Response
HTTP factories и bounded inbox worker. [Краткий README с host wiring](../../prototype/src/server/payments/ton/README.md).
SQL — `prototype/migrations/0001_ton_payments.sql`, новая непубликованная migration.
`IF NOT EXISTS` не обновит раннюю development-схему с отсутствующими retry/lease
столбцами: для неё нужна отдельная upgrade migration либо disposable dev DB.

**Всё default disabled; public routes и UI не смонтированы.** Auth, реальные D1
bindings, FX-provider, server commerce quotes и downloads/grants не подключены.
Checkout остаётся расчётом. Ни deploy/migrations в cloud, ни переводов/оплат,
возвратов, commit/push этим этапом не выполнялось. Настройки Stripe/KV из setup
другой AI не перенесены. Это module-ready, не production-ready.

Счёт создаётся только из owner-bound server quote с точными item/terms/FX snapshots,
случайным комментарием и expiry. NativeTON9/USDT6, целые base units с округлением
вверх; USDT=$1 не предполагается. `enabled:false` закрывает новые счета, но не
останавливает проверку старых. Owner-only status не сканирует blockchain.

Exact finalized successful incoming transfer в `[createdAt,expiresAt)` атомарно
фиксирует event+paid invoice+один fulfillment intent. `deliveryState=pending`:
это ещё не выдача прав. Методов grants/delivery-complete/автовозврата нет.
Недо-/переплата, ранний/поздний перевод требуют review; частичные не суммируются.
Позднее наблюдение on-time chain transfer может корректно завершить счёт.

Отправитель может быть hot wallet биржи: он не идентифицирует покупателя.
Нужен точный invoice comment. Без поддержки комментария текущий shared address
не даёт безопасной автоматической привязки. Персональные адреса не реализованы;
до перевода нужен другой согласованный способ. Unknown/missing comment сохраняется
в durable inbox: `state=processed,last_error=UNMATCHED_TRANSFER` с reference для
оператора. Исчерпанные/недоверенные jobs — `state=review`; ручного `paid=true` нет.

## Проверка сети и надёжность

Toncenter fixed origins,8s timeout,1MiB response bound,8192char BOC bound; v3
account+hash match, finality2+positive masterchain seqno, successful/not-aborted/
not-bounced. Receiving wallet должен быть **active до создания счёта**: native
credit на undeployed wallet с compute.skipped автоматически не засчитывается.
USDT: allowlisted master→get_wallet_address(owner)→derived source wallet→finalized
source credit tx→matching outgoing hash/body→notification/internal_transfer
opcodes/query/amount/sender. Forwarding TON не считается суммой USDT. Имя/картинка
токена не authority. Это доверие к server-side indexer, не TON light client.

TonAPI webhook — только hint; его bearer `TONAPI_WEBHOOK_SECRET` отличается от
Toncenter data `TONCENTER_API_KEY` и TonAPI management key. Принимать short
account_tx payload без add_transaction_info/account_info. HTTP202 — durable
receipt; затем независимое чтение Toncenter. Не доверять frontend tx hash/paid.
Worker использует lease60s+randomtoken/CAS, максимум8attempts, backoff60s→1h,
quarantine; crash после settlement не дублирует outbox. Ключи кошелька не нужны.

## Что подключить в host

- Реальные Cloudflare/Next runtime adapter, D1 binding/migration, opaque HttpOnly
  session auth, exact Origin, CSRF и durable rate limiter; route wrappers factories.
- Server quote с ownership/pricing/tax/terms и реальной доступностью платных releases,
  FX adapter для обеих валют и readiness gate. Пока paid catalogue planned — salesoff.
- Provider secrets/webhook registration и cron/queue для `worker.process()`.
  Для backfill `reader.scan()` сначала durable hints, затем durable account/network
  cursor только по contiguous finalized prefix; pending нельзя перескакивать.
  Cursor persistence/cron — host wiring, browser status polling читает только D1.
- Реальный fulfillment worker с idempotent grants/release checks/delivery updates;
  только потом платные скачивания. Authenticated operator procedure/audit для
  unmatched/review и возвратов, реальные сведения/условия продавца. Это не MoR.
- Testnet/full Workers+D1, actual webhook delivery/backfill, FX/auth/fulfillment,
  browser statuses/layout, monitoring/backups и согласованный live smoke test.

## Проверено и не проверено

**67/67 тестов**,0fail: config/quote5, provider12, service/HTTP13, store15,
verifier14, worker8. Прогон агента и независимый root прошли. `npx tsc --noEmit`
и scoped diff-check прошли. Root выполнил product TS+Vite build и поиск server
markers/recipient в public JS/HTML — совпадений нет. Это не Workers build.

Provider JSON fixtures synthetic, BOC настоящие (`@ton/core@0.63.1`). SQLite D1
facade исполняет actual SQL/migration/rollback, не заменяет настоящую D1 runtime
проверку. Покрыты fake jetton/source credit, finality/errors/bounds, auth/CSRF/rate,
idempotency/privacy, concurrent claims/lease expiry/CAS,8retries/8crashes,
unmatched trace и settlement-before-crash без повторной выдачи.

Root отдельно сделал **два read-only mainnet RPC**: receiving address active и
официальный USDT master wallet derivation/BOC decode успешны; балансы не сохранены.
Никаких реальных receipt/finality/payment/fulfillment E2E не было.
Evidence: [независимые local checks](../art-direction-2026/evidence/ton-payments-2026-11-07/local-checks.json),
[read-only RPC](../art-direction-2026/evidence/ton-payments-2026-11-07/read-only-mainnet.json).

Копирайтер подготовил48полей×3locale в `ton-payment-copy.ts`; словарь не смонтирован
и не проходил browser QA. [Редакторская передача](ton-payment-copy-2026-11-07.ru.md).
Источники: [TON processing](https://docs.ton.org/applications/payments/overview),
[jetton validation](https://docs.ton.org/payments/jettons),
[TonAPI webhooks](https://docs.tonconsole.com/tonapi/webhooks-api/),
[Toncenter schema](https://toncenter.com/api/v3/doc.json).
