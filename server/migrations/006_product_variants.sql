-- Run manually after 005. Additive: preserves existing product prices, stock, and carts.
BEGIN;
CREATE TABLE IF NOT EXISTS product_variants (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 sku VARCHAR(80) NOT NULL UNIQUE,
 attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
 price NUMERIC(12,2) NOT NULL CHECK (price > 0),
 stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT variant_attributes_object CHECK (jsonb_typeof(attributes) = 'object'),
 CONSTRAINT unique_product_variant_attributes UNIQUE(product_id, attributes)
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
COMMIT;
-- No automatic backfill: legacy products remain purchasable by product ID until variants are configured.
