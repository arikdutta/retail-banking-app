use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use uuid::Uuid;

use super::db::AccountsDb;
use crate::domain::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::state::AppState;

/// GET /api/accounts
#[tracing::instrument(skip(user, state), fields(user_id = %user.unid))]
pub async fn list_accounts(user: AuthUser, State(state): State<AppState>) -> impl IntoResponse {
    match AccountsDb::list_for_user(&state.pool, user.unid).await {
        Ok(rows) => Json(json!(rows)).into_response(),
        Err(e) => {
            tracing::error!("accounts list: {e}");
            AppError::Internal.into_response()
        }
    }
}

/// GET /api/accounts/:id
#[tracing::instrument(skip(user, state), fields(user_id = %user.unid))]
pub async fn get_account(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match AccountsDb::get_by_unid(&state.pool, id).await {
        Ok(Some(account)) if account.user_unid == user.unid => Json(json!(account)).into_response(),
        Ok(Some(_)) => {
            tracing::warn!(account_id = %id, "account access forbidden");
            (StatusCode::FORBIDDEN, Json(json!({"error": "forbidden"}))).into_response()
        }
        Ok(None) => {
            tracing::warn!(account_id = %id, "account not found");
            (StatusCode::NOT_FOUND, Json(json!({"error": "not found"}))).into_response()
        }
        Err(e) => {
            tracing::error!("accounts get {id}: {e}");
            AppError::Internal.into_response()
        }
    }
}
