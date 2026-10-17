-- REVIEW AND RUN MANUALLY after migrations 004, 005 and 006.
-- Keeps existing media shared by default. No product data deletion.
BEGIN;
ALTER TABLE product_media ADD COLUMN IF NOT EXISTS variant_id BIGINT;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='product_media_variant_id_fkey' AND conrelid='product_media'::regclass) THEN
  ALTER TABLE product_media ADD CONSTRAINT product_media_variant_id_fkey
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS product_media_variant_idx ON product_media(product_id,variant_id,sort_order);
-- Guarantees media never points to a SKU from a different product.
CREATE OR REPLACE FUNCTION validate_product_media_variant() RETURNS trigger AS $$
BEGIN
 IF NEW.variant_id IS NOT NULL AND NOT EXISTS
  (SELECT 1 FROM product_variants WHERE id=NEW.variant_id AND product_id=NEW.product_id) THEN
  RAISE EXCEPTION 'Media variant must belong to its product';
 END IF;
 RETURN NEW;
END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_validate_product_media_variant ON product_media;
CREATE TRIGGER trg_validate_product_media_variant BEFORE INSERT OR UPDATE OF variant_id,product_id
 ON product_media FOR EACH ROW EXECUTE FUNCTION validate_product_media_variant();
COMMIT;
