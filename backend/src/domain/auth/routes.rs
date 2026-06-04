use axum::routing::{get, post};
use axum::Router;

use super::handler::{dashboard_users, login, logout, me};
use crate::state::AppState;

pub fn protected_routes() -> Router<AppState> {
    Router::new()
        .route("/api/dashboard/users", get(dashboard_users))
}

pub fn public_routes() -> Router<AppState> {
    Router::new()
        .route("/api/auth/login", post(login))
        .route("/api/auth/logout", post(logout))
        .route("/api/auth/me", get(me))
}
