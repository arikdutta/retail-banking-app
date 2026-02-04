CREATE TABLE IF NOT EXISTS transactions (
    unid         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    account_unid UUID          NOT NULL,
    description  TEXT          NOT NULL,
    category     TEXT          NOT NULL,
    amount       NUMERIC(15,2) NOT NULL,
    currency     TEXT          NOT NULL DEFAULT 'USD',
    status       TEXT          NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    FOREIGN KEY (account_unid) REFERENCES accounts (unid)
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_unid ON transactions USING btree (account_unid);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at   ON transactions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category     ON transactions USING btree (category);

