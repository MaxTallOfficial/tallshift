# TON payment module

Local server module for native TON and USDT **on TON**, sent from a wallet or
exchange that supports the exact invoice comment. Sales default to disabled.
No public routes, scheduler, authentication, automatic refunds, grants or payment
UI are installed. `paid` means verified settlement; delivery stays `pending`.

## Host wiring

Apply `prototype/migrations/0001_ton_payments.sql` through the host’s D1/Drizzle
migration workflow. It is a new unpublished migration; `IF NOT EXISTS` does not
upgrade an earlier development schema. Do not reset an existing production DB.

Use these factories only in server code, with real host dependencies:

```ts
const config = paymentConfig(); // enabled:false
const store = createTonPaymentStore(env.DB);
const reader = createToncenterReader(config, {apiKey: env.TONCENTER_API_KEY});
const service = createTonPaymentService({
  config, store,
  resolveQuote: host.resolveAuthenticatedPayableQuote,
  exchangeRate: host.currentUsdExchangeRate,
  isRecipientActive: reader.isRecipientActive,
  readProof: reader.readProof,
});
const http = createTonHttpHandlers({
  config, store, service, mainOrigin: host.exactMainOrigin,
  authenticate: host.verifyOpaqueSession,
  verifyCsrf: host.verifySessionCsrf,
  rateLimit: host.enforceDurableRateLimit,
  webhookSecret: env.TONAPI_WEBHOOK_SECRET,
});
const worker = createTonInboxWorker({
  store, network: config.network, recipient: config.recipient,
  reconcile: service.reconcile,
});
```

Named functions come from matching files in this directory. Suggested wrappers:
POST invoice → `http.createInvoice`, owner-only GET invoice/:id → `http.status`,
POST provider webhook → `http.webhook`. These are not mounted in the Next app.
Create body is only `{quoteId, asset:"TON"|"USDT"}` plus `Idempotency-Key` header;
client amounts, recipients, user IDs, paid flags or transaction hashes are refused.
The server quote must enforce owner, actual sale/readiness, pricing, ownership,
tax/terms/item/release snapshot and expiry. Both assets require a fresh FX adapter;
USDT=$1 is not assumed. Do not enable sales while paid items remain unavailable.

Toncenter read-only data access uses optional `TONCENTER_API_KEY`. TonAPI’s
**separate** webhook bearer token is `TONAPI_WEBHOOK_SECRET` (32–1024 chars), not
an API management key. Configure short `account_tx` payloads without extra info:
`event_type/account_id/lt/tx_hash`. HTTP202 means durable receipt, not payment.

Host cron/queue invokes `worker.process(25)`: lease60s with random token/CAS,
8 attempts maximum, backoff60s→1h, quarantine. For missed webhooks use
`reader.scan(cursor,100)`: persist inbox hints before a durable per-network/account
cursor, advance only over a contiguous finalized prefix, paginate until caught up.
Cursor persistence/cron installation belong to the host. Status polling reads D1
only. Disabling new sales must leave existing invoices reconcilable.

The recipient must be active before invoice creation. Native TON9/USDT6 amounts
are integers. USDT requires allowlisted master, independently derived receiving
wallet, finalized source credit and matching BOC notification. Normalized proofs
trust the fixed server-side indexer, not a light client or wallet callback. No
seed/private signing key is needed. No payment secrets/data in browser bundles.

Missing/unknown comments stay searchable in inbox with
`last_error='UNMATCHED_TRANSFER'`; exhausted/invalid jobs have `state='review'`.
Under/over/early/late payments are reviewed, partial payments are not combined.
An exchange’s hot-wallet address is not user identity. If comments are unsupported,
use another agreed payment path before sending; per-invoice addresses are not
implemented. Host must supply authenticated operator handling and refunds policy.

Fulfillment outbox is only an intent: host must implement idempotent grants,
release/access checks and delivery updates before showing downloadable paid files.

## Checks

`npm run test:ton`:67/67; `npx tsc --noEmit` passed (2026-11-07).
Fixtures use real BOC serialization and actual SQLite migration/SQL behind a D1
facade. They do not prove real Workers/D1 or on-chain payment behavior. Two separate
read-only mainnet checks confirmed active recipient and wallet derivation only.
See [handoff and evidence](../../../../../docs/knowledge-base/ton-payments-handoff-2026-11-07.ru.md).
