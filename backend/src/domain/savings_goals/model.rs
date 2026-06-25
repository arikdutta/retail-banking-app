use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct SavingsGoal {
    pub unid: Uuid,
    pub user_unid: Uuid,
    pub name: String,
    #[ts(type = "number")]
    pub current_amount: Decimal,
    #[ts(type = "number")]
    pub target_amount: Decimal,
    pub currency: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct CreateSavingsGoalRequest {
    #[validate(length(min = 1, max = 200))]
    pub name: String,
    #[ts(type = "number")]
    pub target_amount: Decimal,
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct UpdateSavingsGoalRequest {
    #[ts(type = "number")]
    pub current_amount: Decimal,
}
