-- Additive subscription fulfillment ledger. Requires 0001 (TON), 0002 (auth) and 0003 (commerce).
-- Does not enable sales, does not create releases and never marks anything paid.
-- Paid -> fulfilled happens only inside the fulfillment worker's single D1 batch.

-- Receipts: copied from the paid order, its immutable quote and settled invoice.
CREATE TABLE commerce_receipts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES commerce_orders(id),
  user_id TEXT NOT NULL REFERENCES auth_user(id),
  quote_id TEXT NOT NULL UNIQUE REFERENCES commerce_quotes(id),
  invoice_id TEXT NOT NULL UNIQUE REFERENCES ton_invoices(id),
  plan TEXT NOT NULL CHECK(plan IN ('product','all')),
  kind TEXT NOT NULL DEFAULT 'term' CHECK(kind IN ('term','upgrade')),
  months INTEGER,
  currency TEXT NOT NULL CHECK(currency='USDT'),
  subtotal_minor INTEGER NOT NULL CHECK(subtotal_minor>0 AND subtotal_minor<=100000000),
  tax_minor INTEGER NOT NULL CHECK(tax_minor>=0 AND tax_minor<=100000000),
  total_minor INTEGER NOT NULL CHECK(total_minor=subtotal_minor+tax_minor),
  -- Amount support actually sent back for this period (manual refund); never more than paid.
  refunded_subtotal_minor INTEGER NOT NULL DEFAULT 0 CHECK(refunded_subtotal_minor>=0 AND refunded_subtotal_minor<=subtotal_minor),
  asset TEXT NOT NULL CHECK(asset IN ('TON','USDT')),
  amount_base_units TEXT NOT NULL,
  terms_revision TEXT NOT NULL,
  tax_revision TEXT NOT NULL,
  paid_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid','refunded','disputed')),
  CHECK((kind='term' AND months IS NOT NULL AND months BETWEEN 1 AND 12) OR (kind='upgrade' AND plan='all' AND months IS NULL))
);
CREATE INDEX commerce_receipt_owner ON commerce_receipts(user_id,paid_at);

-- One access period per paid order: the level is open from starts_at (inclusive) to ends_at
-- (exclusive). A renewal starts at the current end of the same level, so remaining days are kept.
-- An upgrade period opens «Всё» from its payment to the end of the Product access it replaces.
CREATE TABLE commerce_access_periods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_user(id),
  order_id TEXT NOT NULL UNIQUE REFERENCES commerce_orders(id),
  plan TEXT NOT NULL CHECK(plan IN ('product','all')),
  kind TEXT NOT NULL DEFAULT 'term' CHECK(kind IN ('term','upgrade')),
  months INTEGER,
  paid_at INTEGER NOT NULL,
  starts_at INTEGER NOT NULL CHECK(starts_at>=paid_at),
  ends_at INTEGER NOT NULL CHECK(ends_at>starts_at),
  -- 'revoked': closed by a refund or an operator; 'upgraded': its rest became «Всё» (revoke_reason upgrade:<order>).
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','upgraded')),
  revoked_at INTEGER,
  revoke_reason TEXT,
  created_at INTEGER NOT NULL,
  CHECK((status='active' AND revoked_at IS NULL AND revoke_reason IS NULL) OR (status<>'active' AND revoked_at IS NOT NULL AND revoke_reason IS NOT NULL)),
  CHECK((kind='term' AND months IS NOT NULL AND months BETWEEN 1 AND 12) OR (kind='upgrade' AND plan='all' AND months IS NULL))
);
CREATE INDEX commerce_access_owner ON commerce_access_periods(user_id,status,ends_at);

