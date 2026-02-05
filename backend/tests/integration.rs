use auth_backend::state::AppState;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

// All seeded users share this password (see migrations).
const PASSWORD: &str = "password";
const ROOT_EMAIL: &str = "root@example.com";
const ADMIN_EMAIL: &str = "admin@example.com";
const USER_EMAIL: &str = "user@example.com";

// User with seeded accounts / transactions / savings goals.
const SEEDED_ACCOUNT_UNID: &str = "a0b1c2d3-e4f5-6789-abcd-ef0123456789";

static JWT_INIT: std::sync::OnceLock<()> = std::sync::OnceLock::new();

fn init() {
    JWT_INIT.get_or_init(|| {
        // Safety: test-only, single consistent value across all tests.
        unsafe { std::env::set_var("JWT_SECRET", "test_secret") };
    });
}

fn make_app(pool: PgPool) -> axum::Router {
    init();
    auth_backend::build_app(AppState { pool })
}

async fn body_json(res: axum::response::Response) -> Value {
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

/// Login and return the raw `session=<token>` cookie string.
async fn get_session_cookie(pool: PgPool, email: &str, password: &str) -> String {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(json!({"email": email, "password": password}).to_string()))
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

// ── /health ───────────────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn health_returns_200(pool: PgPool) {
    let res = make_app(pool)
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn login_valid_credentials_sets_cookie(pool: PgPool) {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(json!({"email": ROOT_EMAIL, "password": PASSWORD}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    assert!(res.headers().contains_key(header::SET_COOKIE), "expected Set-Cookie");
}

#[sqlx::test(migrations = "../migrations")]
async fn login_wrong_password_returns_401(pool: PgPool) {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(json!({"email": ROOT_EMAIL, "password": "wrong"}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "../migrations")]
async fn login_unknown_user_returns_401(pool: PgPool) {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(json!({"email": "ghost@example.com", "password": PASSWORD}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ── Auth guard ────────────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn protected_routes_return_401_without_cookie(pool: PgPool) {
    init();
    let routes = [
        "/api/auth/me",
        "/api/accounts",
        "/api/transactions",
        "/api/transactions/activity",
        "/api/savings",
        "/api/bugreports",
        "/api/dashboard/money-flow",
        "/api/dashboard/donut-stats",
    ];

    for route in routes {
        let res = make_app(pool.clone())
            .oneshot(Request::builder().uri(route).body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(
            res.status(),
            StatusCode::UNAUTHORIZED,
            "expected 401 for {route}"
        );
    }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn me_returns_authenticated_user(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), ROOT_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/auth/me")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["email"], ROOT_EMAIL);
}

// ── GET /api/accounts ─────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn list_accounts_returns_array(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/accounts")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body.is_array(), "expected JSON array, got: {body}");
    assert!(!body.as_array().unwrap().is_empty(), "user@example.com should have seeded accounts");
}

#[sqlx::test(migrations = "../migrations")]
async fn get_account_returns_forbidden_for_other_user(pool: PgPool) {
    // SEEDED_ACCOUNT_UNID belongs to user@example.com — root should get 403.
    let cookie = get_session_cookie(pool.clone(), ROOT_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri(&format!("/api/accounts/{SEEDED_ACCOUNT_UNID}"))
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[sqlx::test(migrations = "../migrations")]
async fn get_account_returns_200_for_owner(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri(&format!("/api/accounts/{SEEDED_ACCOUNT_UNID}"))
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
}

// ── GET /api/transactions ─────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn list_transactions_returns_paginated_json(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/transactions?page=1&per_page=5")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert_eq!(body["page"], 1);
    assert_eq!(body["per_page"], 5);
    assert!(body["data"].is_array());
}

#[sqlx::test(migrations = "../migrations")]
async fn recent_activity_returns_array(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/transactions/activity?limit=5")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body.is_array());
}

// ── GET /api/savings ──────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn list_savings_goals_returns_array(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/savings")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body.is_array());
    assert!(!body.as_array().unwrap().is_empty(), "user@example.com should have seeded savings goals");
}

// ── POST /api/bugreports (public) ─────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn create_bug_report_is_public(pool: PgPool) {
    init();
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/bugreports")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({
                        "bug_type": "Bug",
                        "message": "Test error from integration test",
                        "url": "http://localhost:3000/test",
                        "application": "test"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(
        res.status().is_success(),
        "POST /api/bugreports should be public, got {}",
        res.status()
    );
}

// ── GET /api/bugreports (protected) ──────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn list_bug_reports_requires_auth(pool: PgPool) {
    init();
    let res = make_app(pool)
        .oneshot(Request::builder().uri("/api/bugreports").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "../migrations")]
async fn list_bug_reports_returns_data_for_admin(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), ADMIN_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/bugreports?page=1&per_page=10")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
}

// ── GET /api/dashboard/* ──────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn dashboard_money_flow_returns_array(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/dashboard/money-flow")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body.is_array());
}

#[sqlx::test(migrations = "../migrations")]
async fn dashboard_donut_stats_returns_array(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/dashboard/donut-stats")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body.is_array());
}

// ── GET /api/roleaccesses ─────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn my_roles_returns_array(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/roleaccesses/mine")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
}
