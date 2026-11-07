-- Native TON and USDT/TON invoices. Does not create accounts or grant download rights.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ton_invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  quote_id TEXT NOT NULL UNIQUE,
  item_ids_json TEXT NOT NULL CHECK (json_valid(item_ids_json)),
  terms_revision TEXT NOT NULL,
  asset TEXT NOT NULL CHECK (asset IN ('TON', 'USDT')),
  network TEXT NOT NULL CHECK (network IN ('ton-mainnet', 'ton-testnet')),
  recipient TEXT NOT NULL,
  jetton_master TEXT,
  amount_base_units TEXT NOT NULL CHECK (length(amount_base_units) BETWEEN 1 AND 78 AND amount_base_units NOT GLOB '*[^0-9]*' AND substr(amount_base_units, 1, 1) BETWEEN '1' AND '9'),
  comment TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  fx_quote_id TEXT NOT NULL,
  fx_snapshot_json TEXT NOT NULL CHECK (json_valid(fx_snapshot_json)),
  idempotency_key TEXT NOT NULL,
  input_digest TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'review', 'expired')),
  delivery_state TEXT NOT NULL DEFAULT 'not_ready' CHECK (delivery_state IN ('not_ready', 'pending', 'delivered')),
  paid_at INTEGER,
  settlement_event_key TEXT UNIQUE,
  UNIQUE (user_id, idempotency_key),
  CHECK ((asset = 'TON' AND jetton_master IS NULL) OR (asset = 'USDT' AND jetton_master IS NOT NULL)),
  CHECK ((status = 'paid' AND paid_at IS NOT NULL AND settlement_event_key IS NOT NULL AND delivery_state != 'not_ready') OR (status != 'paid' AND paid_at IS NULL AND settlement_event_key IS NULL AND delivery_state = 'not_ready'))
);

CREATE INDEX IF NOT EXISTS ton_invoice_owner ON ton_invoices(user_id, created_at);
CREATE INDEX IF NOT EXISTS ton_invoice_pending ON ton_invoices(status, expires_at);

-- A chain transfer belongs to at most one invoice, independent of webhook delivery IDs.
CREATE TABLE IF NOT EXISTS ton_payment_events (
  event_key TEXT PRIMARY KEY,
  tx_identity TEXT NOT NULL UNIQUE,
  invoice_id TEXT NOT NULL REFERENCES ton_invoices(id),
  asset TEXT NOT NULL CHECK (asset IN ('TON', 'USDT')),
  network TEXT NOT NULL CHECK (network IN ('ton-mainnet', 'ton-testnet')),
  recipient TEXT NOT NULL,
  comment TEXT NOT NULL,
  amount_base_units TEXT NOT NULL,
  transaction_at INTEGER NOT NULL,
  observed_at INTEGER NOT NULL,
  proof_digest TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('paid', 'review')),
  reason TEXT NOT NULL CHECK (reason IN ('exact', 'underpaid', 'overpaid', 'late', 'early', 'already_review', 'already_paid'))
);

CREATE INDEX IF NOT EXISTS ton_payment_invoice ON ton_payment_events(invoice_id, observed_at);

-- Reliable intent for future fulfillment worker. No entitlement is granted by this table.
CREATE TABLE IF NOT EXISTS ton_payment_outbox (
  invoice_id TEXT PRIMARY KEY REFERENCES ton_invoices(id),
  event_key TEXT NOT NULL UNIQUE REFERENCES ton_payment_events(event_key),
  created_at INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'delivered'))
);

-- Only bounded delivery metadata, never raw webhook body, bearer token or wallet keys.
CREATE TABLE IF NOT EXISTS ton_webhook_inbox (
  event_key TEXT PRIMARY KEY,
  body_digest TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  reference TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'received' CHECK (state IN ('received', 'processing', 'processed', 'review')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 8),
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER,
  lease_token TEXT,
  last_error TEXT,
  CHECK ((state = 'processing' AND lease_until IS NOT NULL AND lease_token IS NOT NULL) OR (state != 'processing' AND lease_until IS NULL AND lease_token IS NULL))
);

CREATE INDEX IF NOT EXISTS ton_webhook_due ON ton_webhook_inbox(state, next_attempt_at, lease_until);

CREATE TRIGGER IF NOT EXISTS ton_invoice_snapshot_immutable
BEFORE UPDATE OF id, user_id, quote_id, item_ids_json, terms_revision, asset, network,
  recipient, jetton_master, amount_base_units, comment, created_at, expires_at,
  fx_quote_id, fx_snapshot_json, idempotency_key, input_digest ON ton_invoices
BEGIN
  SELECT RAISE(ABORT, 'immutable invoice snapshot');
END;

CREATE TRIGGER IF NOT EXISTS ton_payment_event_immutable
BEFORE UPDATE ON ton_payment_events
BEGIN
  SELECT RAISE(ABORT, 'immutable payment event');
END;
