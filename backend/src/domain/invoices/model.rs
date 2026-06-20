use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use ts_rs::TS;
use uuid::Uuid;
use validator::{Validate, ValidationError};

fn validate_amount(value: &Decimal) -> Result<(), ValidationError> {
    let min = Decimal::new(1, 2);
    let max = Decimal::new(1_000_000, 0);
    if *value >= min && *value <= max {
        Ok(())
    } else {
        Err(ValidationError::new("amount_out_of_range"))
    }
}

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
pub struct PayInvoiceRequest {
    pub from_account_unid: Uuid,
}

#[derive(Debug, Deserialize, Validate, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct CreateInvoiceRequest {
    #[validate(length(min = 1, max = 200))]
    pub recipient_name: String,
    #[validate(email)]
    pub recipient_email: Option<String>,
    #[validate(length(min = 15, max = 34))]
    pub recipient_iban: Option<String>,
    #[validate(length(max = 500))]
    pub description: Option<String>,
    #[ts(type = "number")]
    #[validate(custom(function = "validate_amount"))]
    pub amount: Decimal,
    #[validate(length(min = 3, max = 3))]
    pub currency: String,
    pub due_date: Option<DateTime<Utc>>,
    #[validate(length(max = 1000))]
    pub notes: Option<String>,
}
