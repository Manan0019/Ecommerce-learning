-- Phase 38: add manually recorded fulfillment and cash-collection events.
-- IMPORTANT: review and back up the development DB before applying AFTER migration 021.
-- All existing order records, addresses, prices, items and stock are preserved.
BEGIN;
ALTER TABLE cod_orders DROP CONSTRAINT IF EXISTS cod_orders_status_check;
ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_status_check
  CHECK (status IN ('placed','confirmed','processing','shipped','delivered','cancelled'));
ALTER TABLE cod_orders DROP CONSTRAINT IF EXISTS cod_orders_payment_status_check;
ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_payment_status_check
  CHECK (payment_status IN ('cod_pending','cod_collected'));
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS delivery_partner VARCHAR(80);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS tracking_reference VARCHAR(100);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS cod_collected_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS cod_order_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES cod_orders(id) ON DELETE RESTRICT,
  event_type VARCHAR(32) NOT NULL CHECK(event_type IN ('placed','confirmed','processing','shipped','delivered','cancelled','cod_collected')),
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  notes VARCHAR(200),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cod_order_events_order_idx ON cod_order_events(order_id,id);
-- Backfill a single *current status* event; do not fabricate historical transitions.
INSERT INTO cod_order_events (order_id, event_type, actor_user_id, notes, recorded_at)
SELECT o.id, o.status, NULL, 'Status recorded during Phase 38 upgrade; earlier history not available.', o.updated_at
FROM cod_orders o
WHERE NOT EXISTS (SELECT 1 FROM cod_order_events e WHERE e.order_id=o.id);
COMMIT;
