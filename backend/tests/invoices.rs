mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{body_json, get_session_cookie, make_app, PASSWORD, ROOT_EMAIL, USER_EMAIL};
use serde_json::json;
use sqlx::PgPool;
use tower::ServiceExt;

#[sqlx::test(migrations = "../migrations")]
async fn list_invoices_returns_paginated_json(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/invoices?page=1&per_page=5")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = body_json(res).await;
    assert!(body["data"].is_array(), "expected data array, got: {body}");
    assert!(body["page"].is_number(), "expected page number, got: {body}");
    assert!(body["total"].is_number(), "expected total number, got: {body}");
}

#[sqlx::test(migrations = "../migrations")]
async fn create_invoice_returns_201(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/invoices")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "recipient_name": "ACME Corp",
                        "amount": "10.00",
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
    assert!(body["unid"].is_string(), "expected unid in response, got: {body}");
}

#[sqlx::test(migrations = "../migrations")]
async fn update_invoice_status_valid_transition(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    // Create a draft invoice.
    let create_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/invoices")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "recipient_name": "Transition Test Recipient",
                        "amount": "25.00",
                        "currency": "USD"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(create_res.status(), StatusCode::CREATED);
    let created = body_json(create_res).await;
    let unid = created["unid"].as_str().unwrap().to_string();

    // Transition draft → sent.
    let patch_res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(&format!("/api/invoices/{unid}/status"))
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(json!({ "status": "sent" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(patch_res.status(), StatusCode::OK);
    let updated = body_json(patch_res).await;
    assert_eq!(updated["status"], "sent", "status should be updated to sent");
}

#[sqlx::test(migrations = "../migrations")]
async fn update_invoice_status_invalid_returns_400(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    // Create an invoice to target.
    let create_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/invoices")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "recipient_name": "Invalid Status Test",
                        "amount": "5.00",
                        "currency": "USD"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(create_res.status(), StatusCode::CREATED);
    let created = body_json(create_res).await;
    let unid = created["unid"].as_str().unwrap().to_string();

    // Send an invalid status value ("pending" is not in the allowed list).
    let patch_res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(&format!("/api/invoices/{unid}/status"))
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(json!({ "status": "pending" }).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(patch_res.status(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrations = "../migrations")]
async fn invoices_isolates_by_user(pool: PgPool) {
    let root_cookie = get_session_cookie(pool.clone(), ROOT_EMAIL, PASSWORD).await;

    // root@ creates an invoice.
    let create_res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/invoices")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &root_cookie)
                .body(Body::from(
                    json!({
                        "recipient_name": "Root's Private Client",
                        "amount": "99.99",
                        "currency": "USD"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(create_res.status(), StatusCode::CREATED);
    let created = body_json(create_res).await;
    let root_invoice_unid = created["unid"].as_str().unwrap().to_string();

    // user@ lists their own invoices — must not see root@'s invoice.
    let user_cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;
    let list_res = make_app(pool)
        .oneshot(
            Request::builder()
                .uri("/api/invoices")
                .header(header::COOKIE, &user_cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(list_res.status(), StatusCode::OK);
    let body = body_json(list_res).await;
    let ids: Vec<&str> = body["data"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|inv| inv["unid"].as_str())
        .collect();

    assert!(
        !ids.contains(&root_invoice_unid.as_str()),
        "user@'s invoice list must not include root@'s invoice"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn invoice_missing_required_field_returns_422(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/invoices")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}
