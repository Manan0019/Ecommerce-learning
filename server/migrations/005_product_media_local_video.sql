-- Review and run manually AFTER 004_product_media_featured.sql.
-- This expands the media type check; existing images and YouTube rows remain unchanged.
BEGIN;
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid='public.product_media'::regclass
    AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%media_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.product_media DROP CONSTRAINT %I',c.conname);
  END LOOP;
END $$;
ALTER TABLE public.product_media
  ADD CONSTRAINT product_media_type_check
  CHECK (media_type IN ('image','youtube','video'));
COMMIT;
