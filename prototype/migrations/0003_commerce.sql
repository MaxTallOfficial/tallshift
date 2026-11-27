-- Subscription checkout (Max Tall, 26-27.11.2026). Additive preparation only: it does not enable
-- sales or open access. A quote prices one paid term (whole calendar months) of one level, or the
-- switch from Product to «Всё» before the Product time ends.
-- Amounts are USDT minor units (cents): 1600 = 16 USDT. The payment module's invoice snapshot key
-- usdMinor (0001, unchanged) carries the same number.
CREATE TABLE commerce_quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_user(id),
  plan TEXT NOT NULL CHECK(plan IN ('product','all')),
  -- 'term': a paid number of months (new subscription or renewal). 'upgrade': Product -> «Всё»
  -- before the Product time ends, priced as the recalculated difference (Max Tall, 27.11).
  kind TEXT NOT NULL DEFAULT 'term' CHECK(kind IN ('term','upgrade')),
  months INTEGER,
  currency TEXT NOT NULL CHECK(currency='USDT'),
  subtotal_minor INTEGER NOT NULL CHECK(subtotal_minor>0 AND subtotal_minor<=100000000),
  tax_minor INTEGER NOT NULL CHECK(tax_minor>=0 AND tax_minor<=100000000),
  total_minor INTEGER NOT NULL CHECK(total_minor=subtotal_minor+tax_minor AND total_minor<=100000000),
  -- Items of the level when quoted; also the invoice overlap key (Product and «Всё» overlap).
  item_ids_json TEXT NOT NULL CHECK(json_valid(item_ids_json) AND json_type(item_ids_json)='array' AND json_array_length(item_ids_json) BETWEEN 1 AND 32),
  -- Published releases of those items when quoted (audit only; access is checked at download).
  release_snapshot_json TEXT NOT NULL CHECK(json_valid(release_snapshot_json)),
  -- Term: exclusive end of the same level's paid access when quoted (NULL for a new subscription).
  -- Upgrade: end of the Product access that becomes «Всё».
  current_access_end INTEGER CHECK(current_access_end IS NULL OR current_access_end>0),
  -- Upgrade only: the recalculation per remaining Product period (credit of what was paid, «Всё» price).
  upgrade_snapshot_json TEXT CHECK(upgrade_snapshot_json IS NULL OR (json_valid(upgrade_snapshot_json) AND json_type(upgrade_snapshot_json)='array')),
  terms_revision TEXT NOT NULL,
  tax_revision TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at>created_at),
  idempotency_key TEXT NOT NULL,
  input_digest TEXT NOT NULL,
  CHECK((kind='term' AND months BETWEEN 1 AND 12 AND upgrade_snapshot_json IS NULL) OR (kind='upgrade' AND plan='all' AND months IS NULL AND current_access_end IS NOT NULL AND upgrade_snapshot_json IS NOT NULL)),
  UNIQUE(user_id,idempotency_key)
);
CREATE TABLE commerce_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_user(id),
  quote_id TEXT NOT NULL UNIQUE REFERENCES commerce_quotes(id),
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),
  paid_at INTEGER,
  CHECK((status='pending' AND paid_at IS NULL) OR (status='paid' AND paid_at IS NOT NULL))
);
CREATE INDEX commerce_order_owner ON commerce_orders(user_id,created_at);
CREATE TRIGGER commerce_quote_immutable BEFORE UPDATE ON commerce_quotes
BEGIN SELECT RAISE(ABORT,'immutable commerce quote'); END;
CREATE TRIGGER commerce_order_snapshot_immutable BEFORE UPDATE OF id,user_id,quote_id,created_at ON commerce_orders
BEGIN SELECT RAISE(ABORT,'immutable commerce order'); END;
CREATE TRIGGER commerce_order_paid_requires_invoice BEFORE UPDATE OF status,paid_at ON commerce_orders
WHEN NEW.status='paid' AND NOT EXISTS (
 SELECT 1 FROM ton_invoices i JOIN commerce_quotes q ON q.id=i.quote_id
 WHERE q.id=NEW.quote_id AND q.user_id=NEW.user_id AND i.user_id=NEW.user_id
 AND i.status='paid' AND i.paid_at=NEW.paid_at AND i.item_ids_json=q.item_ids_json
 AND i.terms_revision=q.terms_revision
 AND json_extract(i.fx_snapshot_json,'$.usdMinor')=q.total_minor
)
BEGIN SELECT RAISE(ABORT,'verified invoice required'); END;
