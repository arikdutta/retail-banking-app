use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::transactions::model::Transaction;

use super::model::CreateTransferRequest;

pub struct TransfersDb;

#[derive(Debug)]
pub enum TransferError {
    InsufficientFunds,
    AccountNotFound,
    RecipientNotFound,
    SameAccount,
    Db(sqlx::Error),
}

impl std::fmt::Display for TransferError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransferError::InsufficientFunds => write!(f, "insufficient funds"),
            TransferError::AccountNotFound => write!(f, "account not found"),
            TransferError::RecipientNotFound => write!(f, "recipient not found"),
            TransferError::SameAccount => write!(f, "source and destination accounts must differ"),
            TransferError::Db(e) => write!(f, "database error: {e}"),
        }
    }
}

impl From<sqlx::Error> for TransferError {
    fn from(e: sqlx::Error) -> Self {
        TransferError::Db(e)
    }
}

#[derive(Debug)]
struct AccountRow {
    unid: Uuid,
    user_unid: Uuid,
    label: String,
    iban: Option<String>,
    balance: Decimal,
    currency: String,
}

#[derive(Debug)]
struct RecipientRow {
    name: String,
    iban: Option<String>,
}

impl TransfersDb {
    pub async fn execute(
        pool: &PgPool,
        user_unid: Uuid,
        req: CreateTransferRequest,
    ) -> Result<Transaction, TransferError> {
        if req.to_recipient_unid.is_none() && req.to_account_unid.is_none() {
            return Err(TransferError::AccountNotFound);
        }
        if let (Some(_), Some(_)) = (req.to_recipient_unid, req.to_account_unid) {
            return Err(TransferError::AccountNotFound);
        }
        if Some(req.from_account_unid) == req.to_account_unid {
            return Err(TransferError::SameAccount);
        }

        let mut tx = pool.begin().await?;

        // Lock and fetch source account — verify ownership and balance.
        let src = sqlx::query_as!(
            AccountRow,
            r#"
            SELECT unid, user_unid, label, iban, balance, currency
            FROM accounts
            WHERE unid = $1 AND closed_at IS NULL
            FOR UPDATE
            "#,
            req.from_account_unid,
        )
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(TransferError::AccountNotFound)?;

        if src.user_unid != user_unid {
            return Err(TransferError::AccountNotFound);
        }
        if src.balance < req.amount {
            return Err(TransferError::InsufficientFunds);
        }

        // Resolve counterparty name and IBAN.
        let (counterparty_name, counterparty_iban): (String, Option<String>) =
            if let Some(recipient_unid) = req.to_recipient_unid {
                let r = sqlx::query_as!(
                    RecipientRow,
                    "SELECT name, iban FROM recipients WHERE unid = $1 AND user_unid = $2",
                    recipient_unid,
                    user_unid,
                )
                .fetch_optional(&mut *tx)
                .await?
                .ok_or(TransferError::RecipientNotFound)?;
                (r.name, r.iban)
            } else {
                // Own-account transfer: fetch destination account.
                let dest_id = req.to_account_unid.unwrap();
                let dest = sqlx::query_as!(
                    AccountRow,
                    r#"
                    SELECT unid, user_unid, label, iban, balance, currency
                    FROM accounts
                    WHERE unid = $1 AND closed_at IS NULL
                    FOR UPDATE
                    "#,
                    dest_id,
                )
                .fetch_optional(&mut *tx)
                .await?
                .ok_or(TransferError::AccountNotFound)?;

                if dest.user_unid != user_unid {
                    return Err(TransferError::AccountNotFound);
                }

                // Credit destination account.
                sqlx::query_scalar!(
                    "UPDATE accounts SET balance = balance + $1, updated_at = now() WHERE unid = $2 RETURNING unid",
                    req.amount,
                    dest_id,
                )
                .fetch_one(&mut *tx)
                .await?;

                // Insert transfer_in on destination.
                let desc = req
                    .description
                    .clone()
                    .unwrap_or_else(|| format!("Transfer from {}", src.label));
                sqlx::query_scalar!(
                    r#"
                    INSERT INTO transactions (
                        account_unid, transaction_type, description, category,
                        amount, currency, counterparty_name, counterparty_iban, reference, status
                    )
                    VALUES ($1, 'transfer_in', $2, 'transfer', $3, $4, $5, $6, $7, 'completed')
                    RETURNING unid
                    "#,
                    dest_id,
                    desc,
                    req.amount,
                    src.currency,
                    src.label,
                    src.iban,
                    req.reference,
                )
                .fetch_one(&mut *tx)
                .await?;

                (dest.label, dest.iban)
            };

        // Debit source account.
        sqlx::query_scalar!(
            "UPDATE accounts SET balance = balance - $1, updated_at = now() WHERE unid = $2 RETURNING unid",
            req.amount,
            req.from_account_unid,
        )
        .fetch_one(&mut *tx)
        .await?;

        // Insert transfer_out on source — returned to caller.
        let desc = req
            .description
            .unwrap_or_else(|| format!("Transfer to {counterparty_name}"));
        let out_tx = sqlx::query_as!(
            Transaction,
            r#"
            INSERT INTO transactions (
                account_unid, transaction_type, description, category,
                amount, currency, counterparty_name, counterparty_iban, reference, status
            )
            VALUES ($1, 'transfer_out', $2, 'transfer', $3, $4, $5, $6, $7, 'completed')
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
            req.from_account_unid,
            desc,
            -req.amount,
            src.currency,
            counterparty_name,
            counterparty_iban,
            req.reference,
        )
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(out_tx)
    }
}
