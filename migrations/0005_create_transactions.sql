CREATE TABLE IF NOT EXISTS transactions (
    unid              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    account_unid      UUID          NOT NULL,
    transaction_type  TEXT          NOT NULL
                          CHECK (transaction_type IN (
                              'credit', 'debit', 'transfer_in', 'transfer_out',
                              'fee', 'interest', 'refund'
                          )),
    description       TEXT          NOT NULL,
    category          TEXT          NOT NULL
                          CHECK (category IN (
                              'salary', 'freelance', 'interest', 'dividend', 'refund',
                              'housing', 'groceries', 'transport', 'dining', 'entertainment',
                              'health', 'education', 'shopping', 'utilities', 'subscriptions',
                              'travel', 'fitness', 'transfer', 'investment', 'fees',
                              'insurance', 'other'
                          )),
    amount            NUMERIC(15,2) NOT NULL,
    currency          TEXT          NOT NULL DEFAULT 'USD',
    counterparty_name TEXT,
    counterparty_iban TEXT,
    reference         TEXT,
    status            TEXT          NOT NULL DEFAULT 'completed'
                          CHECK (status IN ('pending', 'completed', 'failed')),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    FOREIGN KEY (account_unid) REFERENCES accounts (unid)
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_unid ON transactions USING btree (account_unid);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at   ON transactions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category     ON transactions USING btree (category);
CREATE INDEX IF NOT EXISTS idx_transactions_type         ON transactions USING btree (transaction_type);

