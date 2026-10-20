-- Phase 36: a separate small navigation icon for every category (including nested categories).
-- Apply after 020_banner_visual_mode.sql, with a verified database backup.
BEGIN;
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS menu_icon_url TEXT;
COMMIT;
