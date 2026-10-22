-- Phase62 coupon authoring only. No order discounts are active in this phase.
CREATE TABLE IF NOT EXISTS coupon_drafts (
  code varchar(24) PRIMARY KEY,
  discount_kind varchar(8) NOT NULL CHECK (discount_kind IN ('percent','fixed')),
  discount_value numeric(12,2) NOT NULL CHECK (discount_value>0),
  minimum_subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (minimum_subtotal>=0),
  max_redemptions integer NOT NULL DEFAULT 100 CHECK (max_redemptions BETWEEN 1 AND 100000),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK ((discount_kind='percent' AND discount_value<=50) OR (discount_kind='fixed' AND discount_value<=100000)),
  CHECK (starts_at IS NULL OR expires_at IS NULL OR expires_at>starts_at)
);
