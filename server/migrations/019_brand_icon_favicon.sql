-- Phase 27. Run AFTER 018_store_branding.sql, on the intended database.
-- Keep Phase 26 logo_url as legacy artwork. A wide wordmark should not be
-- automatically reused as a new icon, because Nexora text is now permanent.
BEGIN;
ALTER TABLE public.store_branding
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;
COMMIT;
