-- Phase 61: opt-in newsletter, authenticated purchase reviews, manual sale badges.
-- New relationships only. No changes to order history, payment values or stock.
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_sale_badge BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 email VARCHAR(254) NOT NULL,
 consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 is_subscribed BOOLEAN NOT NULL DEFAULT TRUE,
 unsubscribe_token VARCHAR(64) NOT NULL UNIQUE,
 unsubscribed_at TIMESTAMPTZ,
 CONSTRAINT newsletter_email_lower_unique UNIQUE(email)
);
CREATE TABLE IF NOT EXISTS product_reviews (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 order_id BIGINT NOT NULL REFERENCES cod_orders(id) ON DELETE RESTRICT,
 rating SMALLINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
 title VARCHAR(100) NOT NULL,
 body VARCHAR(1200) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 moderated_at TIMESTAMPTZ,
 moderated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT product_reviews_customer_product_unique UNIQUE(product_id,customer_id)
);
CREATE INDEX IF NOT EXISTS product_reviews_public_idx ON product_reviews(product_id,created_at DESC) WHERE status='approved';
CREATE INDEX IF NOT EXISTS product_reviews_moderation_idx ON product_reviews(status,created_at DESC);
COMMIT;
