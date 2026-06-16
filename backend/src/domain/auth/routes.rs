use axum::routing::{get, post};
use axum::Router;

use super::handler::{dashboard_stats, dashboard_users, login, logout, me};
use crate::state::AppState;

pub fn protected_routes() -> Router<AppState> {
    Router::new()
        .route("/api/auth/me", get(me))
        .route("/api/dashboard/stats", get(dashboard_stats))
        .route("/api/dashboard/users", get(dashboard_users))
}

pub fn public_routes() -> Router<AppState> {
    Router::new()
        .route("/api/auth/login", post(login))
        .route("/api/auth/logout", post(logout))
}
