-- Additive fulfillment ledger. Requires 0001 (TON), 0002 (auth) and 0003 (commerce).
-- Does not enable sales, does not create releases and never marks anything paid.
-- Paid -> fulfilled happens only inside the fulfillment worker's single D1 batch.

-- Purchase receipts: copied from the paid order, its immutable quote and settled invoice.
CREATE TABLE commerce_receipts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES commerce_orders(id),
  user_id TEXT NOT NULL REFERENCES auth_user(id),
  quote_id TEXT NOT NULL UNIQUE REFERENCES commerce_quotes(id),
  invoice_id TEXT NOT NULL UNIQUE REFERENCES ton_invoices(id),
  plan TEXT NOT NULL CHECK(plan IN ('product','bundle')),
  currency TEXT NOT NULL CHECK(currency='USD'),
  subtotal_minor INTEGER NOT NULL CHECK(subtotal_minor>0 AND subtotal_minor<=100000000),
  tax_minor INTEGER NOT NULL CHECK(tax_minor>=0 AND tax_minor<=100000000),
  total_minor INTEGER NOT NULL CHECK(total_minor=subtotal_minor+tax_minor),
  refunded_subtotal_minor INTEGER NOT NULL DEFAULT 0 CHECK(refunded_subtotal_minor>=0 AND refunded_subtotal_minor<=subtotal_minor),
  asset TEXT NOT NULL CHECK(asset IN ('TON','USDT')),
  amount_base_units TEXT NOT NULL,
  terms_revision TEXT NOT NULL,
  tax_revision TEXT NOT NULL,
  paid_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid','partially_refunded','refunded','disputed'))
);
CREATE INDEX commerce_receipt_owner ON commerce_receipts(user_id,paid_at);

-- One grant per paid missing item of an order. Effective access is the union of active grants.
CREATE TABLE commerce_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_user(id),
  order_id TEXT NOT NULL REFERENCES commerce_orders(id),
  item_id TEXT NOT NULL CHECK(length(item_id)=4 AND item_id GLOB '[SCEA][0-9][0-9][0-9]'),
  release_sha256 TEXT NOT NULL CHECK(length(release_sha256)=64 AND release_sha256 NOT GLOB '*[^0-9a-f]*'),
  allocation_minor INTEGER NOT NULL CHECK(allocation_minor>=0),
  paid_at INTEGER NOT NULL,
  updates_end INTEGER NOT NULL CHECK(updates_end>paid_at),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  revoked_at INTEGER,
  revoke_reason TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(order_id,item_id),
  CHECK((status='active' AND revoked_at IS NULL AND revoke_reason IS NULL) OR (status='revoked' AND revoked_at IS NOT NULL AND revoke_reason IS NOT NULL))
);
CREATE INDEX commerce_grant_owner ON commerce_grants(user_id,status,item_id);

-- Worker state per settled invoice. 'fulfilled' is written in the same batch as receipt+grants.
CREATE TABLE commerce_fulfillments (
  invoice_id TEXT PRIMARY KEY REFERENCES ton_invoices(id),
  order_id TEXT UNIQUE REFERENCES commerce_orders(id),
  state TEXT NOT NULL CHECK(state IN ('retry','review','fulfilled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  note TEXT,
  updated_at INTEGER NOT NULL,
  fulfilled_at INTEGER,
  CHECK((state='fulfilled' AND fulfilled_at IS NOT NULL AND order_id IS NOT NULL) OR (state!='fulfilled' AND fulfilled_at IS NULL))
);

-- Append-only withdrawal journal: a revoked release is denied immediately without a deploy.
CREATE TABLE commerce_release_revocations (
  release_sha256 TEXT PRIMARY KEY CHECK(length(release_sha256)=64 AND release_sha256 NOT GLOB '*[^0-9a-f]*'),
  item_id TEXT NOT NULL CHECK(length(item_id)=4 AND item_id GLOB '[SCEA][0-9][0-9][0-9]'),
  reason TEXT NOT NULL CHECK(reason IN ('security','integrity','legal','withdrawn')),
  revoked_at INTEGER NOT NULL
);

-- Minimal delivery audit: internal IDs only, never tickets, cookies, bodies or source.
CREATE TABLE commerce_download_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  release_sha256 TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('issued','served')),
  created_at INTEGER NOT NULL
);
CREATE INDEX commerce_download_owner ON commerce_download_events(user_id,created_at);

