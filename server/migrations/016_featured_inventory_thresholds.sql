-- Phase 24. Back up your DEVELOPMENT database; review before running manually.
-- Requires 015_cod_orders.sql. Adds thresholds; preserves all rows and prices.
BEGIN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_low_stock_threshold_valid;
ALTER TABLE public.products ADD CONSTRAINT products_low_stock_threshold_valid CHECK (low_stock_threshold BETWEEN 0 AND 1000000);
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS variants_low_stock_threshold_valid;
ALTER TABLE public.product_variants ADD CONSTRAINT variants_low_stock_threshold_valid CHECK (low_stock_threshold BETWEEN 0 AND 1000000);
-- Fix existing duplicate featured positions; order deterministic even if duplicates existed.
WITH numbered AS (
 SELECT id, ROW_NUMBER() OVER (ORDER BY featured_position ASC NULLS LAST, id DESC)::integer AS rank
 FROM public.products WHERE is_featured = TRUE
)
UPDATE public.products p SET featured_position = n.rank FROM numbered n WHERE p.id = n.id;
UPDATE public.products SET featured_position = NULL WHERE is_featured = FALSE AND featured_position IS NOT NULL;
COMMIT;
