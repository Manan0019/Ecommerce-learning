-- Phase 23: COD-only checkout. REVIEW + BACK UP and run manually AFTER 014.
-- No online payments. No orders are placed by running this migration.
BEGIN;
CREATE TABLE IF NOT EXISTS cod_orders (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_key UUID NOT NULL,
 request_digest CHAR(64) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'placed' CHECK(status IN ('placed','confirmed','processing','cancelled')),
 payment_method VARCHAR(12) NOT NULL DEFAULT 'cod' CHECK(payment_method='cod'),
 payment_status VARCHAR(20) NOT NULL DEFAULT 'cod_pending' CHECK(payment_status='cod_pending'),
 currency CHAR(3) NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 subtotal NUMERIC(12,2) NOT NULL CHECK(subtotal > 0),
 shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(shipping_fee=0),
 grand_total NUMERIC(12,2) NOT NULL CHECK(grand_total > 0),
 address_snapshot JSONB NOT NULL CHECK(jsonb_typeof(address_snapshot)='object'),
 placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(customer_id,request_key)
);
CREATE TABLE IF NOT EXISTS cod_order_items (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id BIGINT NOT NULL REFERENCES cod_orders(id) ON DELETE RESTRICT,
 product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
 name_snapshot VARCHAR(255) NOT NULL,
 sku_snapshot VARCHAR(80),
 attributes_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
 image_snapshot TEXT,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
 unit_price NUMERIC(12,2) NOT NULL CHECK(unit_price > 0),
 line_total NUMERIC(12,2) NOT NULL CHECK(line_total > 0)
);
CREATE INDEX IF NOT EXISTS cod_orders_customer_date_idx ON cod_orders(customer_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS cod_orders_status_date_idx ON cod_orders(status, placed_at DESC);
CREATE INDEX IF NOT EXISTS cod_order_items_order_idx ON cod_order_items(order_id);
COMMIT;
