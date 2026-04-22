use axum::routing::post;
use axum::Router;

use super::handler::create_transfer;
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/transfers", post(create_transfer))
}
