-- Phase 91: optional per-customer wishlist alerts; no existing wishlists or notifications removed.
BEGIN;
ALTER TABLE customer_wishlist
  ADD COLUMN IF NOT EXISTS alert_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS alert_available BOOLEAN,
  ADD COLUMN IF NOT EXISTS alert_sale BOOLEAN,
  ADD COLUMN IF NOT EXISTS alert_revision BIGINT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS wishlist_alert_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  back_in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  price_drop BOOLEAN NOT NULL DEFAULT TRUE,
  sale_start BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wishlist_alert_scan_idx ON customer_wishlist(product_id, user_id);
COMMIT;
