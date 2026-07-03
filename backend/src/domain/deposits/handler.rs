use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use validator::Validate;

use super::db::{DepositError, DepositsDb};
use super::model::CreateDepositRequest;
use crate::domain::auth::middleware::AuthUser;
use crate::error::AppError;
use crate::state::AppState;

/// POST /api/deposits
#[tracing::instrument(skip(user, state), fields(user_id = %user.unid))]
pub async fn create_deposit(
    user: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<CreateDepositRequest>,
) -> impl IntoResponse {
    if let Err(e) = body.validate() {
        return (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"error": e.to_string()})),
        )
            .into_response();
    }

    let amount = body.amount;
    match DepositsDb::execute(&state.pool, user.unid, body).await {
        Ok(tx) => {
            tracing::info!(tx_id = %tx.unid, amount = %amount, "deposit created");
            (StatusCode::CREATED, Json(json!(tx))).into_response()
        }
        Err(DepositError::AccountNotFound) => {
            tracing::warn!("deposit failed: account not found");
            (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": "account not found"}))).into_response()
        }
        Err(DepositError::MissingIban) => {
            tracing::warn!("deposit failed: missing iban");
            (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": "source IBAN is required for bank transfers"}))).into_response()
        }
        Err(DepositError::Db(e)) => {
            tracing::error!("deposit execute: {e}");
            AppError::Internal.into_response()
        }
    }
}
