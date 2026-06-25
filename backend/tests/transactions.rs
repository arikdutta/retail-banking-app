mod common;

use auth_backend::state::AppState;
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{
    body_json, get_session_cookie, init, make_app, PASSWORD, ROOT_EMAIL, SEEDED_ACCOUNT_UNID,
    USER_EMAIL,
};
use sqlx::PgPool;
use tower::ServiceExt;

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

#[sqlx::test(migrations = "../migrations")]
async fn email_statement_returns_500_when_resend_key_missing(pool: PgPool) {
    init();
    let cookie = get_session_cookie(pool.clone(), ROOT_EMAIL, PASSWORD).await;
    let app = auth_backend::build_app(AppState {
        pool,
        resend_api_url: "http://127.0.0.1:9/emails".to_string(),
        resend_api_key: None,
        email_from: "Retail Banking <test@example.com>".to_string(),
    });

    let res = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transactions/email-statement?from=2024-01-01&to=2024-12-31")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::INTERNAL_SERVER_ERROR);
}

#[sqlx::test(migrations = "../migrations")]
async fn transactions_isolates_by_user(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), ROOT_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/transactions")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    let data = body["data"].as_array().expect("data must be an array");
    for tx in data {
        assert_ne!(
            tx["account_unid"].as_str().unwrap_or(""),
            SEEDED_ACCOUNT_UNID,
            "root@'s transaction list must not include user@'s seeded transactions"
        );
    }
}

#[sqlx::test(migrations = "../migrations")]
async fn pdf_download_returns_pdf_content_type(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/transactions/pdf?from=2024-01-01&to=2024-12-31")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(
        res.headers()
            .get(header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok()),
        Some("application/pdf"),
        "PDF endpoint must return application/pdf content-type"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn list_transactions_per_page_clamped(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/transactions?per_page=999")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(
        body["per_page"].as_u64().unwrap_or(u64::MAX) <= 100,
        "per_page must be clamped to at most 100"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn list_transactions_filtered_by_account(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri(&format!("/api/transactions?account_unid={SEEDED_ACCOUNT_UNID}"))
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    let data = body["data"].as_array().expect("data must be an array");
    for tx in data {
        assert_eq!(
            tx["account_unid"].as_str().unwrap_or(""),
            SEEDED_ACCOUNT_UNID,
            "every transaction must belong to the filtered account"
        );
    }
}
