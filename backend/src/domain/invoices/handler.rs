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
use super::model::{CreateInvoiceRequest, PayInvoiceRequest};
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

/// POST /api/invoices/:id/pay
pub async fn pay_invoice(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<PayInvoiceRequest>,
) -> impl IntoResponse {
    let invoice = match InvoicesDb::get_by_unid(&state.pool, id, user.unid).await {
        Ok(Some(inv)) => inv,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "invoice not found"})),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("pay invoice get {id}: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    let status_str = invoice.status.to_string();
    if status_str != "sent" && status_str != "overdue" {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "only sent or overdue invoices can be paid"})),
        )
            .into_response();
    }

    let mut db_tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("pay invoice begin tx {id}: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    // Lock + verify source account.
    let src = match sqlx::query!(
        "SELECT user_unid, label, iban, balance, currency FROM accounts WHERE unid = $1 AND closed_at IS NULL FOR UPDATE",
        body.from_account_unid,
    )
    .fetch_optional(&mut *db_tx)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(json!({"error": "account not found"})),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("pay invoice lock account {id}: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    if src.user_unid != user.unid {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "account not found"})),
        )
            .into_response();
    }
    if src.balance < invoice.amount {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "insufficient funds"})),
        )
            .into_response();
    }

    // Debit account, insert transaction, mark invoice paid — all in one tx.
    let steps: Result<(), sqlx::Error> = async {
        sqlx::query!(
            "UPDATE accounts SET balance = balance - $1, updated_at = now() WHERE unid = $2",
            invoice.amount,
            body.from_account_unid,
        )
        .execute(&mut *db_tx)
        .await?;

        sqlx::query!(
            r#"
            INSERT INTO transactions (
                account_unid, transaction_type, description, category,
                amount, currency, counterparty_name, counterparty_iban, reference, status
            )
            VALUES ($1, 'transfer_out', $2, 'transfer', $3, $4, $5, $6, $7, 'completed')
            "#,
            body.from_account_unid,
            format!("Payment for invoice {}", invoice.invoice_number),
            -invoice.amount,
            src.currency,
            invoice.recipient_name,
            invoice.recipient_iban,
            invoice.invoice_number,
        )
        .execute(&mut *db_tx)
        .await?;

        sqlx::query!(
            "UPDATE invoices SET status = 'paid', updated_at = now() WHERE unid = $1",
            id,
        )
        .execute(&mut *db_tx)
        .await?;

        Ok(())
    }
    .await;

    if let Err(e) = steps {
        tracing::error!("pay invoice steps {id}: {e}");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
            .into_response();
    }

    if let Err(e) = db_tx.commit().await {
        tracing::error!("pay invoice commit {id}: {e}");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
            .into_response();
    }

    (StatusCode::OK, Json(json!({"paid": true, "invoice_id": id}))).into_response()
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
