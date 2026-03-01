use sqlx::PgPool;
use uuid::Uuid;

use super::model::{CreateInvoiceRequest, Invoice};

pub struct InvoicesDb;

impl InvoicesDb {
    pub async fn list(
        pool: &PgPool,
        user_unid: Uuid,
        page: i64,
        per_page: i64,
    ) -> Result<Vec<Invoice>, sqlx::Error> {
        let offset = (page - 1) * per_page;
        sqlx::query_as!(
            Invoice,
            r#"
            SELECT unid, user_unid, invoice_number,
                   recipient_name, recipient_email, recipient_iban,
                   description,
                   amount, currency,
                   status AS "status: _",
                   due_date, notes,
                   created_at, updated_at
            FROM invoices
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
            "SELECT COUNT(*) FROM invoices WHERE user_unid = $1",
            user_unid,
        )
        .fetch_one(pool)
        .await
        .map(|c| c.unwrap_or(0))
    }

    pub async fn get_by_unid(
        pool: &PgPool,
        unid: Uuid,
        user_unid: Uuid,
    ) -> Result<Option<Invoice>, sqlx::Error> {
        sqlx::query_as!(
            Invoice,
            r#"
            SELECT unid, user_unid, invoice_number,
                   recipient_name, recipient_email, recipient_iban,
                   description,
                   amount, currency,
                   status AS "status: _",
                   due_date, notes,
                   created_at, updated_at
            FROM invoices
            WHERE unid = $1 AND user_unid = $2
            "#,
            unid,
            user_unid,
        )
        .fetch_optional(pool)
        .await
    }

    pub async fn create(
        pool: &PgPool,
        user_unid: Uuid,
        req: CreateInvoiceRequest,
    ) -> Result<Invoice, sqlx::Error> {
        sqlx::query_as!(
            Invoice,
            r#"
            INSERT INTO invoices (
                user_unid, invoice_number,
                recipient_name, recipient_email, recipient_iban,
                description, amount, currency,
                due_date, notes
            )
            VALUES (
                $1,
                'INV-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
                $2, $3, $4,
                $5, $6, $7,
                $8, $9
            )
            RETURNING unid, user_unid, invoice_number,
                      recipient_name, recipient_email, recipient_iban,
                      description,
                      amount, currency,
                      status AS "status: _",
                      due_date, notes,
                      created_at, updated_at
            "#,
            user_unid,
            req.recipient_name,
            req.recipient_email,
            req.recipient_iban,
            req.description,
            req.amount,
            req.currency,
            req.due_date,
            req.notes,
        )
        .fetch_one(pool)
        .await
    }

    pub async fn update_status(
        pool: &PgPool,
        unid: Uuid,
        user_unid: Uuid,
        status: &str,
    ) -> Result<Option<Invoice>, sqlx::Error> {
        sqlx::query_as!(
            Invoice,
            r#"
            UPDATE invoices
            SET status = $3, updated_at = now()
            WHERE unid = $1 AND user_unid = $2
            RETURNING unid, user_unid, invoice_number,
                      recipient_name, recipient_email, recipient_iban,
                      description,
                      amount, currency,
                      status AS "status: _",
                      due_date, notes,
                      created_at, updated_at
            "#,
            unid,
            user_unid,
            status,
        )
        .fetch_optional(pool)
        .await
    }
}
