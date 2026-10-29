-- Optional, per-product plain-text buying guides. Existing products remain unchanged.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS buying_guide JSONB NOT NULL DEFAULT '{}'::jsonb;
