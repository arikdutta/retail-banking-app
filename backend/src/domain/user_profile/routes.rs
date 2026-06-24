use axum::routing::get;
use axum::Router;

use super::handler::{get_profile, update_profile};
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/profile", get(get_profile).put(update_profile))
}
