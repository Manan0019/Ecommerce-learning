-- Phase 25, inspect and backup FIRST; apply AFTER migration 016.
-- Product selling prices and shipping fees are GST-inclusive; no online payments.
BEGIN;
CREATE TABLE IF NOT EXISTS customer_addresses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(30) NOT NULL DEFAULT 'Home',
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(18) NOT NULL,
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200) NOT NULL DEFAULT '',
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(6) NOT NULL CHECK(pincode ~ '^[0-9]{6}$'),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_addresses_owner_idx ON customer_addresses(customer_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default_idx ON customer_addresses(customer_id) WHERE is_default;
CREATE TABLE IF NOT EXISTS store_checkout_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK(id=1),
  origin_state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
  shipping_fee_in_state NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(shipping_fee_in_state BETWEEN 0 AND 100000),
  shipping_fee_other_state NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(shipping_fee_other_state BETWEEN 0 AND 100000),
  free_shipping_above NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(free_shipping_above BETWEEN 0 AND 10000000),
  shipping_gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(shipping_gst_percent BETWEEN 0 AND 40),
  default_item_gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(default_item_gst_percent BETWEEN 0 AND 40),
  cod_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO store_checkout_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_gst_percent_range') THEN
    ALTER TABLE products ADD CONSTRAINT products_gst_percent_range CHECK(gst_percent IS NULL OR gst_percent BETWEEN 0 AND 40);
  END IF;
END $$;
ALTER TABLE cod_orders DROP CONSTRAINT IF EXISTS cod_orders_shipping_fee_check;
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS tax_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(tax_total >= 0);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS taxable_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(taxable_value >= 0);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS cgst NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(cgst >= 0);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS sgst NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(sgst >= 0);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS igst NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(igst >= 0);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cod_orders_shipping_fee_nonnegative') THEN
    ALTER TABLE cod_orders ADD CONSTRAINT cod_orders_shipping_fee_nonnegative CHECK(shipping_fee >= 0);
  END IF;
END $$;
ALTER TABLE cod_order_items ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE cod_order_items ADD COLUMN IF NOT EXISTS included_tax NUMERIC(12,2) NOT NULL DEFAULT 0;
COMMIT;
