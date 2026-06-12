use axum::{
    Json,
    extract::{Query, State},
    http::{StatusCode, header},
    response::IntoResponse,
};
use chrono::NaiveDate;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use super::db::TransactionsDb;
use crate::domain::auth::middleware::AuthUser;
use crate::pdf::generate_statement_pdf;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct TransactionQuery {
    pub page:         Option<i64>,
    pub per_page:     Option<i64>,
    pub account_unid: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct ActivityQuery {
    pub limit: Option<i64>,
}

/// GET /api/transactions
pub async fn list_transactions(
    user: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<TransactionQuery>,
) -> impl IntoResponse {
    let page     = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).clamp(1, 100);

    match TransactionsDb::list(&state.pool, user.unid, params.account_unid, page, per_page).await {
        Ok(rows) => Json(json!({ "data": rows, "page": page, "per_page": per_page })).into_response(),
        Err(e) => {
            tracing::error!("transactions list: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response()
        }
    }
}

/// GET /api/transactions/activity
pub async fn recent_activity(
    user: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<ActivityQuery>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(20).clamp(1, 100);

    match TransactionsDb::recent_activity(&state.pool, user.unid, limit).await {
        Ok(rows) => Json(json!(rows)).into_response(),
        Err(e) => {
            tracing::error!("transactions activity: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response()
        }
    }
}

/// GET /api/transactions/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
pub async fn get_transactions_pdf(
    user: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<PdfQuery>,
) -> impl IntoResponse {
    if params.to < params.from {
        return (StatusCode::BAD_REQUEST, "to must be >= from").into_response();
    }

    let email = match sqlx::query_scalar!("SELECT email FROM users WHERE unid = $1", user.unid)
        .fetch_one(&state.pool)
        .await
    {
        Ok(e) => e,
        Err(e) => {
            tracing::error!("pdf email fetch: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response();
        }
    };

    let transactions =
        match TransactionsDb::list_by_date_range(&state.pool, user.unid, params.from, params.to).await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("pdf transactions fetch: {e}");
                return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
            }
        };

    match generate_statement_pdf(&transactions, &email, params.from, params.to).await {
        Ok(bytes) => ([(header::CONTENT_TYPE, "application/pdf")], bytes).into_response(),
        Err(e) => {
            tracing::error!("pdf generate: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
        }
    }
}

#[derive(Deserialize)]
pub struct PdfQuery {
    pub from: NaiveDate,
    pub to:   NaiveDate,
}

/// GET /api/dashboard/money-flow
pub async fn money_flow(
    user: AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match TransactionsDb::money_flow(&state.pool, user.unid).await {
        Ok(rows) => Json(json!(rows)).into_response(),
        Err(e) => {
            tracing::error!("dashboard money-flow: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response()
        }
    }
}

/// GET /api/dashboard/donut-stats
pub async fn donut_stats(
    user: AuthUser,
    State(state): State<AppState>,
) -> impl IntoResponse {
    match TransactionsDb::donut_stats(&state.pool, user.unid).await {
        Ok(rows) => Json(json!(rows)).into_response(),
        Err(e) => {
            tracing::error!("dashboard donut-stats: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response()
        }
    }
}
