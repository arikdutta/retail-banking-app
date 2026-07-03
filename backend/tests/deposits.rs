mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{
    body_json, get_session_cookie, make_app, PASSWORD, ROOT_CHECKING_ACCOUNT_UNID,
    SEEDED_ACCOUNT_UNID, USER_EMAIL,
};
use serde_json::json;
use sqlx::PgPool;
use tower::ServiceExt;

// ── POST /api/deposits ──────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn create_deposit_happy_path(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let before: String =
        sqlx::query_scalar("SELECT balance::text FROM accounts WHERE unid = $1::uuid")
            .bind(SEEDED_ACCOUNT_UNID)
            .fetch_one(&pool)
            .await
            .unwrap();
    let before: rust_decimal::Decimal = before.parse().unwrap();

    let res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/deposits")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "to_account_unid": SEEDED_ACCOUNT_UNID,
                        "source": "cash",
                        "source_name": "Cash deposit",
                        "amount": 100.0,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;
    assert_eq!(body["category"], "deposit");
    assert_eq!(body["transaction_type"], "credit");

    let after: String =
        sqlx::query_scalar("SELECT balance::text FROM accounts WHERE unid = $1::uuid")
            .bind(SEEDED_ACCOUNT_UNID)
            .fetch_one(&pool)
            .await
            .unwrap();
    let after: rust_decimal::Decimal = after.parse().unwrap();
    assert_eq!(
        after,
        before + rust_decimal::Decimal::new(100, 0),
        "destination balance should be incremented by exactly 100.00"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn create_deposit_bank_transfer_without_iban_returns_422(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/deposits")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "to_account_unid": SEEDED_ACCOUNT_UNID,
                        "source": "bank_transfer",
                        "source_name": "Chase Bank",
                        "amount": 100.0,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test(migrations = "../migrations")]
async fn create_deposit_bank_transfer_with_iban_succeeds(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/deposits")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "to_account_unid": SEEDED_ACCOUNT_UNID,
                        "source": "bank_transfer",
                        "source_name": "Chase Bank",
                        "source_iban": "GB29 NWBK 6016 1331 9268 19",
                        "amount": 100.0,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;
    assert_eq!(body["counterparty_iban"], "GB29 NWBK 6016 1331 9268 19");
}

#[sqlx::test(migrations = "../migrations")]
async fn create_deposit_to_other_users_account_returns_422(pool: PgPool) {
    // Same "not found" obscurity behavior as transfers — see transfers.rs.
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/deposits")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "to_account_unid": ROOT_CHECKING_ACCOUNT_UNID,
                        "source": "cash",
                        "source_name": "Cash deposit",
                        "amount": 10.0,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test(migrations = "../migrations")]
async fn create_deposit_amount_zero_returns_422(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/deposits")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "to_account_unid": SEEDED_ACCOUNT_UNID,
                        "source": "cash",
                        "source_name": "Cash deposit",
                        "amount": 0,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test(migrations = "../migrations")]
async fn create_deposit_amount_negative_returns_422(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/deposits")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "to_account_unid": SEEDED_ACCOUNT_UNID,
                        "source": "cash",
                        "source_name": "Cash deposit",
                        "amount": -1,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

// ── Ledger consistency ────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn deposit_creates_one_credit_ledger_entry(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/deposits")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "to_account_unid": SEEDED_ACCOUNT_UNID,
                        "source": "card",
                        "source_name": "Visa •••• 4242",
                        "amount": 100.0,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = body_json(res).await;
    let tx_unid: uuid::Uuid = body["unid"]
        .as_str()
        .expect("response must contain unid")
        .parse()
        .expect("unid must be a valid UUID");

    let credit = sqlx::query!(
        "SELECT account_unid, entry_type, amount FROM ledger_entries WHERE transaction_unid = $1",
        tx_unid
    )
    .fetch_one(&pool)
    .await
    .expect("missing CREDIT ledger entry for deposit transaction");

    assert_eq!(credit.entry_type, "CREDIT", "deposit must have a CREDIT entry");
    assert_eq!(
        credit.account_unid.to_string(),
        SEEDED_ACCOUNT_UNID,
        "CREDIT must be on destination account"
    );
    assert_eq!(
        credit.amount,
        rust_decimal::Decimal::new(100_0000, 4),
        "CREDIT amount must be 100.0000"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn account_balance_matches_ledger_sum_after_deposits(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    for _ in 0..3 {
        let res = make_app(pool.clone())
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/deposits")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header(header::COOKIE, &cookie)
                    .body(Body::from(
                        json!({
                            "to_account_unid": SEEDED_ACCOUNT_UNID,
                            "source": "cash",
                            "source_name": "Cash deposit",
                            "amount": 100.0,
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED, "each deposit must succeed");
    }

    let drifts = sqlx::query!(
        r#"SELECT account_unid, cached_balance, computed_balance, drift
           FROM check_balance_drift()"#
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    assert!(
        drifts.is_empty(),
        "balance drift detected after deposits: {drifts:#?}"
    );
}
