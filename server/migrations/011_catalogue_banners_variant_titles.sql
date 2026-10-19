-- Phase 17: manual, additive, non-destructive. Run ONLY after a verified backup.
BEGIN;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS custom_title VARCHAR(260);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id BIGINT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='categories_parent_fk' AND conrelid='categories'::regclass) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_parent_fk FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS categories_parent_active_idx ON categories(parent_id,is_active);
CREATE TABLE IF NOT EXISTS promotion_banners (
 id BIGSERIAL PRIMARY KEY,
 title VARCHAR(150) NOT NULL,
 subtitle VARCHAR(300),
 image_url TEXT NOT NULL,
 link_url VARCHAR(400) NOT NULL DEFAULT '/products',
 category_id BIGINT REFERENCES categories(id) ON DELETE RESTRICT,
 position VARCHAR(12) NOT NULL DEFAULT 'home' CHECK (position IN ('home','category')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT promotion_banners_target CHECK ((position='home' AND category_id IS NULL) OR (position='category' AND category_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS promotion_banners_live_idx ON promotion_banners(position,category_id,is_active,sort_order);
COMMIT;
