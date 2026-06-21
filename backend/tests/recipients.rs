mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{body_json, get_session_cookie, make_app, PASSWORD, ROOT_EMAIL, USER_EMAIL};
use serde_json::json;
use sqlx::PgPool;
use tower::ServiceExt;

#[sqlx::test(migrations = "../migrations")]
async fn list_recipients_returns_array(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/recipients")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body["data"].is_array(), "expected paginated data array, got: {body}");
}

#[sqlx::test(migrations = "../migrations")]
async fn create_recipient_returns_201(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/recipients")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "name": "Alice Tester",
                        "email": "alice@example.com"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;
    assert!(body["unid"].is_string(), "expected unid in response, got: {body}");
}

#[sqlx::test(migrations = "../migrations")]
async fn delete_own_recipient_returns_204(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    // Create a recipient to delete.
    let create_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/recipients")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({ "name": "Bob To Delete" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(create_res.status(), StatusCode::CREATED);
    let created = body_json(create_res).await;
    let unid = created["unid"].as_str().unwrap().to_string();

    let delete_res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(&format!("/api/recipients/{unid}"))
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(delete_res.status(), StatusCode::NO_CONTENT);
}

#[sqlx::test(migrations = "../migrations")]
async fn delete_other_users_recipient_returns_404(pool: PgPool) {
    let user_cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    // Create a recipient owned by user@example.com.
    let create_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/recipients")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &user_cookie)
                .body(Body::from(
                    json!({ "name": "User's Private Recipient" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(create_res.status(), StatusCode::CREATED);
    let created = body_json(create_res).await;
    let unid = created["unid"].as_str().unwrap().to_string();

    // root@ attempts to delete user@'s recipient — should get 404.
    let root_cookie = get_session_cookie(pool.clone(), ROOT_EMAIL, PASSWORD).await;
    let delete_res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(&format!("/api/recipients/{unid}"))
                .header(header::COOKIE, &root_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(delete_res.status(), StatusCode::NOT_FOUND);
}
