BEGIN;

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_case_insensitive_key
  ON categories ((lower(btrim(name))));

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id BIGINT;

WITH distinct_product_categories AS (
  SELECT DISTINCT ON (lower(btrim(category)))
    btrim(category) AS name,
    lower(btrim(category)) AS normalized_name
  FROM products
  WHERE category IS NOT NULL AND btrim(category) <> ''
  ORDER BY lower(btrim(category)), id
), prepared_categories AS (
  SELECT
    name,
    normalized_name,
    trim(BOTH '-' FROM regexp_replace(
      lower(normalized_name), '[^a-z0-9]+', '-', 'g'
    )) AS slug_base
  FROM distinct_product_categories
)
INSERT INTO categories (name, slug)
SELECT
  name,
  left(CASE WHEN slug_base = '' THEN 'category' ELSE slug_base END, 80)
    || '-' || substr(md5(normalized_name), 1, 12)
FROM prepared_categories
ON CONFLICT ((lower(btrim(name)))) DO NOTHING;

INSERT INTO categories (name, slug)
SELECT 'Uncategorized', 'uncategorized-' || substr(md5('uncategorized'), 1, 12)
WHERE EXISTS (
  SELECT 1 FROM products WHERE category IS NULL OR btrim(category) = ''
)
ON CONFLICT ((lower(btrim(name)))) DO NOTHING;

UPDATE products AS product
SET category_id = category.id
FROM categories AS category
WHERE product.category_id IS NULL
  AND lower(btrim(category.name)) = lower(btrim(product.category));

UPDATE products AS product
SET category_id = category.id
FROM categories AS category
WHERE product.category_id IS NULL
  AND (product.category IS NULL OR btrim(product.category) = '')
  AND lower(category.name) = 'uncategorized';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM products WHERE category_id IS NULL) THEN
    RAISE EXCEPTION 'Category migration could not link every product; no changes were committed.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_category_id_fkey'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE products
  ALTER COLUMN category_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);
CREATE INDEX IF NOT EXISTS categories_active_name_idx ON categories (is_active, name);

COMMIT;
