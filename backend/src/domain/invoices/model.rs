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
pub enum InvoiceStatus {
    Draft,
    Sent,
    Paid,
    Overdue,
    Cancelled,
}

#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct Invoice {
    pub unid: Uuid,
    pub user_unid: Uuid,
    pub invoice_number: String,
    pub recipient_name: String,
    pub recipient_email: Option<String>,
    pub recipient_iban: Option<String>,
    pub description: Option<String>,
    #[ts(type = "number")]
    pub amount: Decimal,
    pub currency: String,
    pub status: InvoiceStatus,
    pub due_date: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct CreateInvoiceRequest {
    pub recipient_name: String,
    pub recipient_email: Option<String>,
    pub recipient_iban: Option<String>,
    pub description: Option<String>,
    #[ts(type = "number")]
    pub amount: Decimal,
    pub currency: String,
    pub due_date: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}
