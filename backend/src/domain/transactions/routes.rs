use axum::routing::{get, post};
use axum::Router;

use super::handler::{
    balance_history, dashboard_stats, donut_stats, email_statement_pdf, get_transactions_pdf,
    list_transactions, money_flow, recent_activity,
};
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/dashboard/money-flow", get(money_flow))
        .route("/api/dashboard/donut-stats", get(donut_stats))
        .route("/api/dashboard/stats", get(dashboard_stats))
        .route("/api/dashboard/balance-history", get(balance_history))
        .route("/api/transactions", get(list_transactions))
        .route("/api/transactions/activity", get(recent_activity))
        .route("/api/transactions/pdf", get(get_transactions_pdf))
        .route("/api/transactions/email-statement", post(email_statement_pdf))
}
