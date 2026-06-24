use chrono::{Duration, NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use super::model::{BalanceHistoryRow, DashboardStatsRow, DonutStatRow, MoneyFlowRow, Transaction};

pub struct TransactionsDb;

impl TransactionsDb {
    /// Paginated list scoped to a user, optionally filtered to a single account.
    pub async fn list(
        pool: &PgPool,
        user_unid: Uuid,
        account_unid: Option<Uuid>,
        page: i64,
        per_page: i64,
    ) -> Result<Vec<Transaction>, sqlx::Error> {
        let offset = (page - 1) * per_page;
        sqlx::query_as!(
            Transaction,
            r#"
            SELECT t.unid, t.account_unid,
                   t.transaction_type AS "transaction_type: _",
                   t.description,
                   t.category AS "category: _",
                   t.amount, t.currency,
                   t.counterparty_name, t.counterparty_iban, t.reference,
                   t.status AS "status: _",
                   t.created_at
            FROM transactions t
            JOIN accounts a ON t.account_unid = a.unid
            WHERE a.user_unid = $1
              AND ($4::uuid IS NULL OR t.account_unid = $4)
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            user_unid,
            per_page,
            offset,
            account_unid,
        )
        .fetch_all(pool)
        .await
    }

    /// Total transaction count for a user (used to compute total_pages).
    pub async fn count(
        pool: &PgPool,
        user_unid: Uuid,
        account_unid: Option<Uuid>,
    ) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar!(
            r#"
            SELECT COUNT(*)
            FROM transactions t
            JOIN accounts a ON t.account_unid = a.unid
            WHERE a.user_unid = $1
              AND ($2::uuid IS NULL OR t.account_unid = $2)
            "#,
            user_unid,
            account_unid,
        )
        .fetch_one(pool)
        .await
        .map(|c| c.unwrap_or(0))
    }

    /// Most-recent N transactions across all of a user's accounts (activity feed).
    pub async fn recent_activity(
        pool: &PgPool,
        user_unid: Uuid,
        limit: i64,
    ) -> Result<Vec<Transaction>, sqlx::Error> {
        sqlx::query_as!(
            Transaction,
            r#"
            SELECT t.unid, t.account_unid,
                   t.transaction_type AS "transaction_type: _",
                   t.description,
                   t.category AS "category: _",
                   t.amount, t.currency,
                   t.counterparty_name, t.counterparty_iban, t.reference,
                   t.status AS "status: _",
                   t.created_at
            FROM transactions t
            JOIN accounts a ON t.account_unid = a.unid
            WHERE a.user_unid = $1
            ORDER BY t.created_at DESC
            LIMIT $2
            "#,
            user_unid,
            limit,
        )
        .fetch_all(pool)
        .await
    }

    /// All transactions for a user within an inclusive date range (for PDF export).
    pub async fn list_by_date_range(
        pool: &PgPool,
        user_unid: Uuid,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<Vec<Transaction>, sqlx::Error> {
        sqlx::query_as!(
            Transaction,
            r#"
            SELECT t.unid, t.account_unid,
                   t.transaction_type AS "transaction_type: _",
                   t.description,
                   t.category AS "category: _",
                   t.amount, t.currency,
                   t.counterparty_name, t.counterparty_iban, t.reference,
                   t.status AS "status: _",
                   t.created_at
            FROM transactions t
            JOIN accounts a ON t.account_unid = a.unid
            WHERE a.user_unid = $1
              AND t.created_at::date >= $2
              AND t.created_at::date <= $3
            ORDER BY t.created_at ASC
            "#,
            user_unid,
            from,
            to,
        )
        .fetch_all(pool)
        .await
    }

    /// Income vs expenses per calendar day for the given inclusive date range.
    pub async fn money_flow(
        pool: &PgPool,
        user_unid: Uuid,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<Vec<MoneyFlowRow>, sqlx::Error> {
        sqlx::query_as!(
            MoneyFlowRow,
            r#"
            SELECT
                to_char(t.created_at::date, 'YYYY-MM-DD')                          AS "date!",
                COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount  ELSE 0 END), 0) AS "income!",
                COALESCE(SUM(CASE WHEN t.amount < 0 THEN -t.amount ELSE 0 END), 0) AS "expense!"
            FROM transactions t
            JOIN accounts a ON t.account_unid = a.unid
            WHERE a.user_unid = $1
              AND t.created_at::date >= $2
              AND t.created_at::date <= $3
            GROUP BY t.created_at::date
            ORDER BY t.created_at::date ASC
            "#,
            user_unid,
            from,
            to,
        )
        .fetch_all(pool)
        .await
    }

    /// Aggregate debit count, total spent, and total received for the last `days` days.
    pub async fn dashboard_stats(
        pool: &PgPool,
        user_unid: Uuid,
        days: i64,
    ) -> Result<DashboardStatsRow, sqlx::Error> {
        let since = Utc::now() - Duration::days(days);
        sqlx::query_as!(
            DashboardStatsRow,
            r#"
            SELECT
              COUNT(*) FILTER (WHERE t.amount < 0)                              AS "tx_count!: i64",
              COALESCE(SUM(-t.amount) FILTER (WHERE t.amount < 0), 0::numeric) AS "total_spent!: rust_decimal::Decimal",
              COALESCE(SUM(t.amount)  FILTER (WHERE t.amount > 0), 0::numeric) AS "total_received!: rust_decimal::Decimal"
            FROM transactions t
            JOIN accounts a ON t.account_unid = a.unid
            WHERE a.user_unid = $1
              AND t.created_at >= $2
            "#,
            user_unid,
            since,
        )
        .fetch_one(pool)
        .await
    }

    /// Running balance per day across all user accounts, derived from ledger entries.
    /// Includes a starting balance (sum of all ledger entries before `from`) so the
    /// chart shows the correct balance even when the range does not start at account open.
    pub async fn balance_history(
        pool: &PgPool,
        user_unid: Uuid,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<Vec<BalanceHistoryRow>, sqlx::Error> {
        sqlx::query_as!(
            BalanceHistoryRow,
            r#"
            WITH start_balance AS (
                SELECT COALESCE(
                    SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE -le.amount END),
                    0
                ) AS bal
                FROM ledger_entries le
                JOIN accounts a ON le.account_unid = a.unid
                WHERE a.user_unid = $1
                  AND le.created_at::date < $2
            ),
            daily_net AS (
                SELECT
                    le.created_at::date AS day,
                    SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE -le.amount END) AS daily_change
                FROM ledger_entries le
                JOIN accounts a ON le.account_unid = a.unid
                WHERE a.user_unid = $1
                  AND le.created_at::date >= $2
                  AND le.created_at::date <= $3
                GROUP BY le.created_at::date
            )
            SELECT
                to_char(day, 'YYYY-MM-DD')                                       AS "day!",
                (SELECT bal FROM start_balance) + SUM(daily_change) OVER (ORDER BY day) AS "balance!"
            FROM daily_net
            ORDER BY day
            "#,
            user_unid,
            from,
            to,
        )
        .fetch_all(pool)
        .await
    }

    /// Spending breakdown by category (absolute value of debits only).
    pub async fn donut_stats(
        pool: &PgPool,
        user_unid: Uuid,
    ) -> Result<Vec<DonutStatRow>, sqlx::Error> {
        sqlx::query_as!(
            DonutStatRow,
            r#"
            SELECT
                t.category                          AS "category!",
                COALESCE(SUM(-t.amount), 0)         AS "total!"
            FROM transactions t
            JOIN accounts a ON t.account_unid = a.unid
            WHERE a.user_unid = $1
              AND t.amount < 0
            GROUP BY t.category
            ORDER BY "total!" DESC
            "#,
            user_unid,
        )
        .fetch_all(pool)
        .await
    }
}
