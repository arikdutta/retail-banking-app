use axum::routing::get;
use axum::Router;

use super::handler::list_savings_goals;
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/savings", get(list_savings_goals))
}
