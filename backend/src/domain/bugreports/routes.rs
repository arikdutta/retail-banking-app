use axum::routing::{get, post};
use axum::Router;

use super::handler::{
    bug_report_charts, create_bug_report, delete_all_bug_reports, get_bug_report, list_bug_reports,
};
use crate::state::AppState;

pub fn protected_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/bugreports",
            get(list_bug_reports).delete(delete_all_bug_reports),
        )
        .route("/api/bugreports/{unid}", get(get_bug_report))
        .route("/api/bugreports/charts", get(bug_report_charts))
}

pub fn public_routes() -> Router<AppState> {
    Router::new().route("/api/bugreports", post(create_bug_report))
}
