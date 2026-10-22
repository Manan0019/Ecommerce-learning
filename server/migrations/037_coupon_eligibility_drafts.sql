-- Phase 63: explicit coupon audience and eligibility draft settings.
-- No checkout activation or discount redemption takes place.
ALTER TABLE coupon_drafts ADD COLUMN IF NOT EXISTS eligibility jsonb NOT NULL DEFAULT '{"scope":"order","productIds":[],"categoryIds":[],"excludedProductIds":[],"minimumQualifyingSubtotal":"0","maximumDiscount":"0","perCustomerLimit":1,"firstOrderOnly":false,"excludeSaleProducts":false,"includeSubcategories":true}'::jsonb;
ALTER TABLE coupon_drafts ADD CONSTRAINT coupon_drafts_eligibility_object CHECK (jsonb_typeof(eligibility)='object');
