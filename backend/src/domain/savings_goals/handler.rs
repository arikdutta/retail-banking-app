use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

use super::db::SavingsGoalsDb;
use crate::domain::auth::middleware::AuthUser;
use crate::state::AppState;

/// GET /api/savings
pub async fn list_savings_goals(
    user: AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match SavingsGoalsDb::list_for_user(&state.pool, user.unid).await {
        Ok(rows) => Json(json!(rows)).into_response(),
        Err(e) => {
            tracing::error!("savings_goals list: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}
