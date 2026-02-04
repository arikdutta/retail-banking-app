use std::env;

use axum::{Router, middleware, routing::{get, post}};
use axum::http::{HeaderValue, Method, StatusCode, header};
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{AllowCredentials, CorsLayer};
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;

mod domain;
mod state;

use domain::accounts::handler::{get_account, list_accounts};
use domain::auth::handler::{dashboard_stats, dashboard_users, login, logout, me};
use domain::auth::middleware::require_auth;
use domain::bugreports::handler::{bug_report_charts, create_bug_report, delete_all_bug_reports, get_bug_report, list_bug_reports};
use domain::roleaccesses::handler::{get_all as roleaccesses_get_all, get_my_roles, root_check};
use domain::savings_goals::handler::list_savings_goals;
use domain::transactions::handler::{donut_stats, list_transactions, money_flow, recent_activity};
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    if env::var("APP_ENV").as_deref() == Ok("production") {
        tracing_subscriber::fmt().json().with_env_filter(filter).init();
    } else {
        tracing_subscriber::fmt().with_env_filter(filter).init();
    }

    std::panic::set_hook(Box::new(|info| {
        tracing::error!(panic = %info, "process panicked");
    }));

    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .map_err(|_| anyhow::anyhow!("DATABASE_URL not set"))?;

    env::var("JWT_SECRET").map_err(|_| anyhow::anyhow!("JWT_SECRET not set"))?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    info!("Running migrations...");
    sqlx::migrate!("../migrations").run(&pool).await?;
    info!("Migrations done ✔");

    let state = AppState { pool };

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

    let cors_origins: Vec<HeaderValue> = env::var("CORS_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000".to_string())
        .split(',')
        .map(|s| s.trim().parse::<HeaderValue>().expect("invalid CORS_ORIGINS entry"))
        .collect();

    let app = Router::new()
        .merge(protected)
        .merge(public)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|req: &axum::http::Request<_>| {
                    let request_id = req
                        .extensions()
                        .get::<tower_http::request_id::RequestId>()
                        .and_then(|id| id.header_value().to_str().ok())
                        .unwrap_or("-")
                        .to_owned();
                    tracing::info_span!(
                        "http",
                        method     = %req.method(),
                        uri        = %req.uri(),
                        request_id = %request_id,
                    )
                })
                .on_response(|res: &axum::http::Response<_>, latency: std::time::Duration, _span: &tracing::Span| {
                    if latency.as_millis() > 3000 {
                        tracing::error!(status = %res.status(), latency_ms = latency.as_millis(), "very slow request");
                    } else if latency.as_millis() > 1000 {
                        tracing::warn!(status = %res.status(), latency_ms = latency.as_millis(), "slow request");
                    }
                }),
        )
        .layer(
            CorsLayer::new()
                .allow_origin(cors_origins)
                .allow_methods([Method::GET, Method::POST, Method::PUT, Method::PATCH, Method::DELETE, Method::OPTIONS])
                .allow_headers([
                    header::CONTENT_TYPE,
                    header::AUTHORIZATION,
                    header::COOKIE,
                    header::ACCEPT,
                ])
                .allow_credentials(AllowCredentials::yes()),
        )
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
        .with_state(state);

    let addr = "0.0.0.0:3001";
    info!("Listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
