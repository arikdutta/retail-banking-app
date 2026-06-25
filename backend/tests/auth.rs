mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{body_json, get_session_cookie, init, make_app, PASSWORD, ROOT_EMAIL, USER_EMAIL};
use serde_json::json;
use sqlx::PgPool;
use tower::ServiceExt;

// ── POST /api/auth/login ──────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn login_valid_credentials_sets_cookie(pool: PgPool) {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({"email": ROOT_EMAIL, "password": PASSWORD}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    assert!(
        res.headers().contains_key(header::SET_COOKIE),
        "expected Set-Cookie"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn login_wrong_password_returns_401(pool: PgPool) {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({"email": ROOT_EMAIL, "password": "wrongpassword"}).to_string(),
                ))
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
                .body(Body::from(
                    json!({"email": "ghost@example.com", "password": PASSWORD}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "../migrations")]
async fn login_empty_email_returns_422(pool: PgPool) {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({"email": "", "password": "x"}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
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

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn logout_clears_session_cookie(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/logout")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let set_cookie = res
        .headers()
        .get(header::SET_COOKIE)
        .expect("logout should set a clearing cookie")
        .to_str()
        .unwrap()
        .to_lowercase();
    assert!(
        set_cookie.contains("max-age=0"),
        "expected logout to expire session cookie, got: {set_cookie}"
    );

    // After logout the cookie is gone; /api/auth/me without a cookie → 401.
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/auth/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

// ── Admin-only routes ─────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn admin_only_routes_reject_regular_user(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let admin_routes = ["/api/dashboard/users"];

    for route in admin_routes {
        let res = make_app(pool.clone())
            .oneshot(
                Request::builder()
                    .uri(route)
                    .header(header::COOKIE, &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(
            res.status(),
            StatusCode::FORBIDDEN,
            "expected 403 for regular user on {route}"
        );
    }
}
