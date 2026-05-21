CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
    unid                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT        NOT NULL CHECK (email = lower(email)),
    password            TEXT        NOT NULL,
    role                TEXT        NOT NULL DEFAULT 'RegularUser' CHECK (role IN ('Root', 'Admin', 'RegularUser', 'Demo')),
    email_verified_at              TIMESTAMPTZ,
    last_login_at                  TIMESTAMPTZ,
    deleted_at                     TIMESTAMPTZ,
    email_change_pending           TEXT        CHECK (email_change_pending IS NULL OR email_change_pending = lower(email_change_pending)),
    email_change_token             TEXT        UNIQUE,
    email_change_token_expires_at  TIMESTAMPTZ,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Active (non-deleted) users only — prevents duplicate active email while keeping
-- historical rows for audit / GDPR erasure workflows.
CREATE UNIQUE INDEX users_email_active_unique
    ON users (email) WHERE deleted_at IS NULL;

-- Trigger instead of app-layer: sqlx queries can omit updated_at = now() silently.
-- DB-level guarantee means no stale timestamps regardless of which query fires the UPDATE.
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO users (unid, email, password, role) VALUES
    (
        '00000000-0000-4000-8000-100000000001',
        'root@example.com',
        '$6$a8q/LStXr5d9WUGs$D59OuFN7SsKhUYBLGGkb1hNWiX5mEdprxPJKxFnooJ0VLHNNehYub.WRpL2OVsmVSjneUNvMnk50chhOi8Dt61',
        'Root'
    ),
    (
        '00000000-0000-4000-8000-100000000002',
        'admin@example.com',
        '$6$a8q/LStXr5d9WUGs$D59OuFN7SsKhUYBLGGkb1hNWiX5mEdprxPJKxFnooJ0VLHNNehYub.WRpL2OVsmVSjneUNvMnk50chhOi8Dt61',
        'Admin'
    ),
    (
        '00000000-0000-4000-8000-100000000003',
        'demo@scalenza.com',
        '$6$a8q/LStXr5d9WUGs$D59OuFN7SsKhUYBLGGkb1hNWiX5mEdprxPJKxFnooJ0VLHNNehYub.WRpL2OVsmVSjneUNvMnk50chhOi8Dt61',
        'Demo'
    );
