-- Phase 54: delivery exception reporting and admin retry review. Additive, no stock/payment changes.
-- Back up development DB before running npm run migrate.
BEGIN;
CREATE TABLE delivery_issues (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id BIGINT NOT NULL REFERENCES cod_orders(id) ON DELETE RESTRICT,
 executive_id BIGINT NOT NULL REFERENCES delivery_staff_profiles(user_id) ON DELETE RESTRICT,
 kind VARCHAR(24) NOT NULL CHECK(kind IN ('failed_attempt','reschedule_requested')),
 reason VARCHAR(300) NOT NULL CHECK(char_length(reason) BETWEEN 10 AND 300),
 requested_date DATE,
 state VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','resolved')),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 resolved_at TIMESTAMPTZ,
 resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
 CHECK ((kind='reschedule_requested' AND requested_date IS NOT NULL) OR
        (kind='failed_attempt' AND requested_date IS NULL))
);
CREATE UNIQUE INDEX delivery_issues_one_pending_idx ON delivery_issues(order_id) WHERE state='pending';
CREATE INDEX delivery_issues_executive_idx ON delivery_issues(executive_id,recorded_at DESC);
ALTER TABLE cod_order_events DROP CONSTRAINT IF EXISTS cod_order_events_event_type_check;
ALTER TABLE cod_order_events ADD CONSTRAINT cod_order_events_event_type_check CHECK(event_type IN
 ('placed','confirmed','processing','shipped','delivered','cancelled','cod_collected','payment_pending',
 'payment_verified','payment_review','payment_expired','refund_requested','refund_pending','refund_processed','refund_review',
 'cancellation_requested','cancellation_declined','cancellation_approved','delivery_assigned','out_for_delivery',
 'delivery_issue','delivery_retry'));
COMMIT;
