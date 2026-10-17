-- Review-only cleanup prepared from the live database audit on 2026-10-16.
-- This script is intentionally not a migration and must be run manually.
-- The product image is handled separately after this transaction succeeds.

BEGIN;

SET LOCAL lock_timeout = '5s';
LOCK TABLE products, categories, product_variants IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  target products%ROWTYPE;
  generic_category categories%ROWTYPE;
BEGIN
  IF to_regclass('public.carts') IS NOT NULL
     OR to_regclass('public.cart_items') IS NOT NULL
     OR to_regclass('public.orders') IS NOT NULL
     OR to_regclass('public.order_items') IS NOT NULL THEN
    RAISE EXCEPTION 'Cleanup refused: cart or order tables now exist; audit their product references first.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'products'::regclass
      AND NOT (
        conrelid = 'product_variants'::regclass
        AND conname = 'product_variants_product_id_fkey'
        AND pg_get_constraintdef(oid) = 'FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE'
      )
  ) THEN
    RAISE EXCEPTION 'Cleanup refused: products now have an unreviewed foreign-key dependency.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'categories'::regclass
      AND NOT (
        conrelid = 'products'::regclass
        AND conname = 'products_category_id_fkey'
        AND pg_get_constraintdef(oid) = 'FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT'
      )
  ) THEN
    RAISE EXCEPTION 'Cleanup refused: categories now have an unreviewed foreign-key dependency.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger trigger
    WHERE trigger.tgrelid IN ('products'::regclass, 'categories'::regclass)
      AND NOT trigger.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Cleanup refused: an unreviewed product or category trigger now exists.';
  END IF;

  SELECT * INTO STRICT generic_category FROM categories WHERE id = 1;
  IF generic_category.name IS DISTINCT FROM 'Electronics'
     OR lower(btrim(generic_category.name)) <> 'electronics'
     OR generic_category.slug IS DISTINCT FROM 'electronics-9ca91fd2ee5f'
     OR generic_category.image_url IS NOT NULL
     OR generic_category.is_active IS DISTINCT FROM TRUE
     OR generic_category.created_at IS DISTINCT FROM TIMESTAMPTZ '2026-10-16 17:18:16.175+05:30'
     OR generic_category.updated_at IS DISTINCT FROM TIMESTAMPTZ '2026-10-16 17:18:16.175+05:30' THEN
    RAISE EXCEPTION 'Cleanup refused: category 1 no longer matches the audited generic Electronics category.';
  END IF;

  SELECT * INTO STRICT target FROM products WHERE id = 1;
  IF target.name IS DISTINCT FROM 'Laptop'
     OR target.description IS DISTINCT FROM 'i9 14th gen'
     OR md5(target.description) <> '84b6f3920081ff7a1a5e7433c6c419c8'
     OR target.category IS DISTINCT FROM 'Electronics'
     OR target.category_id IS DISTINCT FROM 1
     OR target.price IS DISTINCT FROM 20000.00
     OR target.stock IS DISTINCT FROM 20
     OR target.image_url IS DISTINCT FROM '/uploads/products/78e18132-df50-4014-95c6-eb32c711057f.webp'
     OR target.is_active IS DISTINCT FROM TRUE
     OR target.brand IS NOT NULL
     OR target.model IS NOT NULL
     OR target.specifications IS DISTINCT FROM '{}'::jsonb
     OR target.created_at IS DISTINCT FROM TIMESTAMPTZ '2026-10-15 16:52:53.337+05:30'
     OR target.updated_at IS DISTINCT FROM TIMESTAMPTZ '2026-10-15 17:24:22.385+05:30' THEN
    RAISE EXCEPTION 'Cleanup refused: product 1 no longer matches the audited legacy test product.';
  END IF;

  IF (SELECT array_agg(id ORDER BY id) FROM products WHERE category_id = 1)
       IS DISTINCT FROM ARRAY[1::bigint] THEN
    RAISE EXCEPTION 'Cleanup refused: generic category 1 contains a product outside the approved target set.';
  END IF;

  IF EXISTS (SELECT 1 FROM product_variants WHERE product_id = 1) THEN
    RAISE EXCEPTION 'Cleanup refused: product 1 now has product variants.';
  END IF;
END $$;

DELETE FROM products
WHERE id = 1;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM products WHERE id = 1) THEN
    RAISE EXCEPTION 'Cleanup refused: product 1 was not deleted.';
  END IF;
  IF EXISTS (SELECT 1 FROM products WHERE category_id = 1) THEN
    RAISE EXCEPTION 'Cleanup refused: category 1 is not empty.';
  END IF;
END $$;

DELETE FROM categories
WHERE id = 1;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM categories WHERE id = 1) THEN
    RAISE EXCEPTION 'Cleanup refused: category 1 was not deleted.';
  END IF;
END $$;

COMMIT;
