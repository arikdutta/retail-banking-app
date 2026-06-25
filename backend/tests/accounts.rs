mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{
    body_json, get_session_cookie, make_app, PASSWORD, ROOT_EMAIL, SEEDED_ACCOUNT_UNID, USER_EMAIL,
};
use sqlx::PgPool;
use tower::ServiceExt;

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
    assert!(
        !body.as_array().unwrap().is_empty(),
        "user@example.com should have seeded accounts"
    );
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

#[sqlx::test(migrations = "../migrations")]
async fn get_account_returns_404_for_nonexistent(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/accounts/00000000-0000-0000-0000-000000000000")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(migrations = "../migrations")]
async fn list_accounts_isolates_by_user(pool: PgPool) {
    let root_cookie = get_session_cookie(pool.clone(), ROOT_EMAIL, PASSWORD).await;

    let res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .uri("/api/accounts")
                .header(header::COOKIE, &root_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let root_accounts = body_json(res).await;
    let root_ids: Vec<&str> = root_accounts
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|a| a["id"].as_str())
        .collect();

    assert!(
        !root_ids.contains(&SEEDED_ACCOUNT_UNID),
        "root@'s account list must not include user@'s seeded account"
    );
}
