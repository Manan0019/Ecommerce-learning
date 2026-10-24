BEGIN;
CREATE TABLE IF NOT EXISTS customer_email_outbox (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id BIGINT NOT NULL REFERENCES cod_orders(id) ON DELETE CASCADE,
 kind VARCHAR(32) NOT NULL CHECK(kind IN ('order_placed','payment_verified','order_shipped','order_delivered','order_cancelled','refund_processed')),
 state VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed')),
 attempts SMALLINT NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 claimed_at TIMESTAMPTZ,
 sent_at TIMESTAMPTZ,
 last_error VARCHAR(300),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT customer_email_outbox_once UNIQUE(order_id,kind)
);
CREATE INDEX IF NOT EXISTS customer_email_outbox_ready ON customer_email_outbox(next_attempt_at,id) WHERE state IN ('pending','sending');
COMMIT;
