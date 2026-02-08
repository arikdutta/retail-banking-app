CREATE TABLE IF NOT EXISTS accounts (
    unid           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_unid      UUID          NOT NULL,
    account_number TEXT          NOT NULL,
    iban           TEXT,
    label          TEXT          NOT NULL,
    account_type   TEXT          NOT NULL DEFAULT 'checking'
                       CHECK (account_type IN ('checking', 'savings', 'business', 'investment')),
    balance        NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    currency       TEXT          NOT NULL DEFAULT 'USD',
    closed_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    FOREIGN KEY (user_unid) REFERENCES users (unid),
    UNIQUE (account_number),
    UNIQUE (iban)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_unid ON accounts USING btree (user_unid);

CREATE TRIGGER accounts_set_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
