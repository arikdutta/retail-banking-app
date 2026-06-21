#![allow(dead_code)]

use auth_backend::state::AppState;
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use sqlx::PgPool;
use tower::ServiceExt;

pub const PASSWORD: &str = "password";
pub const ROOT_EMAIL: &str = "root@example.com";
pub const ADMIN_EMAIL: &str = "admin@example.com";
pub const USER_EMAIL: &str = "user@example.com";

// User with seeded accounts / transactions / savings goals.
pub const SEEDED_ACCOUNT_UNID: &str = "a0b1c2d3-e4f5-6789-abcd-ef0123456789"; // Personal Checking  $3 450.75
pub const USER_SAVINGS_ACCOUNT_UNID: &str = "b1c2d3e4-f5a6-7890-bcde-f01234567890"; // Emergency Fund $8 200.00
pub const ROOT_CHECKING_ACCOUNT_UNID: &str = "a1000001-e4f5-6789-abcd-ef0123456789"; // root@'s Checking
pub const SEEDED_SAVINGS_GOAL_UNID: &str = "50a9b0c1-d2e3-4567-abcd-789012345678"; // user@example.com Emergency Fund
pub const ROOT_SAVINGS_GOAL_UNID: &str = "50a90001-d2e3-4567-abcd-789012345678"; // root@example.com Emergency Fund

static JWT_INIT: std::sync::OnceLock<()> = std::sync::OnceLock::new();

pub fn init() {
    JWT_INIT.get_or_init(|| {
        // Safety: test-only, single consistent value across all tests.
        unsafe { std::env::set_var("JWT_SECRET", "test_secret") };
    });
}

pub fn make_app(pool: PgPool) -> axum::Router {
    init();
    auth_backend::build_app(AppState {
        pool,
        resend_api_url: "http://127.0.0.1:9/emails".to_string(),
        resend_api_key: Some("test-key".to_string()),
        email_from: "Retail Banking <test@example.com>".to_string(),
    })
}

pub async fn body_json(res: axum::response::Response) -> Value {
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

/// Login and return the raw `session=<token>` cookie string.
pub async fn get_session_cookie(pool: PgPool, email: &str, password: &str) -> String {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({"email": email, "password": password}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK, "login failed for {email}");

    res.headers()
        .get(header::SET_COOKIE)
        .expect("login should set session cookie")
        .to_str()
        .unwrap()
        // Cookie header: "session=<token>; Path=/; HttpOnly; ..."  — keep only name=value
        .split(';')
        .next()
        .unwrap()
        .to_string()
}
