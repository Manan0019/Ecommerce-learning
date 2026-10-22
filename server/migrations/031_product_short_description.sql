-- Phase58: independently editable concise product summary.
-- Existing long descriptions remain untouched.
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description VARCHAR(320);
