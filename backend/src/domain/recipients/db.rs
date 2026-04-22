use sqlx::PgPool;
use uuid::Uuid;

use super::model::{CreateRecipientRequest, Recipient};

pub struct RecipientsDb;

impl RecipientsDb {
    pub async fn list(
        pool: &PgPool,
        user_unid: Uuid,
        page: i64,
        per_page: i64,
    ) -> Result<Vec<Recipient>, sqlx::Error> {
        let offset = (page - 1) * per_page;
        sqlx::query_as!(
            Recipient,
            r#"
            SELECT unid, user_unid, name, iban, email, notes, created_at
            FROM recipients
            WHERE user_unid = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            user_unid,
            per_page,
            offset,
        )
        .fetch_all(pool)
        .await
    }

    pub async fn count(pool: &PgPool, user_unid: Uuid) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar!(
            "SELECT COUNT(*) FROM recipients WHERE user_unid = $1",
            user_unid,
        )
        .fetch_one(pool)
        .await
        .map(|c| c.unwrap_or(0))
    }

    pub async fn create(
        pool: &PgPool,
        user_unid: Uuid,
        req: CreateRecipientRequest,
    ) -> Result<Recipient, sqlx::Error> {
        sqlx::query_as!(
            Recipient,
            r#"
            INSERT INTO recipients (user_unid, name, iban, email, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING unid, user_unid, name, iban, email, notes, created_at
            "#,
            user_unid,
            req.name,
            req.iban,
            req.email,
            req.notes,
        )
        .fetch_one(pool)
        .await
    }

    pub async fn delete(
        pool: &PgPool,
        unid: Uuid,
        user_unid: Uuid,
    ) -> Result<Option<Recipient>, sqlx::Error> {
        sqlx::query_as!(
            Recipient,
            r#"
            DELETE FROM recipients
            WHERE unid = $1 AND user_unid = $2
            RETURNING unid, user_unid, name, iban, email, notes, created_at
            "#,
            unid,
            user_unid,
        )
        .fetch_optional(pool)
        .await
    }
}