-- Durable per network/account scan cursor; advanced only over a finalized contiguous prefix.
CREATE TABLE ton_scan_cursors (
  scope TEXT PRIMARY KEY,
  last_lt TEXT NOT NULL CHECK(length(last_lt) BETWEEN 1 AND 20 AND last_lt NOT GLOB '*[^0-9]*' AND (last_lt='0' OR substr(last_lt,1,1)<>'0')),
  updated_at INTEGER NOT NULL,
  lease_until INTEGER,
  lease_token TEXT,
  CHECK((lease_until IS NULL AND lease_token IS NULL) OR (lease_until IS NOT NULL AND lease_token IS NOT NULL))
);

CREATE TRIGGER ton_scan_cursor_forward_only BEFORE UPDATE OF last_lt ON ton_scan_cursors
WHEN length(NEW.last_lt)<length(OLD.last_lt) OR (length(NEW.last_lt)=length(OLD.last_lt) AND NEW.last_lt<OLD.last_lt)
BEGIN SELECT RAISE(ABORT,'scan cursor cannot move backwards'); END;

-- A receipt exists only for a paid order whose settled invoice matches the immutable quote.
CREATE TRIGGER commerce_receipt_requires_paid_order BEFORE INSERT ON commerce_receipts
WHEN NEW.status<>'paid' OR NEW.refunded_subtotal_minor<>0 OR NOT EXISTS (
  SELECT 1 FROM commerce_orders o
  JOIN commerce_quotes q ON q.id=o.quote_id AND q.user_id=o.user_id
  JOIN ton_invoices i ON i.quote_id=q.id AND i.user_id=q.user_id
  WHERE o.id=NEW.order_id AND o.user_id=NEW.user_id AND q.id=NEW.quote_id AND i.id=NEW.invoice_id
    AND o.status='paid' AND i.status='paid' AND o.paid_at=NEW.paid_at AND i.paid_at=NEW.paid_at
    AND q.plan=NEW.plan AND q.currency=NEW.currency
    AND q.subtotal_minor=NEW.subtotal_minor AND q.tax_minor=NEW.tax_minor AND q.total_minor=NEW.total_minor
    AND i.asset=NEW.asset AND i.amount_base_units=NEW.amount_base_units
    AND q.terms_revision=NEW.terms_revision AND q.tax_revision=NEW.tax_revision
    AND i.item_ids_json=q.item_ids_json AND i.terms_revision=q.terms_revision
    AND json_extract(i.fx_snapshot_json,'$.usdMinor')=q.total_minor
    AND EXISTS (SELECT 1 FROM ton_payment_events e WHERE e.event_key=i.settlement_event_key AND e.invoice_id=i.id
      AND e.outcome='paid' AND e.reason='exact' AND e.transaction_at=i.paid_at)
)
BEGIN SELECT RAISE(ABORT,'paid order required'); END;

-- A grant needs that receipt and an item/release from the paid order's immutable quote.
CREATE TRIGGER commerce_grant_requires_receipt BEFORE INSERT ON commerce_grants
WHEN NEW.status<>'active' OR NOT EXISTS (
  SELECT 1 FROM commerce_receipts r
  JOIN commerce_orders o ON o.id=r.order_id AND o.user_id=r.user_id
  JOIN commerce_quotes q ON q.id=r.quote_id AND q.user_id=r.user_id
  WHERE r.order_id=NEW.order_id AND r.user_id=NEW.user_id AND r.paid_at=NEW.paid_at
    AND o.status='paid' AND r.status='paid'
    AND EXISTS (SELECT 1 FROM json_each(q.item_ids_json) WHERE value=NEW.item_id)
    AND json_extract(q.release_snapshot_json,'$.'||NEW.item_id)=NEW.release_sha256
    AND NEW.allocation_minor+(SELECT coalesce(sum(g.allocation_minor),0) FROM commerce_grants g WHERE g.order_id=NEW.order_id)<=r.subtotal_minor
    AND NEW.updates_end-NEW.paid_at BETWEEN 31536000 AND 31622400
)
BEGIN SELECT RAISE(ABORT,'paid receipt required'); END;

