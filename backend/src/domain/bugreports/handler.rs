use axum::{
    extract::{rejection::JsonRejection, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use uuid::Uuid;

use super::{
    db::BugReportsDb,
    model::{AddBugReport, BugReportQuery},
};
use crate::error::AppError;
use crate::state::AppState;

/// POST /api/bugreports — public, called by frontend error handlers
pub async fn create_bug_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload: Result<Json<AddBugReport>, JsonRejection>,
) -> impl IntoResponse {
    let Json(mut payload) = match payload {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    if payload.user_agent.is_none() {
        payload.user_agent = headers
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(str::to_string);
    }

    if payload.url.is_none() {
        payload.url = headers
            .get("referer")
            .and_then(|v| v.to_str().ok())
            .map(str::to_string);
    }

    match BugReportsDb::insert(&state.pool, &payload).await {
        Ok(id) => (StatusCode::CREATED, Json(json!({"id": id}))).into_response(),
        Err(e) => {
            tracing::error!("bugreports insert: {e}");
            AppError::Internal.into_response()
        }
    }
}

/// GET /api/bugreports — protected
pub async fn list_bug_reports(
    State(state): State<AppState>,
    Query(params): Query<BugReportQuery>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).clamp(1, 100);
    let search = params.search.as_deref();
    let bug_type = params.bug_type.as_deref();

    match BugReportsDb::list(&state.pool, page, per_page, search, bug_type).await {
        Ok(rows) => {
            let total = rows.first().map(|r| r.total_count).unwrap_or(0);
            Json(json!({ "data": rows, "total": total, "page": page, "per_page": per_page }))
                .into_response()
        }
        Err(e) => {
            tracing::error!("bugreports list: {e}");
            AppError::Internal.into_response()
        }
    }
}

/// GET /api/bugreports/:unid — protected
pub async fn get_bug_report(
    State(state): State<AppState>,
    Path(unid): Path<Uuid>,
) -> impl IntoResponse {
    match BugReportsDb::get_by_unid(&state.pool, unid).await {
        Ok(Some(r)) => Json(json!(r)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "not found"}))).into_response(),
        Err(e) => {
            tracing::error!("bugreports get {unid}: {e}");
            AppError::Internal.into_response()
        }
    }
}

/// DELETE /api/bugreports — protected
pub async fn delete_all_bug_reports(State(state): State<AppState>) -> impl IntoResponse {
    match BugReportsDb::delete_all(&state.pool).await {
        Ok(n) => Json(json!({"deleted": n})).into_response(),
        Err(e) => {
            tracing::error!("bugreports delete_all: {e}");
            AppError::Internal.into_response()
        }
    }
}

/// GET /api/bugreports/charts?days=30 — protected
pub async fn bug_report_charts(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let days: i32 = params
        .get("days")
        .and_then(|d| d.parse().ok())
        .unwrap_or(30)
        .clamp(1, 365);

    match BugReportsDb::get_bugs_per_day(&state.pool, days).await {
        Ok(data) => Json(json!(data)).into_response(),
        Err(e) => {
            tracing::error!("bugreports charts: {e}");
            AppError::Internal.into_response()
        }
    }
}
