-- Phase 57: forward-only configurable tax pricing; historical orders keep inclusive mode.
-- Never update already-created order monetary amounts or payment identifiers.
ALTER TABLE store_checkout_settings
  ADD COLUMN IF NOT EXISTS tax_pricing_mode TEXT NOT NULL DEFAULT 'inclusive'
  CHECK (tax_pricing_mode IN ('inclusive','exclusive'));
ALTER TABLE cod_orders
  ADD COLUMN IF NOT EXISTS tax_pricing_mode TEXT NOT NULL DEFAULT 'inclusive'
  CHECK (tax_pricing_mode IN ('inclusive','exclusive'));
