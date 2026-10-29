-- Per-promotion text styling. NULL retains pre-existing visual presentation.
-- Run once after migration 043. Does not rewrite existing promotion records.
BEGIN;
ALTER TABLE public.promotion_banners
  ADD COLUMN IF NOT EXISTS text_style JSONB;
ALTER TABLE public.promotion_banners
  DROP CONSTRAINT IF EXISTS promotion_text_style_object;
ALTER TABLE public.promotion_banners
  ADD CONSTRAINT promotion_text_style_object
  CHECK (text_style IS NULL OR jsonb_typeof(text_style) = 'object');
COMMIT;
