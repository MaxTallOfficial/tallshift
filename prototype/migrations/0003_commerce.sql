-- Additive preparation only. Does not enable sales or issue download grants.
CREATE TABLE commerce_quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_user(id),
  plan TEXT NOT NULL CHECK(plan IN ('product','bundle')),
  currency TEXT NOT NULL CHECK(currency='USD'),
  subtotal_minor INTEGER NOT NULL CHECK(subtotal_minor>0 AND subtotal_minor<=100000000),
  tax_minor INTEGER NOT NULL CHECK(tax_minor>=0 AND tax_minor<=100000000),
  total_minor INTEGER NOT NULL CHECK(total_minor=subtotal_minor+tax_minor AND total_minor<=100000000),
  item_ids_json TEXT NOT NULL CHECK(json_valid(item_ids_json)),
  release_snapshot_json TEXT NOT NULL CHECK(json_valid(release_snapshot_json)),
  ownership_digest TEXT NOT NULL,
  terms_revision TEXT NOT NULL,
  tax_revision TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at>created_at),
  idempotency_key TEXT NOT NULL,
  input_digest TEXT NOT NULL,
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
