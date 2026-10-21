-- Nexora Phase 42: additive Razorpay checkout support.
-- Back up and review your database BEFORE running npm run migrate.
-- Historical COD orders, prices, tax records and stock are not modified.
BEGIN;
ALTER TABLE cod_orders DROP CONSTRAINT IF EXISTS cod_orders_payment_method_check;
ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_payment_method_check
  CHECK (payment_method IN ('cod', 'razorpay'));
ALTER TABLE cod_orders DROP CONSTRAINT IF EXISTS cod_orders_payment_status_check;
ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_payment_status_check
  CHECK (payment_status IN ('cod_pending','cod_collected','razorpay_pending','razorpay_paid','razorpay_review','razorpay_expired'));
ALTER TABLE cod_orders DROP CONSTRAINT IF EXISTS cod_orders_status_check;
ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_status_check
  CHECK (status IN ('placed','confirmed','processing','shipped','delivered','cancelled','payment_pending','payment_review','payment_expired'));
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS payment_review_note VARCHAR(200);
CREATE UNIQUE INDEX IF NOT EXISTS cod_orders_razorpay_order_unique ON cod_orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cod_orders_razorpay_payment_unique ON cod_orders(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
ALTER TABLE cod_order_events DROP CONSTRAINT IF EXISTS cod_order_events_event_type_check;
ALTER TABLE cod_order_events ADD CONSTRAINT cod_order_events_event_type_check
  CHECK (event_type IN ('placed','confirmed','processing','shipped','delivered','cancelled','cod_collected',
    'payment_pending','payment_verified','payment_review','payment_expired'));
CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  event_id VARCHAR(150) PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
