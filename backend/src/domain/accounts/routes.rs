use axum::routing::get;
use axum::Router;

use super::handler::{get_account, list_accounts};
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/accounts", get(list_accounts))
        .route("/api/accounts/{id}", get(get_account))
}
