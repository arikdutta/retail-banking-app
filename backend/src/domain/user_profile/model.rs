use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct UserProfile {
    pub user_unid: Uuid,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    #[ts(type = "string | null")]
    pub date_of_birth: Option<NaiveDate>,
    pub phone: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub address: Option<String>,
    pub postal_code: Option<String>,
    pub avatar_data: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct UpdateProfileRequest {
    #[validate(length(min = 1, max = 100))]
    pub first_name: Option<String>,
    #[validate(length(min = 1, max = 100))]
    pub last_name: Option<String>,
    #[ts(type = "string | null")]
    pub date_of_birth: Option<NaiveDate>,
    #[validate(length(min = 5, max = 20))]
    pub phone: Option<String>,
    #[validate(length(max = 100))]
    pub country: Option<String>,
    #[validate(length(max = 100))]
    pub city: Option<String>,
    #[validate(length(max = 200))]
    pub address: Option<String>,
    #[validate(length(max = 20))]
    pub postal_code: Option<String>,
    pub avatar_data: Option<String>,
}
