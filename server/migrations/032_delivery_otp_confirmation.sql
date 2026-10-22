-- Phase 58: one-time email codes are required to complete assigned deliveries.
-- Only hashed codes are stored; no plaintext OTP is written to PostgreSQL.
CREATE TABLE IF NOT EXISTS delivery_confirmation_otps (
 order_id BIGINT PRIMARY KEY REFERENCES cod_orders(id) ON DELETE RESTRICT,
 otp_hash VARCHAR(64) NOT NULL,
 salt VARCHAR(32) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 send_window_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 send_count INTEGER NOT NULL DEFAULT 1 CHECK (send_count BETWEEN 1 AND 5),
 verified_at TIMESTAMPTZ
);
