-- Phase 46: delivery staff and durable in-app notifications. Additive, no order changes.
-- Back up the database before applying. Existing admin/customer logins retain their roles.
BEGIN;
DO $$
DECLARE role_check RECORD;
BEGIN
  -- Replace only role CHECKs which explicitly enumerate the existing customer/admin values.
  FOR role_check IN SELECT c.conname FROM pg_constraint c WHERE c.conrelid='users'::regclass
    AND c.contype='c' AND pg_get_constraintdef(c.oid) ILIKE '%role%'
    AND pg_get_constraintdef(c.oid) ILIKE '%customer%' AND pg_get_constraintdef(c.oid) ILIKE '%admin%'
  LOOP EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', role_check.conname); END LOOP;
END $$;
ALTER TABLE users ADD CONSTRAINT users_phase46_role_check CHECK(role IN ('admin','customer','delivery'));
CREATE TABLE delivery_staff_profiles (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE delivery_assignments (
 order_id BIGINT PRIMARY KEY REFERENCES cod_orders(id) ON DELETE RESTRICT,
 executive_id BIGINT NOT NULL REFERENCES delivery_staff_profiles(user_id) ON DELETE RESTRICT,
 assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','out_for_delivery','delivered')),
 assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 out_for_delivery_at TIMESTAMPTZ,
 delivered_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX delivery_assignments_executive_idx ON delivery_assignments(executive_id,status,assigned_at DESC);
CREATE TABLE admin_notifications (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event_key VARCHAR(160) NOT NULL,
 kind VARCHAR(40) NOT NULL,
 title VARCHAR(140) NOT NULL,
 message VARCHAR(300) NOT NULL,
 path VARCHAR(200) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 read_at TIMESTAMPTZ,
 UNIQUE(recipient_user_id,event_key)
);
CREATE INDEX admin_notifications_recipient_idx ON admin_notifications(recipient_user_id,created_at DESC,id DESC);
ALTER TABLE cod_order_events DROP CONSTRAINT IF EXISTS cod_order_events_event_type_check;
ALTER TABLE cod_order_events ADD CONSTRAINT cod_order_events_event_type_check CHECK(event_type IN
 ('placed','confirmed','processing','shipped','delivered','cancelled','cod_collected','payment_pending',
 'payment_verified','payment_review','payment_expired','refund_requested','refund_pending','refund_processed','refund_review',
 'cancellation_requested','cancellation_declined','cancellation_approved','delivery_assigned','out_for_delivery'));
COMMIT;
