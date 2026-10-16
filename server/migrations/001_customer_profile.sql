BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

COMMIT;
