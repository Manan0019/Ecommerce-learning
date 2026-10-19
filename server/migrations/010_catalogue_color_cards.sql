-- Phase 16: non-destructive media card-cover flag. Review first; execute manually
-- after migration 009 with a development DB backup. This does NOT create products.
BEGIN;
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS is_card_cover BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS product_media_one_option_card_cover
  ON product_media(product_id, option_key, option_value)
  WHERE is_card_cover AND option_key IS NOT NULL AND variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_media_one_sku_card_cover
  ON product_media(product_id, variant_id)
  WHERE is_card_cover AND variant_id IS NOT NULL;
COMMIT;
