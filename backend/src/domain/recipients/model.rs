use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct Recipient {
    pub unid: Uuid,
    pub user_unid: Uuid,
    pub name: String,
    pub iban: Option<String>,
    pub email: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct CreateRecipientRequest {
    #[validate(length(min = 1, max = 200))]
    pub name: String,
    #[validate(length(min = 15, max = 34))]
    pub iban: Option<String>,
    #[validate(email)]
    pub email: Option<String>,
    #[validate(length(max = 1000))]
    pub notes: Option<String>,
}
