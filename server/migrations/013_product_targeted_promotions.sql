-- Phase 19: review and back up before running in the development database.
-- Requires Phase 18 migration 012. Existing banners are preserved.
BEGIN;
ALTER TABLE promotion_banners ADD COLUMN IF NOT EXISTS product_id BIGINT;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='promotion_banners_product_fk'
       AND conrelid='promotion_banners'::regclass
  ) THEN
    ALTER TABLE promotion_banners ADD CONSTRAINT promotion_banners_product_fk
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
  END IF;
END $$;
ALTER TABLE promotion_banners DROP CONSTRAINT IF EXISTS promotion_banners_position_check;
ALTER TABLE promotion_banners DROP CONSTRAINT IF EXISTS promotion_banners_target;
ALTER TABLE promotion_banners ADD CONSTRAINT promotion_banners_position_check
  CHECK (position IN ('home','category','both','product','home_product'));
ALTER TABLE promotion_banners ADD CONSTRAINT promotion_banners_target
  CHECK (
     (position='home' AND category_id IS NULL AND product_id IS NULL)
  OR (position IN ('category','both') AND category_id IS NOT NULL AND product_id IS NULL)
  OR (position IN ('product','home_product') AND product_id IS NOT NULL AND category_id IS NULL)
  );
CREATE INDEX IF NOT EXISTS promotion_banners_product_live_idx
  ON promotion_banners(product_id, is_active, sort_order) WHERE product_id IS NOT NULL;
COMMIT;
