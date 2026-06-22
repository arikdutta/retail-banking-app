mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{body_json, get_session_cookie, make_app, PASSWORD, USER_EMAIL};
use sqlx::PgPool;
use tower::ServiceExt;

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

#[sqlx::test(migrations = "../migrations")]
async fn dashboard_stats_returns_correct_shape(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/dashboard/stats")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body.get("tx_count").is_some(), "missing `tx_count` field: {body}");
    assert!(body.get("total_spent").is_some(), "missing `total_spent` field: {body}");
    assert!(body.get("total_received").is_some(), "missing `total_received` field: {body}");
}

#[sqlx::test(migrations = "../migrations")]
async fn dashboard_donut_stats_shape(pool: PgPool) {
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
    for item in body.as_array().unwrap() {
        assert!(item.get("category").is_some(), "missing `category` field: {item}");
        assert!(item.get("total").is_some(), "missing `total` field: {item}");
    }
}

#[sqlx::test(migrations = "../migrations")]
async fn dashboard_money_flow_shape(pool: PgPool) {
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
    for item in body.as_array().unwrap() {
        assert!(item.get("date").is_some(), "missing `date` field: {item}");
        assert!(item.get("income").is_some(), "missing `income` field: {item}");
        assert!(item.get("expense").is_some(), "missing `expense` field: {item}");
    }
}
