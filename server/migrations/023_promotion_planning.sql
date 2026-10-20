-- Phase 39: promotion positions, visible homepage count and optional active dates.
-- Back up your development database first. Run AFTER 022. No media/orders/products are deleted.
BEGIN;
ALTER TABLE public.promotion_banners
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE public.promotion_banners DROP CONSTRAINT IF EXISTS promotion_valid_schedule;
ALTER TABLE public.promotion_banners ADD CONSTRAINT promotion_valid_schedule
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at);
-- Normalize legacy ties to a clear 1-based global order, preserving current sort priority.
WITH ranked AS (
 SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order, id)::integer AS position_number
 FROM public.promotion_banners
)
UPDATE public.promotion_banners b SET sort_order = ranked.position_number
FROM ranked WHERE b.id = ranked.id;
CREATE TABLE IF NOT EXISTS public.promotion_display_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  home_visible_count SMALLINT NOT NULL DEFAULT 3 CHECK(home_visible_count BETWEEN 1 AND 3),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.promotion_display_settings(id,home_visible_count)
VALUES(1,3) ON CONFLICT(id) DO NOTHING;
CREATE INDEX IF NOT EXISTS promotion_live_schedule_idx
ON public.promotion_banners (sort_order,id) WHERE is_active = TRUE;
COMMIT;
