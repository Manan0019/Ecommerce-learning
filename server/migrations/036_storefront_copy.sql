-- Phase 63: administrator-controlled storefront copy. No payment or order changes.
CREATE TABLE IF NOT EXISTS store_home_content (
  id smallint PRIMARY KEY CHECK (id=1),
  content jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(content)='object'),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
INSERT INTO store_home_content (id,content) VALUES(1,'{}'::jsonb) ON CONFLICT (id) DO NOTHING;
