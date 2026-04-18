use axum::routing::get;
use axum::Router;

use super::handler::{get_all, get_my_roles, root_check};
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/roleaccesses/mine", get(get_my_roles))
        .route("/api/roleaccesses/root-check", get(root_check))
        .route("/api/roleaccesses", get(get_all))
}
