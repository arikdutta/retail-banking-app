-- ── ledger_entries — derived from the transactions above ─────────────────────

INSERT INTO ledger_entries (transaction_unid, account_unid, entry_type, amount, created_at)
SELECT
    t.unid,
    t.account_unid,
    CASE t.transaction_type
        WHEN 'credit'   THEN 'CREDIT'
        WHEN 'interest' THEN 'CREDIT'
        WHEN 'refund'   THEN 'CREDIT'
        WHEN 'debit'    THEN 'DEBIT'
        WHEN 'fee'      THEN 'DEBIT'
    END::VARCHAR(6),
    ABS(t.amount),
    t.created_at
FROM transactions t
JOIN accounts a ON t.account_unid = a.unid
WHERE a.user_unid IN (
    '00000000-0000-4000-8000-100000000001',
    '00000000-0000-4000-8000-100000000002',
    '00000000-0000-4000-8000-100000000003',
    '00000000-0000-4000-8000-100000000004'
);


-- Reconcile cached account balances to match ledger
UPDATE accounts a
SET balance = COALESCE(ab.balance, 0)
FROM account_balances ab
WHERE a.unid = ab.account_unid;
