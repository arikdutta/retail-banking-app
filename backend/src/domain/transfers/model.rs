use rust_decimal::Decimal;
use serde::Deserialize;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct CreateTransferRequest {
    pub from_account_unid: Uuid,
    /// Set for "send to saved recipient" or manual recipient flows.
    pub to_recipient_unid: Option<Uuid>,
    /// Set for "transfer between own accounts" flow.
    pub to_account_unid: Option<Uuid>,
    #[ts(type = "number")]
    pub amount: Decimal,
    pub description: Option<String>,
    pub reference: Option<String>,
}
