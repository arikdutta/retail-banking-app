use axum::routing::{get, patch};
use axum::Router;

use super::handler::{create_invoice, get_invoice, list_invoices, update_invoice_status};
use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/invoices", get(list_invoices).post(create_invoice))
        .route("/api/invoices/{id}", get(get_invoice))
        .route("/api/invoices/{id}/status", patch(update_invoice_status))
}
