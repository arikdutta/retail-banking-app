mod common;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use common::make_app;
use sqlx::PgPool;
use tower::ServiceExt;

#[sqlx::test(migrations = "../migrations")]
async fn health_returns_200(pool: PgPool) {
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
}
