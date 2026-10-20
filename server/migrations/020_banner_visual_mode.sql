-- Phase 35. Run once on the same development DB after 019.
-- Existing banners retain their current readable text overlay by default.
BEGIN;
ALTER TABLE public.promotion_banners
  ADD COLUMN IF NOT EXISTS show_text BOOLEAN NOT NULL DEFAULT TRUE;
COMMIT;
