-- Transaction-safe coupon activation and immutable order payment snapshots.
-- Existing rules remain INACTIVE until an administrator intentionally publishes them.
ALTER TABLE coupon_drafts ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS coupon_code varchar(24);
ALTER TABLE cod_orders ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0);
ALTER TABLE cod_order_items ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0);
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id bigserial PRIMARY KEY,
  code varchar(24) NOT NULL REFERENCES coupon_drafts(code) ON DELETE RESTRICT,
  customer_id bigint NOT NULL REFERENCES users(id),
  order_id bigint NOT NULL UNIQUE REFERENCES cod_orders(id),
  status varchar(12) NOT NULL CHECK(status IN ('reserved','consumed','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_active ON coupon_redemptions(code,customer_id) WHERE status IN ('reserved','consumed');
