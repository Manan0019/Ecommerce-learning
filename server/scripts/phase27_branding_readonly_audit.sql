-- READ ONLY. Open pgAdmin on intended DB after migration 019.
SELECT current_database() AS db_name,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_branding' AND column_name='icon_url') AS has_icon_column,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_branding' AND column_name='favicon_url') AS has_favicon_column;
-- Execute the next statement only if both columns exist.
SELECT id, icon_url, favicon_url, updated_at FROM public.store_branding WHERE id=1;
