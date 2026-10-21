-- Phase 45: customer cancellation requests. Additive; back up database before applying.
-- Does not cancel, refund, or release any order/stock by itself.
BEGIN;
CREATE TABLE IF NOT EXISTS order_cancellation_requests (
 order_id BIGINT PRIMARY KEY REFERENCES cod_orders(id) ON DELETE RESTRICT,
 customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 reason VARCHAR(200) NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 200),
 status VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined')),
 requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 reviewed_at TIMESTAMPTZ,
 reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
 admin_response VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS order_cancellation_requests_pending_idx
 ON order_cancellation_requests(requested_at DESC) WHERE status='pending';
ALTER TABLE cod_order_events DROP CONSTRAINT IF EXISTS cod_order_events_event_type_check;
ALTER TABLE cod_order_events ADD CONSTRAINT cod_order_events_event_type_check CHECK(event_type IN
 ('placed','confirmed','processing','shipped','delivered','cancelled','cod_collected','payment_pending',
  'payment_verified','payment_review','payment_expired','refund_requested','refund_pending','refund_processed','refund_review',
  'cancellation_requested','cancellation_declined','cancellation_approved'));
COMMIT;