CREATE TRIGGER commerce_receipt_immutable BEFORE UPDATE OF id,order_id,user_id,quote_id,invoice_id,plan,currency,subtotal_minor,tax_minor,total_minor,asset,amount_base_units,terms_revision,tax_revision,paid_at,created_at ON commerce_receipts
BEGIN SELECT RAISE(ABORT,'immutable commerce receipt'); END;
CREATE TRIGGER commerce_grant_immutable BEFORE UPDATE OF id,user_id,order_id,item_id,release_sha256,allocation_minor,paid_at,updates_end,created_at ON commerce_grants
BEGIN SELECT RAISE(ABORT,'immutable commerce grant'); END;
CREATE TRIGGER commerce_grant_revocation_final BEFORE UPDATE OF status ON commerce_grants
WHEN OLD.status='revoked' AND NEW.status<>'revoked'
BEGIN SELECT RAISE(ABORT,'revoked grant is final'); END;
CREATE TRIGGER commerce_receipt_ledger BEFORE DELETE ON commerce_receipts
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
CREATE TRIGGER commerce_grant_ledger BEFORE DELETE ON commerce_grants
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
CREATE TRIGGER commerce_release_revocation_final BEFORE UPDATE ON commerce_release_revocations
BEGIN SELECT RAISE(ABORT,'release revocation is final'); END;
CREATE TRIGGER commerce_release_revocation_ledger BEFORE DELETE ON commerce_release_revocations
BEGIN SELECT RAISE(ABORT,'release revocation is final'); END;
CREATE TRIGGER commerce_fulfillment_final BEFORE UPDATE ON commerce_fulfillments
WHEN OLD.state='fulfilled'
BEGIN SELECT RAISE(ABORT,'fulfillment is final'); END;

-- Paid is never inserted or typed in: orders and invoices start pending, an invoice becomes
-- paid only together with its exact verified payment event, and paid history is final.
CREATE TRIGGER commerce_order_insert_pending BEFORE INSERT ON commerce_orders
WHEN NEW.status<>'pending' OR NEW.paid_at IS NOT NULL
BEGIN SELECT RAISE(ABORT,'orders start pending'); END;
CREATE TRIGGER commerce_order_paid_final BEFORE UPDATE OF status,paid_at ON commerce_orders
WHEN OLD.status='paid'
BEGIN SELECT RAISE(ABORT,'paid order is final'); END;
CREATE TRIGGER ton_invoice_insert_pending BEFORE INSERT ON ton_invoices
WHEN NEW.status<>'pending' OR NEW.paid_at IS NOT NULL OR NEW.settlement_event_key IS NOT NULL OR NEW.delivery_state<>'not_ready'
BEGIN SELECT RAISE(ABORT,'invoices start pending'); END;
CREATE TRIGGER ton_invoice_paid_requires_event BEFORE UPDATE OF status,paid_at,settlement_event_key ON ton_invoices
WHEN (NEW.status='paid' AND NOT EXISTS (SELECT 1 FROM ton_payment_events e WHERE e.event_key=NEW.settlement_event_key
    AND e.invoice_id=NEW.id AND e.outcome='paid' AND e.reason='exact' AND e.transaction_at=NEW.paid_at))
  OR (OLD.status='paid' AND (NEW.status<>'paid' OR NEW.paid_at IS NOT OLD.paid_at OR NEW.settlement_event_key IS NOT OLD.settlement_event_key))
BEGIN SELECT RAISE(ABORT,'paid requires a verified payment event'); END;
CREATE TRIGGER ton_invoice_ledger BEFORE DELETE ON ton_invoices
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
CREATE TRIGGER ton_payment_event_ledger BEFORE DELETE ON ton_payment_events
BEGIN SELECT RAISE(ABORT,'ledger row'); END;

-- One open checkout per overlapping items: a second invoice cannot be issued while another
-- unexpired invoice, or a paid but not yet delivered one, covers any of the same items.
CREATE TRIGGER ton_invoice_one_open_checkout BEFORE INSERT ON ton_invoices
WHEN EXISTS (SELECT 1 FROM ton_invoices i WHERE i.user_id=NEW.user_id AND i.quote_id<>NEW.quote_id
  AND ((i.status IN ('pending','expired') AND i.expires_at>NEW.created_at) OR (i.status='paid' AND i.delivery_state<>'delivered'))
  AND EXISTS (SELECT 1 FROM json_each(i.item_ids_json) a WHERE a.value IN (SELECT value FROM json_each(NEW.item_ids_json))))
BEGIN SELECT RAISE(ABORT,'checkout in progress'); END;

-- Refund and revocation history only moves forward.
CREATE TRIGGER commerce_receipt_history_forward BEFORE UPDATE OF status,refunded_subtotal_minor ON commerce_receipts
WHEN NEW.refunded_subtotal_minor<OLD.refunded_subtotal_minor OR OLD.status='refunded'
  OR (NEW.status='paid' AND (OLD.status<>'paid' OR NEW.refunded_subtotal_minor<>0))
  OR (NEW.status='refunded' AND EXISTS (SELECT 1 FROM commerce_grants WHERE order_id=NEW.order_id AND status='active'))
