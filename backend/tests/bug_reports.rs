mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{body_json, get_session_cookie, init, make_app, ADMIN_EMAIL, PASSWORD};
use serde_json::json;
use sqlx::PgPool;
use tower::ServiceExt;

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

#[sqlx::test(migrations = "../migrations")]
async fn list_bug_reports_requires_auth(pool: PgPool) {
    init();
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/bugreports")
                .body(Body::empty())
                .unwrap(),
        )
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

#[sqlx::test(migrations = "../migrations")]
async fn list_bug_reports_filtered_by_type(pool: PgPool) {
    init();
    let submit = |bug_type: &'static str, message: &'static str| {
        let pool = pool.clone();
        async move {
            make_app(pool)
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/api/bugreports")
                        .header(header::CONTENT_TYPE, "application/json")
                        .body(Body::from(
                            json!({ "bug_type": bug_type, "message": message }).to_string(),
                        ))
                        .unwrap(),
                )
                .await
                .unwrap()
        }
    };

    // Seed one Bug and one Server report.
    let r1 = submit("Bug", "a bug occurred").await;
    assert!(r1.status().is_success());
    let r2 = submit("Server", "a server error").await;
    assert!(r2.status().is_success());

    let cookie = get_session_cookie(pool.clone(), ADMIN_EMAIL, PASSWORD).await;
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/bugreports?bug_type=Bug")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    let data = body["data"].as_array().expect("data must be an array");
    assert!(!data.is_empty(), "filtered result should not be empty");
    for row in data {
        assert_eq!(
            row["bugtype"].as_str().unwrap_or(""),
            "Bug",
            "every row must have bugtype = Bug"
        );
    }
}

#[sqlx::test(migrations = "../migrations")]
async fn list_bug_reports_filtered_by_search(pool: PgPool) {
    init();
    let submit = |message: &'static str| {
        let pool = pool.clone();
        async move {
            make_app(pool)
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/api/bugreports")
                        .header(header::CONTENT_TYPE, "application/json")
                        .body(Body::from(
                            json!({ "bug_type": "Bug", "message": message }).to_string(),
                        ))
                        .unwrap(),
                )
                .await
                .unwrap()
        }
    };

    let r1 = submit("unique-xyz-marker error").await;
    assert!(r1.status().is_success());
    let r2 = submit("completely different problem").await;
    assert!(r2.status().is_success());

    let cookie = get_session_cookie(pool.clone(), ADMIN_EMAIL, PASSWORD).await;
    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/bugreports?search=xyz")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    let data = body["data"].as_array().expect("data must be an array");
    assert!(!data.is_empty(), "search should return at least one match");
    for row in data {
        let msg = row["message"].as_str().unwrap_or("");
        assert!(
            msg.contains("xyz"),
            "every row must match the search term, got: {msg}"
        );
    }
}

#[sqlx::test(migrations = "../migrations")]
async fn delete_all_bug_reports_clears_table(pool: PgPool) {
    init();
    // Seed one report so the table is non-empty.
    let seed_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/bugreports")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!({ "bug_type": "Bug", "message": "to be deleted" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert!(seed_res.status().is_success());

    let cookie = get_session_cookie(pool.clone(), ADMIN_EMAIL, PASSWORD).await;

    let del_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/bugreports")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(del_res.status(), StatusCode::OK);

    let list_res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/bugreports")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(list_res.status(), StatusCode::OK);
    let body = body_json(list_res).await;
    let data = body["data"].as_array().expect("data must be an array");
    assert!(data.is_empty(), "table should be empty after delete_all");
}

#[sqlx::test(migrations = "../migrations")]
async fn bug_report_charts_returns_array(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), ADMIN_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/bugreports/charts?days=30")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body.is_array(), "charts endpoint must return a JSON array, got: {body}");
}
