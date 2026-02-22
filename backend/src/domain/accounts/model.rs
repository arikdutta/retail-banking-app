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
pub enum AccountType {
    Checking,
    Savings,
    Business,
    Investment,
}

#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct Account {
    pub unid: Uuid,
    pub user_unid: Uuid,
    pub account_number: String,
    pub iban: Option<String>,
    pub label: String,
    pub account_type: AccountType,
    #[ts(type = "number")]
    pub balance: Decimal,
    pub currency: String,
    pub closed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
