pub mod domain;
pub mod pdf;
pub mod state;

use axum::{Router, middleware, routing::{get, post}};
use axum::http::StatusCode;

use domain::accounts::handler::{get_account, list_accounts};
use domain::auth::handler::{dashboard_stats, dashboard_users, login, logout, me};
use domain::auth::middleware::require_auth;
use domain::bugreports::handler::{bug_report_charts, create_bug_report, delete_all_bug_reports, get_bug_report, list_bug_reports};
use domain::roleaccesses::handler::{get_all as roleaccesses_get_all, get_my_roles, root_check};
use domain::savings_goals::handler::list_savings_goals;
use domain::transactions::handler::{donut_stats, get_transactions_pdf, list_transactions, money_flow, recent_activity};
use state::AppState;

pub fn build_app(state: AppState) -> Router {
    let protected = Router::new()
        .route("/api/auth/me",                  get(me))
        .route("/api/dashboard/stats",          get(dashboard_stats))
        .route("/api/dashboard/users",          get(dashboard_users))
        .route("/api/dashboard/money-flow",     get(money_flow))
        .route("/api/dashboard/donut-stats",    get(donut_stats))
        .route("/api/accounts",                 get(list_accounts))
        .route("/api/accounts/{id}",            get(get_account))
        .route("/api/transactions",             get(list_transactions))
        .route("/api/transactions/activity",    get(recent_activity))
        .route("/api/transactions/pdf",         get(get_transactions_pdf))
        .route("/api/savings",                  get(list_savings_goals))
        .route("/api/bugreports",               get(list_bug_reports).delete(delete_all_bug_reports))
        .route("/api/bugreports/{unid}",        get(get_bug_report))
        .route("/api/bugreports/charts",        get(bug_report_charts))
        .route("/api/roleaccesses/mine",        get(get_my_roles))
        .route("/api/roleaccesses/root-check",  get(root_check))
        .route("/api/roleaccesses",             get(roleaccesses_get_all))
        .layer(middleware::from_fn(require_auth));

    let public = Router::new()
        .route("/health",              get(|| async { StatusCode::OK }))
        .route("/api/auth/login",      post(login))
        .route("/api/auth/logout",     post(logout))
        .route("/api/bugreports",      post(create_bug_report));

    Router::new()
        .merge(protected)
        .merge(public)
        .with_state(state)
}
