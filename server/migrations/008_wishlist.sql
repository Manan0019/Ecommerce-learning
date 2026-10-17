-- Phase 9: non-destructive customer wishlist; review/run manually.
BEGIN;
CREATE TABLE IF NOT EXISTS customer_wishlist (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS customer_wishlist_product_idx ON customer_wishlist(product_id);
COMMIT;
