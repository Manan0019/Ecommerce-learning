-- Phase 41: Allow up to six homepage banners at once and configure auto rotation.
-- Back up development PostgreSQL and apply AFTER migration 023. Existing banners unchanged.
BEGIN;
ALTER TABLE public.promotion_display_settings
  DROP CONSTRAINT IF EXISTS promotion_display_settings_home_visible_count_check;
ALTER TABLE public.promotion_display_settings
  DROP CONSTRAINT IF EXISTS promotion_home_count_valid;
ALTER TABLE public.promotion_display_settings
  ADD CONSTRAINT promotion_home_count_valid CHECK (home_visible_count BETWEEN 1 AND 6);
ALTER TABLE public.promotion_display_settings
  ADD COLUMN IF NOT EXISTS home_autoplay BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS home_rotate_seconds SMALLINT NOT NULL DEFAULT 6;
ALTER TABLE public.promotion_display_settings
  DROP CONSTRAINT IF EXISTS promotion_home_rotation_valid;
ALTER TABLE public.promotion_display_settings
  ADD CONSTRAINT promotion_home_rotation_valid CHECK (home_rotate_seconds BETWEEN 3 AND 15);
COMMIT;
