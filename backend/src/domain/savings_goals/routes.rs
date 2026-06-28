use axum::routing::{delete, get, patch};
use axum::Router;

use super::handler::{create_savings_goal, delete_savings_goal, list_savings_goals, update_savings_goal};
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/savings",
            get(list_savings_goals).post(create_savings_goal),
        )
        .route(
            "/api/savings/{id}",
            patch(update_savings_goal).delete(delete_savings_goal),
        )
}
