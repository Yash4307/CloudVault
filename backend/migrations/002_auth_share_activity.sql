CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_token
    ON password_reset_tokens (token);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id
    ON password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS shared_links (
    id SERIAL PRIMARY KEY,
    token VARCHAR NOT NULL UNIQUE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_shared_links_token
    ON shared_links (token);

CREATE INDEX IF NOT EXISTS ix_shared_links_user_id
    ON shared_links (user_id);

CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    action VARCHAR NOT NULL,
    item_name VARCHAR NOT NULL,
    item_type VARCHAR NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_activities_user_created
    ON activities (user_id, created_at DESC);
