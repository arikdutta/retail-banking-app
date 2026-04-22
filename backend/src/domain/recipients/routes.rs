use axum::routing::{delete, get};
use axum::Router;

use super::handler::{create_recipient, delete_recipient, list_recipients};
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/recipients", get(list_recipients).post(create_recipient))
        .route("/api/recipients/{id}", delete(delete_recipient))
}
