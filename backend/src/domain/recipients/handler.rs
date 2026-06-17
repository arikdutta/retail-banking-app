use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use super::db::RecipientsDb;
use super::model::CreateRecipientRequest;
use crate::domain::auth::middleware::AuthUser;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct RecipientListQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

/// GET /api/recipients
pub async fn list_recipients(
    user: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<RecipientListQuery>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).clamp(1, 100);

    let result = tokio::try_join!(
        RecipientsDb::list(&state.pool, user.unid, page, per_page),
        RecipientsDb::count(&state.pool, user.unid),
    );

    match result {
        Ok((rows, total)) => {
            let total_pages = ((total as f64) / (per_page as f64)).ceil() as i64;
            Json(json!({
                "data": rows,
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages.max(1),
            }))
            .into_response()
        }
        Err(e) => {
            tracing::error!("recipients list: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}

/// POST /api/recipients
pub async fn create_recipient(
    user: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateRecipientRequest>,
) -> impl IntoResponse {
    match RecipientsDb::create(&state.pool, user.unid, body).await {
        Ok(recipient) => (StatusCode::CREATED, Json(json!(recipient))).into_response(),
        Err(e) => {
            tracing::error!("recipients create: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}

/// DELETE /api/recipients/:id
pub async fn delete_recipient(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match RecipientsDb::delete(&state.pool, id, user.unid).await {
        Ok(Some(_)) => StatusCode::NO_CONTENT.into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "recipient not found"})),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("recipients delete {id}: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}
