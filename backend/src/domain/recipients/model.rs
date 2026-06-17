use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

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

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct CreateRecipientRequest {
    pub name: String,
    pub iban: Option<String>,
    pub email: Option<String>,
    pub notes: Option<String>,
}