-- Append-only history of every status change of a period (closed by a refund, an operator or an
-- upgrade; reopened after an upgrade refund), so reopening never erases what happened.
CREATE TABLE commerce_access_period_events (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES commerce_access_periods(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX commerce_access_event_period ON commerce_access_period_events(period_id,at);
CREATE TRIGGER commerce_access_status_history AFTER UPDATE OF status ON commerce_access_periods
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO commerce_access_period_events(id,period_id,from_status,to_status,reason,at)
  VALUES(lower(hex(randomblob(16))),NEW.id,OLD.status,NEW.status,coalesce(NEW.revoke_reason,OLD.revoke_reason),
    coalesce(NEW.revoked_at,(SELECT max(f.created_at) FROM commerce_refunds f JOIN commerce_access_periods u ON u.id=f.period_id
      WHERE u.order_id=substr(OLD.revoke_reason,9) AND u.user_id=OLD.user_id AND u.kind='upgrade')));
END;
CREATE TRIGGER commerce_access_event_final BEFORE UPDATE ON commerce_access_period_events
BEGIN SELECT RAISE(ABORT,'audit row'); END;
CREATE TRIGGER commerce_access_event_ledger BEFORE DELETE ON commerce_access_period_events
BEGIN SELECT RAISE(ABORT,'audit row'); END;

-- Worker state per settled invoice. 'fulfilled' is written in the same batch as receipt+period.
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

-- Operator closure of a paid invoice that cannot be fulfilled (fulfillment in review): the money
-- was sent back from the wallet. Append-only; it releases the one-open-checkout lock for that
-- invoice and keeps the fulfillment from ever running again.
CREATE TABLE commerce_review_refunds (
  invoice_id TEXT PRIMARY KEY REFERENCES ton_invoices(id),
  amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
  reason TEXT NOT NULL CHECK(reason IN ('not_delivered','duplicate_payment','other')),
  refund_reference TEXT NOT NULL CHECK(length(refund_reference) BETWEEN 1 AND 200),
  created_at INTEGER NOT NULL
);
CREATE TRIGGER commerce_review_refund_requires_review BEFORE INSERT ON commerce_review_refunds
WHEN NOT EXISTS (SELECT 1 FROM ton_invoices i JOIN commerce_fulfillments f ON f.invoice_id=i.id
    WHERE i.id=NEW.invoice_id AND i.status='paid' AND f.state='review' AND NEW.amount_minor<=json_extract(i.fx_snapshot_json,'$.usdMinor'))
  OR EXISTS (SELECT 1 FROM commerce_receipts r WHERE r.invoice_id=NEW.invoice_id)
BEGIN SELECT RAISE(ABORT,'refund needs a paid invoice in review'); END;
CREATE TRIGGER commerce_review_refund_final BEFORE UPDATE ON commerce_review_refunds
BEGIN SELECT RAISE(ABORT,'refund record is final'); END;
CREATE TRIGGER commerce_review_refund_ledger BEFORE DELETE ON commerce_review_refunds
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
CREATE TRIGGER commerce_fulfillment_refunded_final BEFORE UPDATE OF state ON commerce_fulfillments
WHEN OLD.state='review' AND NEW.state<>'review' AND EXISTS (SELECT 1 FROM commerce_review_refunds WHERE invoice_id=OLD.invoice_id)
BEGIN SELECT RAISE(ABORT,'refunded fulfillment is final'); END;
-- Money sent back for a payment means it is never fulfilled afterwards, not even by hand.
CREATE TRIGGER commerce_order_paid_not_refunded BEFORE UPDATE OF status,paid_at ON commerce_orders
WHEN NEW.status='paid' AND EXISTS (SELECT 1 FROM ton_invoices i JOIN commerce_review_refunds rr ON rr.invoice_id=i.id
  WHERE i.quote_id=NEW.quote_id AND i.user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'payment was refunded'); END;
CREATE TRIGGER commerce_receipt_not_refunded BEFORE INSERT ON commerce_receipts
WHEN EXISTS (SELECT 1 FROM commerce_review_refunds WHERE invoice_id=NEW.invoice_id)
BEGIN SELECT RAISE(ABORT,'payment was refunded'); END;

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
    AND q.plan=NEW.plan AND q.kind=NEW.kind AND q.months IS NEW.months AND q.currency=NEW.currency
    AND q.subtotal_minor=NEW.subtotal_minor AND q.tax_minor=NEW.tax_minor AND q.total_minor=NEW.total_minor
    AND i.asset=NEW.asset AND i.amount_base_units=NEW.amount_base_units
    AND q.terms_revision=NEW.terms_revision AND q.tax_revision=NEW.tax_revision
    AND i.item_ids_json=q.item_ids_json AND i.terms_revision=q.terms_revision
    AND json_extract(i.fx_snapshot_json,'$.usdMinor')=q.total_minor
    AND EXISTS (SELECT 1 FROM ton_payment_events e WHERE e.event_key=i.settlement_event_key AND e.invoice_id=i.id
      AND e.outcome='paid' AND e.reason='exact' AND e.transaction_at=i.paid_at)
)
BEGIN SELECT RAISE(ABORT,'paid order required'); END;

-- A period needs that receipt: same owner, level, kind and term. A term lasts 28-31 days per paid
-- month; an upgrade runs from its payment to the Product end fixed in its quote.
CREATE TRIGGER commerce_access_requires_receipt BEFORE INSERT ON commerce_access_periods
WHEN NEW.status<>'active'
  OR (NEW.kind='term' AND (NEW.months IS NULL OR NEW.ends_at-NEW.starts_at NOT BETWEEN NEW.months*2419200 AND NEW.months*2678400))
  OR (NEW.kind='upgrade' AND (NEW.plan<>'all' OR NEW.months IS NOT NULL OR NEW.starts_at<>NEW.paid_at OR NOT EXISTS (
    SELECT 1 FROM commerce_orders o JOIN commerce_quotes q ON q.id=o.quote_id AND q.user_id=o.user_id
    WHERE o.id=NEW.order_id AND q.kind='upgrade' AND q.current_access_end=NEW.ends_at)))
  OR NOT EXISTS (
  SELECT 1 FROM commerce_receipts r JOIN commerce_orders o ON o.id=r.order_id AND o.user_id=r.user_id
  WHERE r.order_id=NEW.order_id AND r.user_id=NEW.user_id AND r.paid_at=NEW.paid_at
    AND o.status='paid' AND r.status='paid' AND r.plan=NEW.plan AND r.kind=NEW.kind AND r.months IS NEW.months
)
BEGIN SELECT RAISE(ABORT,'paid receipt required'); END;

-- Renewal continues exactly from the latest paid end of the same level, or starts at payment:
-- remaining days are never lost and periods of one level never overlap.
CREATE TRIGGER commerce_access_continues BEFORE INSERT ON commerce_access_periods
WHEN NEW.starts_at<>max(NEW.paid_at,coalesce((SELECT max(p.ends_at) FROM commerce_access_periods p
  WHERE p.user_id=NEW.user_id AND p.plan=NEW.plan AND p.status='active' AND p.order_id<>NEW.order_id),0))
BEGIN SELECT RAISE(ABORT,'access must continue from the current end'); END;

-- Two levels are never open at once: a new term of another level waits for the paid one to end;
-- an upgrade first closes the remaining Product periods in the same batch.
CREATE TRIGGER commerce_access_one_level BEFORE INSERT ON commerce_access_periods
WHEN EXISTS (SELECT 1 FROM commerce_access_periods p WHERE p.user_id=NEW.user_id AND p.plan<>NEW.plan
  AND p.status='active' AND p.ends_at>NEW.starts_at)
BEGIN SELECT RAISE(ABORT,'another level is active'); END;

-- An upgrade period is backed, without gaps, by the Product periods this upgrade closed: one of
-- them covers the payment, the last ends where «Всё» ends, and each of the others is directly
-- followed by another. «Всё» never covers refunded or unpaid time.
CREATE TRIGGER commerce_access_upgrade_backed BEFORE INSERT ON commerce_access_periods
WHEN NEW.kind='upgrade' AND (
  NOT EXISTS (SELECT 1 FROM commerce_access_periods p WHERE p.user_id=NEW.user_id AND p.status='upgraded'
    AND p.revoke_reason='upgrade:'||NEW.order_id AND p.starts_at<=NEW.starts_at AND p.ends_at>NEW.starts_at)
  OR (SELECT max(p.ends_at) FROM commerce_access_periods p WHERE p.user_id=NEW.user_id AND p.status='upgraded'
    AND p.revoke_reason='upgrade:'||NEW.order_id) IS NOT NEW.ends_at
  OR EXISTS (SELECT 1 FROM commerce_access_periods p WHERE p.user_id=NEW.user_id AND p.status='upgraded'
    AND p.revoke_reason='upgrade:'||NEW.order_id AND p.ends_at<NEW.ends_at AND NOT EXISTS (
      SELECT 1 FROM commerce_access_periods n WHERE n.user_id=NEW.user_id AND n.status='upgraded'
        AND n.revoke_reason='upgrade:'||NEW.order_id AND n.starts_at<=p.ends_at AND n.ends_at>p.ends_at)))
BEGIN SELECT RAISE(ABORT,'upgrade must be backed by uninterrupted Product access'); END;

CREATE TRIGGER commerce_receipt_immutable BEFORE UPDATE OF id,order_id,user_id,quote_id,invoice_id,plan,kind,months,currency,subtotal_minor,tax_minor,total_minor,asset,amount_base_units,terms_revision,tax_revision,paid_at,created_at ON commerce_receipts
BEGIN SELECT RAISE(ABORT,'immutable commerce receipt'); END;
CREATE TRIGGER commerce_access_immutable BEFORE UPDATE OF id,user_id,order_id,plan,kind,months,paid_at,starts_at,ends_at,created_at ON commerce_access_periods
BEGIN SELECT RAISE(ABORT,'immutable access period'); END;
-- Closed periods stay closed. The one exception: a refund of a switch to «Всё» reopens the
-- Product periods that switch closed (see commerce_refund_apply).
CREATE TRIGGER commerce_access_closing_final BEFORE UPDATE OF status,revoked_at,revoke_reason ON commerce_access_periods
WHEN OLD.status<>'active' AND NOT (OLD.status='upgraded' AND NEW.status='active' AND EXISTS (
  SELECT 1 FROM commerce_access_periods u JOIN commerce_refunds f ON f.period_id=u.id
  WHERE u.order_id=substr(OLD.revoke_reason,9) AND u.user_id=OLD.user_id AND u.kind='upgrade' AND u.status='revoked'))
BEGIN SELECT RAISE(ABORT,'closed period is final'); END;
-- A Product period becomes 'upgraded' only with the paid upgrade receipt named in revoke_reason, at its payment time.
CREATE TRIGGER commerce_access_upgrade_requires_receipt BEFORE UPDATE OF status ON commerce_access_periods
WHEN NEW.status='upgraded' AND NOT (OLD.status='active' AND OLD.plan='product' AND NEW.revoke_reason LIKE 'upgrade:%' AND EXISTS (
  SELECT 1 FROM commerce_receipts r WHERE r.order_id=substr(NEW.revoke_reason,9) AND r.user_id=OLD.user_id
    AND r.kind='upgrade' AND r.status='paid' AND r.paid_at=NEW.revoked_at AND OLD.ends_at>r.paid_at))
BEGIN SELECT RAISE(ABORT,'upgrade receipt required'); END;
CREATE TRIGGER commerce_receipt_ledger BEFORE DELETE ON commerce_receipts
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
CREATE TRIGGER commerce_access_ledger BEFORE DELETE ON commerce_access_periods
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

-- One open checkout per user and overlapping level (Product items are part of «Всё»): a second
-- invoice cannot be issued while another unexpired invoice, or a paid but not yet delivered one,
-- covers any of the same items.
CREATE TRIGGER ton_invoice_one_open_checkout BEFORE INSERT ON ton_invoices
WHEN EXISTS (SELECT 1 FROM ton_invoices i WHERE i.user_id=NEW.user_id AND i.quote_id<>NEW.quote_id
  AND ((i.status IN ('pending','expired') AND i.expires_at>NEW.created_at)
    OR (i.status='paid' AND i.delivery_state<>'delivered' AND NOT EXISTS (SELECT 1 FROM commerce_review_refunds r WHERE r.invoice_id=i.id)))
  AND EXISTS (SELECT 1 FROM json_each(i.item_ids_json) a WHERE a.value IN (SELECT value FROM json_each(NEW.item_ids_json))))
BEGIN SELECT RAISE(ABORT,'checkout in progress'); END;

-- Refund and revocation history only moves forward; a receipt is refunded only with its period closed.
CREATE TRIGGER commerce_receipt_history_forward BEFORE UPDATE OF status,refunded_subtotal_minor ON commerce_receipts
WHEN OLD.status='refunded' OR NEW.refunded_subtotal_minor<OLD.refunded_subtotal_minor
  OR (NEW.status='paid' AND (OLD.status<>'paid' OR NEW.refunded_subtotal_minor<>0))
  OR (NEW.status='refunded' AND EXISTS (SELECT 1 FROM commerce_access_periods WHERE order_id=NEW.order_id AND status='active'))
BEGIN SELECT RAISE(ABORT,'receipt history only moves forward'); END;
CREATE TRIGGER commerce_fulfillment_ledger BEFORE DELETE ON commerce_fulfillments
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
CREATE TRIGGER commerce_download_event_final BEFORE UPDATE ON commerce_download_events
BEGIN SELECT RAISE(ABORT,'audit row'); END;
CREATE TRIGGER commerce_download_event_ledger BEFORE DELETE ON commerce_download_events
BEGIN SELECT RAISE(ABORT,'audit row'); END;

-- Manual refund journal, one record per paid period (operator only, no route). The money is sent
-- by the owner from the wallet; this single INSERT records it and, through the triggers below,
-- atomically closes exactly that period and stores the amount on its receipt. Other periods,
-- renewals included, are never touched. Policy (Max Tall, 27.11): the trigger below.
CREATE TABLE commerce_refunds (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL UNIQUE REFERENCES commerce_access_periods(id),
  amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
  reason TEXT NOT NULL CHECK(reason IN ('before_download','defect','duplicate_payment','not_delivered','other')),
  refund_reference TEXT NOT NULL CHECK(length(refund_reference) BETWEEN 1 AND 200),
  created_at INTEGER NOT NULL
);

CREATE TRIGGER commerce_refund_requires_active_period BEFORE INSERT ON commerce_refunds
WHEN NOT EXISTS (SELECT 1 FROM commerce_access_periods p JOIN commerce_receipts r ON r.order_id=p.order_id AND r.user_id=p.user_id
  WHERE p.id=NEW.period_id AND p.status='active' AND r.status='paid' AND NEW.amount_minor<=r.subtotal_minor)
BEGIN SELECT RAISE(ABORT,'refund needs an active paid period'); END;

-- Refund policy (Max Tall, 27.11): money back only if nothing was served to the owner after this
-- payment; after a download only a defect or a duplicate payment is refunded.
CREATE TRIGGER commerce_refund_policy BEFORE INSERT ON commerce_refunds
WHEN NEW.reason NOT IN ('defect','duplicate_payment') AND EXISTS (
  SELECT 1 FROM commerce_download_events d JOIN commerce_access_periods p ON p.user_id=d.user_id
  WHERE p.id=NEW.period_id AND d.outcome='served' AND d.created_at>=p.paid_at)
BEGIN SELECT RAISE(ABORT,'already downloaded after this payment: only a defect or a duplicate payment is refunded'); END;

CREATE TRIGGER commerce_refund_apply AFTER INSERT ON commerce_refunds
BEGIN
  UPDATE commerce_access_periods SET status='revoked',revoked_at=NEW.created_at,revoke_reason='refund:'||NEW.id
    WHERE id=NEW.period_id AND status='active';
  UPDATE commerce_receipts SET refunded_subtotal_minor=NEW.amount_minor,status='refunded'
    WHERE order_id=(SELECT order_id FROM commerce_access_periods WHERE id=NEW.period_id);
  -- Refunding a switch to «Всё» undoes it: the Product periods it closed are open again.
  UPDATE commerce_access_periods SET status='active',revoked_at=NULL,revoke_reason=NULL
    WHERE status='upgraded' AND revoke_reason='upgrade:'||(SELECT order_id FROM commerce_access_periods WHERE id=NEW.period_id AND kind='upgrade');
END;
CREATE TRIGGER commerce_refund_final BEFORE UPDATE ON commerce_refunds
BEGIN SELECT RAISE(ABORT,'refund record is final'); END;
CREATE TRIGGER commerce_refund_ledger BEFORE DELETE ON commerce_refunds
BEGIN SELECT RAISE(ABORT,'ledger row'); END;
