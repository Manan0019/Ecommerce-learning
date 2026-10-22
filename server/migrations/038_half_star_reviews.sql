-- Phase 64: allow authentic verified-purchase reviews in 0.5-star increments.
-- Convert the existing integer ratings without dropping or overwriting published reviews.
BEGIN;
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_rating_check;
ALTER TABLE product_reviews ALTER COLUMN rating TYPE NUMERIC(2,1) USING rating::numeric(2,1);
ALTER TABLE product_reviews ADD CONSTRAINT product_reviews_rating_check CHECK (rating BETWEEN 1 AND 5 AND rating * 2 = trunc(rating * 2));
COMMIT;
