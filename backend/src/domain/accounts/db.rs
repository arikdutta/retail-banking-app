use sqlx::PgPool;
use uuid::Uuid;

use super::model::Account;

pub struct AccountsDb;

impl AccountsDb {
    pub async fn list_for_user(
        pool: &PgPool,
        user_unid: Uuid,
    ) -> Result<Vec<Account>, sqlx::Error> {
        sqlx::query_as!(
            Account,
            r#"
            SELECT a.unid, a.user_unid, a.account_number, a.iban, a.label,
                   a.account_type AS "account_type: _",
                   COALESCE(ab.balance, 0) AS "balance!",
                   a.currency, a.closed_at, a.created_at, a.updated_at
            FROM accounts a
            LEFT JOIN account_balances ab ON a.unid = ab.account_unid
            WHERE a.user_unid = $1
              AND a.closed_at IS NULL
            ORDER BY a.created_at ASC
            "#,
            user_unid,
        )
        .fetch_all(pool)
        .await
    }

    pub async fn get_by_unid(pool: &PgPool, unid: Uuid) -> Result<Option<Account>, sqlx::Error> {
        sqlx::query_as!(
            Account,
            r#"
            SELECT a.unid, a.user_unid, a.account_number, a.iban, a.label,
                   a.account_type AS "account_type: _",
                   COALESCE(ab.balance, 0) AS "balance!",
                   a.currency, a.closed_at, a.created_at, a.updated_at
            FROM accounts a
            LEFT JOIN account_balances ab ON a.unid = ab.account_unid
            WHERE a.unid = $1
            "#,
            unid,
        )
        .fetch_optional(pool)
        .await
    }
}
