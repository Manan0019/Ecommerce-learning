BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand VARCHAR(80),
  ADD COLUMN IF NOT EXISTS model VARCHAR(120),
  ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_specifications_object'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_specifications_object
      CHECK (jsonb_typeof(specifications) = 'object');
  END IF;
END $$;

INSERT INTO categories (name, slug)
VALUES
  ('Smartphones', 'electronics-smartphones'),
  ('Laptops', 'electronics-laptops'),
  ('Smartwatches', 'electronics-smartwatches'),
  ('Tablets', 'electronics-tablets'),
  ('Headphones & Audio', 'electronics-audio'),
  ('Gaming Accessories', 'electronics-gaming-accessories'),
  ('Other Electronics', 'other-electronics')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS products_specifications_gin_idx
  ON products USING GIN (specifications jsonb_path_ops);

CREATE INDEX IF NOT EXISTS products_brand_lower_idx
  ON products ((lower(brand)))
  WHERE brand IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_electronics_search_idx
  ON products USING GIN (
    to_tsvector(
      'simple'::regconfig,
      coalesce(name, '') || ' ' ||
      coalesce(brand, '') || ' ' ||
      coalesce(model, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(specifications::text, '')
    )
  );

CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(80),
  ram_gb INTEGER,
  storage_gb INTEGER,
  price NUMERIC(12, 2),
  stock INTEGER NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_variants_stock_nonnegative CHECK (stock >= 0),
  CONSTRAINT product_variants_price_positive CHECK (price IS NULL OR price > 0),
  CONSTRAINT product_variants_ram_positive CHECK (ram_gb IS NULL OR ram_gb > 0),
  CONSTRAINT product_variants_storage_positive CHECK (storage_gb IS NULL OR storage_gb > 0),
  CONSTRAINT product_variants_attributes_object CHECK (jsonb_typeof(attributes) = 'object')
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx
  ON product_variants (product_id, is_active);

COMMIT;
