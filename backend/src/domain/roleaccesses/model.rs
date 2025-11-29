use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct RoleAccess {
    pub unid:           uuid::Uuid,
    pub role:           String,
    pub grantedto_unid: uuid::Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct RoleAccessWithUser {
    pub unid:       uuid::Uuid,
    pub role:       String,
    pub user_email: String,
    pub user_unid:  uuid::Uuid,
}
