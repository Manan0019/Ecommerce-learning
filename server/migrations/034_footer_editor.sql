-- Phase62: optional editable footer content. Does not touch orders or money.
CREATE TABLE IF NOT EXISTS store_footer_content (
  id smallint PRIMARY KEY CHECK (id=1),
  headline_primary varchar(80) NOT NULL DEFAULT 'GOOD THINGS,',
  headline_accent varchar(80) NOT NULL DEFAULT 'FOUND HERE.',
  ticker_items jsonb NOT NULL DEFAULT '["NEXORA","DISCOVER","CHOOSE","LOVE YOUR FINDS"]'::jsonb,
  artwork_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO store_footer_content (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
