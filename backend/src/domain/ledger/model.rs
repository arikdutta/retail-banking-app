use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use uuid::Uuid;

#[derive(Debug, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EntryType {
    Debit,
    Credit,
}

pub struct LedgerEntry {
    pub unid: Uuid,
    pub transaction_unid: Uuid,
    pub account_unid: Uuid,
    pub entry_type: EntryType,
    pub amount: Decimal,
    pub created_at: DateTime<Utc>,
}
