use sqlx::PgPool;
use uuid::Uuid;

use super::model::Account;

pub struct AccountsDb;

impl AccountsDb {
    pub async fn list_for_user(pool: &PgPool, user_unid: Uuid) -> Result<Vec<Account>, sqlx::Error> {
        sqlx::query_as!(
            Account,
            r#"
            SELECT unid, user_unid, account_number, iban, label,
                   account_type AS "account_type: _",
                   balance, currency, closed_at, created_at, updated_at
            FROM accounts
            WHERE user_unid = $1
              AND closed_at IS NULL
            ORDER BY created_at ASC
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
            SELECT unid, user_unid, account_number, iban, label,
                   account_type AS "account_type: _",
                   balance, currency, closed_at, created_at, updated_at
            FROM accounts
            WHERE unid = $1
            "#,
            unid,
        )
        .fetch_optional(pool)
        .await
    }
}
