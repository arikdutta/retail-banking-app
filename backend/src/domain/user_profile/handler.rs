use axum::{extract::State, response::IntoResponse, Json};
use serde_json::json;

use super::db::UserProfileDb;
use super::model::UpdateProfileRequest;
use crate::domain::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::state::AppState;

/// GET /api/profile
pub async fn get_profile(user: AuthUser, State(state): State<AppState>) -> impl IntoResponse {
    match UserProfileDb::get(&state.pool, user.unid).await {
        Ok(Some(profile)) => Json(json!(profile)).into_response(),
        Ok(None) => Json(json!({
            "user_unid":    user.unid,
            "first_name":   null,
            "last_name":    null,
            "date_of_birth": null,
            "phone":        null,
            "country":      null,
            "city":         null,
            "address":      null,
            "postal_code":  null,
            "avatar_data":  null,
            "updated_at":   chrono::Utc::now(),
        }))
        .into_response(),
        Err(e) => {
            tracing::error!("profile get: {e}");
            AppError::Internal.into_response()
        }
    }
}

/// PUT /api/profile
pub async fn update_profile(
    user: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<UpdateProfileRequest>,
) -> impl IntoResponse {
    match UserProfileDb::upsert(&state.pool, user.unid, body).await {
        Ok(profile) => Json(json!(profile)).into_response(),
        Err(e) => {
            tracing::error!("profile update: {e}");
            AppError::Internal.into_response()
        }
    }
}
