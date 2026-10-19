-- Phase 18: additive extension of Phase 17 promotion positions. Review and back up first.
-- Requires migration 011. No products, users, or banners are deleted.
BEGIN;
ALTER TABLE promotion_banners DROP CONSTRAINT IF EXISTS promotion_banners_position_check;
ALTER TABLE promotion_banners DROP CONSTRAINT IF EXISTS promotion_banners_target;
ALTER TABLE promotion_banners ADD CONSTRAINT promotion_banners_position_check
  CHECK (position IN ('home','category','both'));
ALTER TABLE promotion_banners ADD CONSTRAINT promotion_banners_target
  CHECK ((position='home' AND category_id IS NULL)
      OR (position IN ('category','both') AND category_id IS NOT NULL));
COMMIT;
