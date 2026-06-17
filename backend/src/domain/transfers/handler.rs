use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

use super::db::{TransferError, TransfersDb};
use super::model::CreateTransferRequest;
use crate::domain::auth::middleware::AuthUser;
use crate::state::AppState;

/// POST /api/transfers
pub async fn create_transfer(
    user: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateTransferRequest>,
) -> impl IntoResponse {
    if body.amount <= rust_decimal::Decimal::ZERO {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "amount must be greater than zero"})),
        )
            .into_response();
    }

    match TransfersDb::execute(&state.pool, user.unid, body).await {
        Ok(tx) => (StatusCode::CREATED, Json(json!(tx))).into_response(),
        Err(TransferError::InsufficientFunds) => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "insufficient funds"})),
        )
            .into_response(),
        Err(TransferError::SameAccount) => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "source and destination accounts must differ"})),
        )
            .into_response(),
        Err(TransferError::AccountNotFound) => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "account not found"})),
        )
            .into_response(),
        Err(TransferError::RecipientNotFound) => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": "recipient not found"})),
        )
            .into_response(),
        Err(TransferError::Db(e)) => {
            tracing::error!("transfer execute: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}
