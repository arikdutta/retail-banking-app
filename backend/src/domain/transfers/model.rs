use rust_decimal::Decimal;
use serde::Deserialize;
use ts_rs::TS;
use uuid::Uuid;
use validator::{Validate, ValidationError};

fn validate_amount(value: &Decimal) -> Result<(), ValidationError> {
    let min = Decimal::new(1, 2);         // 0.01
    let max = Decimal::new(1_000_000, 0); // 1_000_000
    if *value >= min && *value <= max {
        Ok(())
    } else {
        Err(ValidationError::new("amount_out_of_range"))
    }
}

#[derive(Debug, Deserialize, Validate, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct CreateTransferRequest {
    pub from_account_unid: Uuid,
    /// Set for "send to saved recipient" or manual recipient flows.
    pub to_recipient_unid: Option<Uuid>,
    /// Set for "transfer between own accounts" flow.
    pub to_account_unid: Option<Uuid>,
    #[ts(type = "number")]
    #[validate(custom(function = "validate_amount"))]
    pub amount: Decimal,
    #[validate(length(max = 500))]
    pub description: Option<String>,
    #[validate(length(max = 100))]
    pub reference: Option<String>,
}
