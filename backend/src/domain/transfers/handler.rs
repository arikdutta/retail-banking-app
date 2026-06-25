use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use validator::Validate;

use super::db::{TransferError, TransfersDb};
use super::model::CreateTransferRequest;
use crate::domain::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::state::AppState;

/// POST /api/transfers
#[tracing::instrument(skip(user, state), fields(user_id = %user.unid))]
pub async fn create_transfer(
    user: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateTransferRequest>,
) -> impl IntoResponse {
    if let Err(e) = body.validate() {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": e.to_string()})),
        )
            .into_response();
    }

    let amount = body.amount;
    match TransfersDb::execute(&state.pool, user.unid, body).await {
        Ok(tx) => {
            tracing::info!(tx_id = %tx.unid, amount = %amount, "transfer created");
            (StatusCode::CREATED, Json(json!(tx))).into_response()
        }
        Err(TransferError::InsufficientFunds) => {
            tracing::warn!(amount = %amount, "transfer failed: insufficient funds");
            (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": "insufficient funds"}))).into_response()
        }
        Err(TransferError::SameAccount) => {
            tracing::warn!("transfer failed: same account");
            (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": "source and destination accounts must differ"}))).into_response()
        }
        Err(TransferError::AccountNotFound) => {
            tracing::warn!("transfer failed: account not found");
            (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": "account not found"}))).into_response()
        }
        Err(TransferError::RecipientNotFound) => {
            tracing::warn!("transfer failed: recipient not found");
            (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": "recipient not found"}))).into_response()
        }
        Err(TransferError::Db(e)) => {
            tracing::error!("transfer execute: {e}");
            AppError::Internal.into_response()
        }
    }
}
