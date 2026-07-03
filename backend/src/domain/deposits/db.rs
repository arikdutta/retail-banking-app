use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::transactions::model::Transaction;

use super::model::{CreateDepositRequest, DepositSource};

pub struct DepositsDb;

#[derive(Debug)]
pub enum DepositError {
    AccountNotFound,
    MissingIban,
    Db(sqlx::Error),
}

impl std::fmt::Display for DepositError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DepositError::AccountNotFound => write!(f, "account not found"),
            DepositError::MissingIban => write!(f, "source IBAN is required for bank transfers"),
            DepositError::Db(e) => write!(f, "database error: {e}"),
        }
    }
}

impl From<sqlx::Error> for DepositError {
    fn from(e: sqlx::Error) -> Self {
        DepositError::Db(e)
    }
}

#[derive(Debug)]
struct AccountRow {
    user_unid: Uuid,
    currency: String,
}

impl DepositsDb {
    pub async fn execute(
        pool: &PgPool,
        user_unid: Uuid,
        req: CreateDepositRequest,
    ) -> Result<Transaction, DepositError> {
        if req.source == DepositSource::BankTransfer && req.source_iban.is_none() {
            return Err(DepositError::MissingIban);
        }

        let mut tx = pool.begin().await?;

        // Lock and fetch destination account — verify ownership.
        let dest = sqlx::query_as!(
            AccountRow,
            r#"
            SELECT user_unid, currency
            FROM accounts
            WHERE unid = $1 AND closed_at IS NULL
            FOR UPDATE
            "#,
            req.to_account_unid,
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(DepositError::AccountNotFound)?;

        if dest.user_unid != user_unid {
            return Err(DepositError::AccountNotFound);
        }

        // Credit destination account.
        sqlx::query_scalar!(
            "UPDATE accounts SET balance = balance + $1, updated_at = now() WHERE unid = $2 RETURNING unid",
            req.amount,
            req.to_account_unid,
        )
        .fetch_one(&mut *tx)
        .await?;

        let desc = req
            .description
            .unwrap_or_else(|| format!("Deposit from {}", req.source_name));

        let deposit_tx = sqlx::query_as!(
            Transaction,
            r#"
            INSERT INTO transactions (
                account_unid, transaction_type, description, category,
                amount, currency, counterparty_name, counterparty_iban, reference, status
            )
            VALUES ($1, 'credit', $2, 'deposit', $3, $4, $5, $6, NULL, 'completed')
            RETURNING
                unid, account_unid,
                transaction_type AS "transaction_type: _",
                description,
                category AS "category: _",
                amount, currency,
                counterparty_name, counterparty_iban, reference,
                status AS "status: _",
                created_at
            "#,
            req.to_account_unid,
            desc,
            req.amount,
            dest.currency,
            req.source_name,
            req.source_iban,
        )
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query_scalar!(
            "INSERT INTO ledger_entries (transaction_unid, account_unid, entry_type, amount) VALUES ($1, $2, 'CREDIT', $3) RETURNING unid",
            deposit_tx.unid,
            req.to_account_unid,
            req.amount,
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(deposit_tx)
    }
}
