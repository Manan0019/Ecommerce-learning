-- Additive search indexes for Nexora Phase 89. Does not change product data.
-- pg_trgm is a trusted PostgreSQL extension; the migration requires CREATE on this database.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS products_smart_name_trgm_idx ON products USING gin (name gin_trgm_ops) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS products_smart_brand_trgm_idx ON products USING gin (brand gin_trgm_ops) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS products_smart_model_trgm_idx ON products USING gin (model gin_trgm_ops) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS categories_smart_name_trgm_idx ON categories USING gin (name gin_trgm_ops) WHERE is_active = TRUE;
