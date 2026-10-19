-- Phase 26: a single, persisted source of truth for the store logo.
-- Apply after migration 017. Does not alter any existing customer or product record.
BEGIN;
CREATE TABLE IF NOT EXISTS store_branding (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO store_branding (id, logo_url) VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
COMMIT;
