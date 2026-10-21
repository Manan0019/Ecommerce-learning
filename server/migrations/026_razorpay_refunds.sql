-- Phase 43: administrator-approved FULL refunds, before dispatch, for captured Razorpay payments.
-- Additive change. Backup database and review before npm run migrate.
BEGIN;
ALTER TABLE cod_orders DROP CONSTRAINT IF EXISTS cod_orders_status_check;
ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_status_check CHECK(status IN
 ('placed','confirmed','processing','shipped','delivered','cancelled','payment_pending','payment_review','payment_expired','refund_pending','refund_review'));
ALTER TABLE cod_orders DROP CONSTRAINT IF EXISTS cod_orders_payment_status_check;
ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_payment_status_check CHECK(payment_status IN
 ('cod_pending','cod_collected','razorpay_pending','razorpay_paid','razorpay_review','razorpay_expired','razorpay_refunded'));
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS razorpay_refund_id VARCHAR(100);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS refund_request_key VARCHAR(100);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(200);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ;
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ;
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS refund_checked_at TIMESTAMPTZ;
ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_refund_status_check CHECK(refund_status IS NULL OR refund_status IN ('requested','pending','processed','failed','review'));
CREATE UNIQUE INDEX IF NOT EXISTS cod_orders_razorpay_refund_unique ON cod_orders(razorpay_refund_id) WHERE razorpay_refund_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cod_orders_refund_request_unique ON cod_orders(refund_request_key) WHERE refund_request_key IS NOT NULL;
ALTER TABLE cod_order_events DROP CONSTRAINT IF EXISTS cod_order_events_event_type_check;
ALTER TABLE cod_order_events ADD CONSTRAINT cod_order_events_event_type_check CHECK(event_type IN
 ('placed','confirmed','processing','shipped','delivered','cancelled','cod_collected','payment_pending',
  'payment_verified','payment_review','payment_expired','refund_requested','refund_pending','refund_processed','refund_review'));
COMMIT;
