use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use serde_json::json;

use super::db::RoleAccessesDb;
use crate::domain::auth::middleware::{AuthUser, RootUser};
use crate::state::AppState;

/// GET /api/roleaccesses/mine — all authenticated users; returns caller's role grants from DB
pub async fn get_my_roles(
    State(state): State<AppState>,
    auth: AuthUser,
) -> impl IntoResponse {
    match RoleAccessesDb::get_for_user(&state.pool, auth.unid).await {
        Ok(roles) => Json(json!({ "roles": roles })).into_response(),
        Err(e) => {
            tracing::error!("roleaccesses get_for_user: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "db error"}))).into_response()
        }
    }
}

/// GET /api/roleaccesses — Root only; returns all role grants with user info
pub async fn get_all(
    State(state): State<AppState>,
    _root: RootUser,
) -> impl IntoResponse {
    match RoleAccessesDb::get_all_with_users(&state.pool).await {
        Ok(grants) => Json(json!({ "grants": grants })).into_response(),
        Err(e) => {
            tracing::error!("roleaccesses get_all: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "db error"}))).into_response()
        }
    }
}

/// GET /api/roleaccesses/root-check — Root only; used by demo page to prove Root access
pub async fn root_check(_root: RootUser) -> impl IntoResponse {
    Json(json!({ "ok": true, "message": "You have Root access" }))
}
