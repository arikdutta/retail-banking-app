use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use super::db::InvoicesDb;
use super::model::CreateInvoiceRequest;
use crate::domain::auth::middleware::AuthUser;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct InvoiceListQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

/// GET /api/invoices
pub async fn list_invoices(
    user: AuthUser,
    State(state): State<AppState>,
    Query(params): Query<InvoiceListQuery>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).clamp(1, 100);

    let result = tokio::try_join!(
        InvoicesDb::list(&state.pool, user.unid, page, per_page),
        InvoicesDb::count(&state.pool, user.unid),
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
            tracing::error!("invoices list: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}

/// GET /api/invoices/:id
pub async fn get_invoice(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match InvoicesDb::get_by_unid(&state.pool, id, user.unid).await {
        Ok(Some(invoice)) => Json(json!(invoice)).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "invoice not found"})),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("invoices get {id}: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}

/// POST /api/invoices
pub async fn create_invoice(
    user: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateInvoiceRequest>,
) -> impl IntoResponse {
    match InvoicesDb::create(&state.pool, user.unid, body).await {
        Ok(invoice) => (StatusCode::CREATED, Json(json!(invoice))).into_response(),
        Err(e) => {
            tracing::error!("invoices create: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}

/// PATCH /api/invoices/:id/status
pub async fn update_invoice_status(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateStatusRequest>,
) -> impl IntoResponse {
    let allowed = ["draft", "sent", "paid", "overdue", "cancelled"];
    if !allowed.contains(&body.status.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "invalid status"})),
        )
            .into_response();
    }

    match InvoicesDb::update_status(&state.pool, id, user.unid, &body.status).await {
        Ok(Some(invoice)) => Json(json!(invoice)).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({"error": "invoice not found"})),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("invoices update status {id}: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}
