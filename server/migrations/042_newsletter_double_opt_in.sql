BEGIN;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirmation_token_hash CHAR(64);
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMPTZ;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
-- Existing single opt-ins cannot be retroactively represented as double confirmed.
UPDATE newsletter_subscribers SET is_subscribed=FALSE WHERE confirmed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_confirmation_token_idx ON newsletter_subscribers(confirmation_token_hash) WHERE confirmation_token_hash IS NOT NULL;
COMMIT;
