use rust_decimal::Decimal;
use serde::Deserialize;
use strum::{Display, EnumString};
use ts_rs::TS;
use uuid::Uuid;
use validator::{Validate, ValidationError};

fn validate_amount(value: &Decimal) -> Result<(), ValidationError> {
    let min = Decimal::new(1, 2); // 0.01
    let max = Decimal::new(1_000_000, 0); // 1_000_000
    if *value >= min && *value <= max {
        Ok(())
    } else {
        Err(ValidationError::new("amount_out_of_range"))
    }
}

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Deserialize, sqlx::Type, Display, EnumString, TS,
)]
#[sqlx(type_name = "text", rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
#[serde(rename_all = "snake_case")]
#[ts(export, export_to = "../../frontend/bindings/")]
pub enum DepositSource {
    BankTransfer,
    Card,
    Cash,
}

#[derive(Debug, Deserialize, Validate, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct CreateDepositRequest {
    pub to_account_unid: Uuid,
    pub source: DepositSource,
    #[validate(length(min = 1, max = 200))]
    pub source_name: String,
    #[validate(length(min = 15, max = 34))]
    pub source_iban: Option<String>,
    #[ts(type = "number")]
    #[validate(custom(function = "validate_amount"))]
    pub amount: Decimal,
    #[validate(length(max = 500))]
    pub description: Option<String>,
}
