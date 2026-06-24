CREATE TABLE ledger_entries (
    unid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_unid UUID NOT NULL REFERENCES transactions(unid),
    account_unid UUID NOT NULL REFERENCES accounts(unid),
    entry_type VARCHAR(6) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(19, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_unid);
CREATE INDEX idx_ledger_entries_transaction ON ledger_entries(transaction_unid);
