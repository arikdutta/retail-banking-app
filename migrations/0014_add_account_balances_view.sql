CREATE VIEW account_balances AS
SELECT
    account_unid,
    COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0) AS balance
FROM ledger_entries
GROUP BY account_unid;

CREATE OR REPLACE FUNCTION check_balance_drift()
RETURNS TABLE(
    account_unid     UUID,
    cached_balance   NUMERIC,
    computed_balance NUMERIC,
    drift            NUMERIC
) LANGUAGE SQL AS $$
    SELECT
        a.unid                          AS account_unid,
        a.balance                       AS cached_balance,
        COALESCE(ab.balance, 0)         AS computed_balance,
        a.balance - COALESCE(ab.balance, 0) AS drift
    FROM accounts a
    LEFT JOIN account_balances ab ON a.unid = ab.account_unid
    WHERE a.balance <> COALESCE(ab.balance, 0);
$$;
