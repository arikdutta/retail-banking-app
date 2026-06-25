pub mod domain;
pub mod error;
pub mod pdf;
pub mod state;
pub mod tracing_bugreport_layer;

use axum::http::StatusCode;
use axum::{middleware, routing::get, Router};

use domain::auth::middleware::require_auth;
use state::AppState;

pub fn build_app(state: AppState) -> Router {
    let protected = Router::new()
        .merge(domain::auth::protected_routes())
        .merge(domain::accounts::routes())
        .merge(domain::transactions::routes())
        .merge(domain::invoices::routes())
        .merge(domain::recipients::routes())
        .merge(domain::savings_goals::routes())
        .merge(domain::transfers::routes())
        .merge(domain::bugreports::protected_routes())
        .merge(domain::roleaccesses::routes())
        .merge(domain::user_profile::routes())
        .layer(middleware::from_fn(require_auth));

    let public = Router::new()
        .route("/health", get(|| async { StatusCode::OK }))
        .merge(domain::auth::public_routes())
        .merge(domain::bugreports::public_routes());

    Router::new()
        .merge(protected)
        .merge(public)
        .with_state(state)
}
