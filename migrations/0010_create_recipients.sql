CREATE TABLE IF NOT EXISTS recipients (
    unid       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_unid  UUID        NOT NULL REFERENCES users (unid),
    name       TEXT        NOT NULL,
    iban       TEXT,
    email      TEXT,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipients_user_unid ON recipients USING btree (user_unid);
CREATE INDEX IF NOT EXISTS idx_recipients_created_at ON recipients USING btree (created_at DESC);
