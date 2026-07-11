CREATE TABLE IF NOT EXISTS login_otps (
    id SERIAL PRIMARY KEY,
    otp_hash VARCHAR NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_login_otps_user_created
    ON login_otps (user_id, created_at DESC);
