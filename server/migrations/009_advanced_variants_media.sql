-- Phase 13. REVIEW and run manually only after 004-008, on a backed-up database.
-- Non-destructive: existing variants keep their original price and receive MRP=price (0% discount).
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2);
UPDATE products SET mrp=price WHERE mrp IS NULL;
ALTER TABLE products ALTER COLUMN mrp SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='products'::regclass AND conname='products_mrp_valid') THEN
    ALTER TABLE products ADD CONSTRAINT products_mrp_valid CHECK (mrp >= price AND mrp > 0);
  END IF;
END $$;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2);
UPDATE product_variants SET mrp = price WHERE mrp IS NULL;
ALTER TABLE product_variants ALTER COLUMN mrp SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='product_variants'::regclass AND conname='product_variants_mrp_valid') THEN
    ALTER TABLE product_variants ADD CONSTRAINT product_variants_mrp_valid CHECK (mrp >= price AND mrp > 0);
  END IF;
END $$;
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS option_key VARCHAR(40);
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS option_value VARCHAR(80);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='product_media'::regclass AND conname='product_media_option_scope_valid') THEN
    ALTER TABLE product_media ADD CONSTRAINT product_media_option_scope_valid CHECK (
      (option_key IS NULL AND option_value IS NULL) OR
      (option_key IS NOT NULL AND option_value IS NOT NULL AND btrim(option_value) <> '' AND variant_id IS NULL)
    );
  END IF;
END $$;
-- Ensure legacy cover files are visible in gallery, even for products created after migration 004.
INSERT INTO product_media(product_id,media_type,media_url,sort_order)
SELECT p.id,'image',p.image_url,0
FROM products p
WHERE p.image_url IS NOT NULL AND btrim(p.image_url) <> ''
  AND NOT EXISTS (SELECT 1 FROM product_media m WHERE m.product_id=p.id AND m.media_type='image' AND m.media_url=p.image_url);
CREATE INDEX IF NOT EXISTS product_media_option_lookup_idx ON product_media(product_id,option_key,option_value);
COMMIT;
