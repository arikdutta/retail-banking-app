use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use ts_rs::TS;
use uuid::Uuid;

#[derive(
    Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Display, EnumString, TS,
)]
#[sqlx(type_name = "text", rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum TransactionType {
    Credit,
    Debit,
    TransferIn,
    TransferOut,
    Fee,
    Interest,
    Refund,
}

#[derive(
    Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Display, EnumString, TS,
)]
#[sqlx(type_name = "text", rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum TransactionCategory {
    Salary,
    Freelance,
    Interest,
    Dividend,
    Refund,
    Housing,
    Groceries,
    Transport,
    Dining,
    Entertainment,
    Health,
    Education,
    Shopping,
    Utilities,
    Subscriptions,
    Travel,
    Fitness,
    Transfer,
    Investment,
    Fees,
    Insurance,
    Other,
}

#[derive(
    Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type, Display, EnumString, TS,
)]
#[sqlx(type_name = "text", rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
}

#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct Transaction {
    pub unid: Uuid,
    pub account_unid: Uuid,
    pub transaction_type: TransactionType,
    pub description: String,
    pub category: TransactionCategory,
    #[ts(type = "number")]
    pub amount: Decimal,
    pub currency: String,
    pub counterparty_name: Option<String>,
    pub counterparty_iban: Option<String>,
    pub reference: Option<String>,
    pub status: TransactionStatus,
    pub created_at: DateTime<Utc>,
}

/// One row in the money-flow chart: income vs expenses for a single day.
#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct MoneyFlowRow {
    pub date: String,
    #[ts(type = "number")]
    pub income: Decimal,
    #[ts(type = "number")]
    pub expense: Decimal,
}

/// One slice in the spending-breakdown donut chart.
#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct DonutStatRow {
    pub category: String,
    #[ts(type = "number")]
    pub total: Decimal,
}
