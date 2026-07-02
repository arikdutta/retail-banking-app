use axum::routing::post;
use axum::Router;

use super::handler::create_deposit;
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/deposits", post(create_deposit))
}
