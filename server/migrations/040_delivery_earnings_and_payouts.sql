-- Phase 81: Delivery compensation and immutable payout confirmations.
-- Additive. Existing completed assignments use 0 compensation because no historical
-- contract rate can be inferred; do not silently backfill a fabricated rate.
BEGIN;
ALTER TABLE delivery_staff_profiles
  ADD COLUMN IF NOT EXISTS pay_rate_paise BIGINT NOT NULL DEFAULT 0 CHECK (pay_rate_paise BETWEEN 0 AND 5000000);
ALTER TABLE delivery_assignments
  ADD COLUMN IF NOT EXISTS pay_rate_paise BIGINT NOT NULL DEFAULT 0 CHECK (pay_rate_paise BETWEEN 0 AND 5000000);
CREATE TABLE IF NOT EXISTS delivery_earnings_payouts (
  order_id BIGINT PRIMARY KEY REFERENCES delivery_assignments(order_id) ON DELETE RESTRICT,
  executive_id BIGINT NOT NULL REFERENCES delivery_staff_profiles(user_id) ON DELETE RESTRICT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  reference VARCHAR(120) NOT NULL,
  paid_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS delivery_earnings_payouts_executive_date_idx ON delivery_earnings_payouts(executive_id,paid_at DESC);
CREATE INDEX IF NOT EXISTS delivery_assignments_earned_date_idx ON delivery_assignments(delivered_at DESC) WHERE status='delivered';
COMMIT;
