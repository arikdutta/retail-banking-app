use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use uuid::Uuid;
use validator::Validate;

use super::db::SavingsGoalsDb;
use super::model::{CreateSavingsGoalRequest, UpdateSavingsGoalRequest};
use crate::domain::auth::middleware::AuthUser;
use crate::error::AppError;
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
            AppError::Internal.into_response()
        }
    }
}

/// POST /api/savings
pub async fn create_savings_goal(
    user: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateSavingsGoalRequest>,
) -> impl IntoResponse {
    if let Err(e) = body.validate() {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": e.to_string()})),
        )
            .into_response();
    }

    match SavingsGoalsDb::create(&state.pool, user.unid, body).await {
        Ok(goal) => (StatusCode::CREATED, Json(json!(goal))).into_response(),
        Err(e) => {
            tracing::error!("savings_goals create: {e}");
            AppError::Internal.into_response()
        }
    }
}

/// PATCH /api/savings/:id
pub async fn update_savings_goal(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSavingsGoalRequest>,
) -> impl IntoResponse {
    match SavingsGoalsDb::update_progress(&state.pool, id, user.unid, body.current_amount).await {
        Ok(Some(goal)) => Json(json!(goal)).into_response(),
        Ok(None) => {
            (StatusCode::NOT_FOUND, Json(json!({"error": "not found"}))).into_response()
        }
        Err(e) => {
            tracing::error!("savings_goals update {id}: {e}");
            AppError::Internal.into_response()
        }
    }
}

/// DELETE /api/savings/:id
pub async fn delete_savings_goal(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match SavingsGoalsDb::delete(&state.pool, id, user.unid).await {
        Ok(Some(_)) => StatusCode::OK.into_response(),
        Ok(None) => match SavingsGoalsDb::exists(&state.pool, id).await {
            Ok(true) => (
                StatusCode::FORBIDDEN,
                Json(json!({"error": "not your goal"})),
            )
                .into_response(),
            Ok(false) => {
                (StatusCode::NOT_FOUND, Json(json!({"error": "not found"}))).into_response()
            }
            Err(e) => {
                tracing::error!("savings_goals exists check {id}: {e}");
                AppError::Internal.into_response()
            }
        },
        Err(e) => {
            tracing::error!("savings_goals delete {id}: {e}");
            AppError::Internal.into_response()
        }
    }
}
