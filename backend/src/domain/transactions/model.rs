use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct Transaction {
    pub unid:         Uuid,
    pub account_unid: Uuid,
    pub description:  String,
    pub category:     String,
    #[ts(type = "number")]
    pub amount:       Decimal,
    pub currency:     String,
    pub status:       String,
    pub created_at:   DateTime<Utc>,
}

/// One row in the money-flow chart: income vs expenses for a single day.
#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct MoneyFlowRow {
    pub date:    String,
    #[ts(type = "number")]
    pub income:  Decimal,
    #[ts(type = "number")]
    pub expense: Decimal,
}

/// One slice in the spending-breakdown donut chart.
#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct DonutStatRow {
    pub category: String,
    #[ts(type = "number")]
    pub total:    Decimal,
}