BEGIN SELECT RAISE(ABORT,'receipt history only moves forward'); END;
CREATE TRIGGER commerce_grant_revocation_immutable BEFORE UPDATE OF revoked_at,revoke_reason ON commerce_grants
WHEN OLD.status='revoked'
BEGIN SELECT RAISE(ABORT,'revoked grant is final'); END;
CREATE TRIGGER commerce_fulfillment_ledger BEFORE DELETE ON commerce_fulfillments
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
CREATE TRIGGER commerce_download_event_final BEFORE UPDATE ON commerce_download_events
BEGIN SELECT RAISE(ABORT,'audit row'); END;
CREATE TRIGGER commerce_download_event_ledger BEFORE DELETE ON commerce_download_events
BEGIN SELECT RAISE(ABORT,'audit row'); END;

-- Quote audit fields (pricing contract section 4): applied price kind and the Product order
-- whose receipt enabled an upgrade. Additive columns; the 0003 quote stays immutable.
ALTER TABLE commerce_quotes ADD COLUMN pricing_kind TEXT CHECK(pricing_kind IS NULL OR pricing_kind IN ('purchase','partial','upgrade'));
ALTER TABLE commerce_quotes ADD COLUMN upgrade_basis_order_id TEXT;

-- Manual refund journal (operator only, no route). The money is sent by the owner from the
-- wallet; this single INSERT records it and, through the triggers below, atomically revokes
-- exactly the listed active grants of that order and derives the refunded subtotal from their
-- allocations. Other orders' grants are never touched.
CREATE TABLE commerce_refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES commerce_orders(id),
  item_ids_json TEXT NOT NULL CHECK(json_valid(item_ids_json) AND json_type(item_ids_json)='array' AND json_array_length(item_ids_json) BETWEEN 1 AND 32),
  reason TEXT NOT NULL CHECK(reason IN ('before_download','defect','duplicate_payment','not_delivered','other')),
  refund_reference TEXT NOT NULL CHECK(length(refund_reference) BETWEEN 1 AND 200),
  created_at INTEGER NOT NULL
);
CREATE INDEX commerce_refund_order ON commerce_refunds(order_id,created_at);

CREATE TRIGGER commerce_refund_requires_active_grants BEFORE INSERT ON commerce_refunds
WHEN NOT EXISTS (SELECT 1 FROM commerce_receipts WHERE order_id=NEW.order_id AND status IN ('paid','partially_refunded'))
  OR (SELECT count(DISTINCT value) FROM json_each(NEW.item_ids_json))<>json_array_length(NEW.item_ids_json)
  OR EXISTS (SELECT 1 FROM json_each(NEW.item_ids_json) j WHERE NOT EXISTS (
    SELECT 1 FROM commerce_grants g WHERE g.order_id=NEW.order_id AND g.item_id=j.value AND g.status='active'))
BEGIN SELECT RAISE(ABORT,'refund needs active grants of a paid order'); END;

-- The "before_download" label must be true: no served download of a listed item by that owner.
CREATE TRIGGER commerce_refund_label_truthful BEFORE INSERT ON commerce_refunds
WHEN NEW.reason='before_download' AND EXISTS (
  SELECT 1 FROM commerce_download_events d JOIN commerce_orders o ON o.user_id=d.user_id
  WHERE o.id=NEW.order_id AND d.outcome='served' AND d.item_id IN (SELECT value FROM json_each(NEW.item_ids_json)))
BEGIN SELECT RAISE(ABORT,'item was already downloaded'); END;

CREATE TRIGGER commerce_refund_apply AFTER INSERT ON commerce_refunds
BEGIN
  UPDATE commerce_grants SET status='revoked',revoked_at=NEW.created_at,revoke_reason='refund:'||NEW.id
    WHERE order_id=NEW.order_id AND status='active' AND item_id IN (SELECT value FROM json_each(NEW.item_ids_json));
  UPDATE commerce_receipts SET
    refunded_subtotal_minor=(SELECT coalesce(sum(allocation_minor),0) FROM commerce_grants WHERE order_id=NEW.order_id AND status='revoked' AND revoke_reason LIKE 'refund:%'),
    status=CASE WHEN EXISTS (SELECT 1 FROM commerce_grants WHERE order_id=NEW.order_id AND status='active') THEN 'partially_refunded' ELSE 'refunded' END
    WHERE order_id=NEW.order_id;
END;
CREATE TRIGGER commerce_refund_final BEFORE UPDATE ON commerce_refunds
BEGIN SELECT RAISE(ABORT,'refund record is final'); END;
CREATE TRIGGER commerce_refund_ledger BEFORE DELETE ON commerce_refunds
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
