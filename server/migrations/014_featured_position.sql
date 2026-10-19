-- Phase 22: review and back up the development DB before applying. Requires 013.
-- Does not delete or renumber products, categories or SKU IDs.
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_position INTEGER;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_featured_position_valid;
ALTER TABLE products ADD CONSTRAINT products_featured_position_valid
  CHECK (featured_position IS NULL OR featured_position BETWEEN 1 AND 10000);
CREATE INDEX IF NOT EXISTS products_featured_position_idx
  ON products(featured_position ASC, id DESC) WHERE is_featured = TRUE;
COMMIT;
