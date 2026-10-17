-- Review and run manually on your development database AFTER checking prior migrations.
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS product_media (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 media_type VARCHAR(10) NOT NULL CHECK(media_type IN ('image','youtube')),
 media_url TEXT NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS product_media_order_idx ON product_media(product_id, sort_order, id);
CREATE INDEX IF NOT EXISTS products_featured_idx ON products(is_featured) WHERE is_featured = TRUE;
-- Bring existing single cover images into gallery without duplication.
INSERT INTO product_media(product_id,media_type,media_url,sort_order)
SELECT id,'image',image_url,0 FROM products p
WHERE image_url IS NOT NULL AND image_url <> ''
AND NOT EXISTS (SELECT 1 FROM product_media m WHERE m.product_id=p.id AND m.media_url=p.image_url);
COMMIT;
