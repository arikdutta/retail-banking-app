use axum::{
    extract::{Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::NaiveDate;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use super::db::TransactionsDb;
use super::emails::build_statement_email_html;
use crate::domain::auth::middleware::AuthUser;
use crate::pdf::generate_statement_pdf;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct TransactionQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
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
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).clamp(1, 100);

    let result = tokio::try_join!(
        TransactionsDb::list(&state.pool, user.unid, params.account_unid, page, per_page),
        TransactionsDb::count(&state.pool, user.unid, params.account_unid),
    );

    match result {
        Ok((rows, total)) => {
            let total_pages = ((total as f64) / (per_page as f64)).ceil() as i64;
            Json(json!({ "data": rows, "page": page, "per_page": per_page, "total": total, "total_pages": total_pages.max(1) })).into_response()
        }
        Err(e) => {
            tracing::error!("transactions list: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
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
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}

/// GET /api/transactions/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
pub async fn get_transactions_pdf(
    user: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<PdfQuery>,
) -> impl IntoResponse {
    let (email, transactions) = match load_statement_context(&state, user.unid, &params).await {
        Ok(data) => data,
        Err(response) => return response,
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
    pub to: NaiveDate,
}

/// POST /api/transactions/email-statement?from=YYYY-MM-DD&to=YYYY-MM-DD
pub async fn email_statement_pdf(
    user: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<PdfQuery>,
) -> impl IntoResponse {
    let api_key = match state.resend_api_key.as_deref() {
        Some(key) if !key.is_empty() => key,
        _ => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "RESEND_API_KEY not set"})),
            )
                .into_response();
        }
    };

    let (email, transactions) = match load_statement_context(&state, user.unid, &params).await {
        Ok(data) => data,
        Err(response) => return response,
    };

    let pdf = match generate_statement_pdf(&transactions, &email, params.from, params.to).await {
        Ok(bytes) => bytes,
        Err(e) => {
            tracing::error!("statement email pdf generate: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response();
        }
    };

    let payload = json!({
        "from": state.email_from,
        "to": [email],
        "subject": format!(
            "Your transaction statement ({} to {})",
            params.from.format("%Y-%m-%d"),
            params.to.format("%Y-%m-%d")
        ),
        "html": build_statement_email_html(params.from, params.to),
        "attachments": [{
            "filename": format!(
                "transactions-{}-to-{}.pdf",
                params.from.format("%Y-%m-%d"),
                params.to.format("%Y-%m-%d")
            ),
            "content": BASE64.encode(pdf),
        }],
    });

    let response = match reqwest::Client::new()
        .post(&state.resend_api_url)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            tracing::error!("statement email resend request failed: {e}");
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        tracing::error!("statement email resend error: {body}");
        return (StatusCode::BAD_GATEWAY, Json(json!({"error": body}))).into_response();
    }

    (StatusCode::OK, Json(json!({"sent": true, "email": email}))).into_response()
}

async fn load_statement_context(
    state: &AppState,
    user_unid: Uuid,
    params: &PdfQuery,
) -> Result<(String, Vec<crate::domain::transactions::model::Transaction>), axum::response::Response>
{
    if params.to < params.from {
        return Err((StatusCode::BAD_REQUEST, "to must be >= from").into_response());
    }

    let email = match sqlx::query_scalar!("SELECT email FROM users WHERE unid = $1", user_unid)
        .fetch_one(&state.pool)
        .await
    {
        Ok(email) => email,
        Err(e) => {
            tracing::error!("statement email fetch: {e}");
            return Err((StatusCode::INTERNAL_SERVER_ERROR, "db error").into_response());
        }
    };

    let transactions =
        match TransactionsDb::list_by_date_range(&state.pool, user_unid, params.from, params.to)
            .await
        {
            Ok(transactions) => transactions,
            Err(e) => {
                tracing::error!("statement transactions fetch: {e}");
                return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response());
            }
        };

    Ok((email, transactions))
}
/// GET /api/dashboard/money-flow
pub async fn money_flow(user: AuthUser, State(state): State<AppState>) -> impl IntoResponse {
    match TransactionsDb::money_flow(&state.pool, user.unid).await {
        Ok(rows) => Json(json!(rows)).into_response(),
        Err(e) => {
            tracing::error!("dashboard money-flow: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}

/// GET /api/dashboard/donut-stats
pub async fn donut_stats(user: AuthUser, State(state): State<AppState>) -> impl IntoResponse {
    match TransactionsDb::donut_stats(&state.pool, user.unid).await {
        Ok(rows) => Json(json!(rows)).into_response(),
        Err(e) => {
            tracing::error!("dashboard donut-stats: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}
