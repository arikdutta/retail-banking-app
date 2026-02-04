use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct Account {
    pub unid:         Uuid,
    pub user_unid:    Uuid,
    pub label:        String,
    pub account_type: String,
    #[ts(type = "number")]
    pub balance:      Decimal,
    pub currency:     String,
    pub created_at:   DateTime<Utc>,
    pub updated_at:   DateTime<Utc>,
}
