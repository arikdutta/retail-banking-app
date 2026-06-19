use std::env;

use axum::http::{header, HeaderValue, Method};
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{AllowCredentials, CorsLayer};
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

use auth_backend::state::AppState;
use auth_backend::tracing_bugreport_layer::BugReportLayer;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    let database_url =
        env::var("DATABASE_URL").map_err(|_| anyhow::anyhow!("DATABASE_URL not set"))?;

    env::var("JWT_SECRET").map_err(|_| anyhow::anyhow!("JWT_SECRET not set"))?;
    let resend_api_url =
        env::var("RESEND_API_URL").unwrap_or_else(|_| "https://api.resend.com/emails".to_string());
    let resend_api_key = env::var("RESEND_API_KEY").ok();
    let email_from = env::var("EMAIL_FROM")
        .unwrap_or_else(|_| "Retail Banking <onboarding@resend.dev>".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    if env::var("APP_ENV").as_deref() == Ok("production") {
        let fmt_layer = tracing_subscriber::fmt::layer().json();
        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .with(BugReportLayer { pool: pool.clone() })
            .init();
    } else {
        let fmt_layer = tracing_subscriber::fmt::layer();
        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .with(BugReportLayer { pool: pool.clone() })
            .init();
    }

    std::panic::set_hook(Box::new(|info| {
        tracing::error!(panic = %info, "process panicked");
    }));

    info!("Running migrations...");
    sqlx::migrate!("../migrations").run(&pool).await?;
    info!("Migrations done ✔");

    let cors_origins: Vec<HeaderValue> = env::var("CORS_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000".to_string())
        .split(',')
        .map(|s| {
            s.trim()
                .parse::<HeaderValue>()
                .expect("invalid CORS_ORIGINS entry")
        })
        .collect();

    let app = auth_backend::build_app(AppState {
        pool,
        resend_api_url,
        resend_api_key,
        email_from,
    })
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
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid));

    let addr = "0.0.0.0:3001";
    info!("Listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
