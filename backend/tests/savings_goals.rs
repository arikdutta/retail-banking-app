mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{
    body_json, get_session_cookie, make_app, PASSWORD, ROOT_SAVINGS_GOAL_UNID,
    SEEDED_SAVINGS_GOAL_UNID, USER_EMAIL,
};
use serde_json::json;
use sqlx::PgPool;
use tower::ServiceExt;

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
    assert!(
        !body.as_array().unwrap().is_empty(),
        "user@example.com should have seeded savings goals"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn delete_other_users_goal_returns_403(pool: PgPool) {
    // ROOT_SAVINGS_GOAL_UNID belongs to root@example.com — user@ must be refused.
    let user_cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(&format!("/api/savings/{ROOT_SAVINGS_GOAL_UNID}"))
                .header(header::COOKIE, &user_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::FORBIDDEN);
}

#[sqlx::test(migrations = "../migrations")]
async fn delete_savings_goal(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let del_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(&format!("/api/savings/{SEEDED_SAVINGS_GOAL_UNID}"))
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
                .uri("/api/savings")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_json(list_res).await;
    let found = body
        .as_array()
        .unwrap()
        .iter()
        .any(|g| g["unid"] == SEEDED_SAVINGS_GOAL_UNID);
    assert!(!found, "deleted goal should not appear in list");
}

#[sqlx::test(migrations = "../migrations")]
async fn update_savings_goal_progress(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let patch_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(&format!("/api/savings/{SEEDED_SAVINGS_GOAL_UNID}"))
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({ "current_amount": 12000.0 }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(patch_res.status(), StatusCode::OK);

    let list_res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/savings")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = body_json(list_res).await;
    let goal = body
        .as_array()
        .unwrap()
        .iter()
        .find(|g| g["unid"] == SEEDED_SAVINGS_GOAL_UNID)
        .expect("goal should still be in list after update");
    assert_eq!(goal["current_amount"], json!(12000.0));
}

#[sqlx::test(migrations = "../migrations")]
async fn create_savings_goal_returns_201(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/savings")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "name": "Vacation Fund",
                        "target_amount": 3000.00,
                        "currency": "USD"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;
    assert_eq!(body["name"], "Vacation Fund");
    assert!(body["unid"].is_string());
}
