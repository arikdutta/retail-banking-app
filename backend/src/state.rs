use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub resend_api_url: String,
    pub resend_api_key: Option<String>,
    pub email_from: String,
}
