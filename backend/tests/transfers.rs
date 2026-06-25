mod common;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use common::{
    body_json, get_session_cookie, make_app, PASSWORD, ROOT_CHECKING_ACCOUNT_UNID,
    SEEDED_ACCOUNT_UNID, USER_EMAIL, USER_SAVINGS_ACCOUNT_UNID,
};
use serde_json::json;
use sqlx::PgPool;
use tower::ServiceExt;

// ── POST /api/transfers ───────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn create_transfer_happy_path(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    // Snapshot balance before the transfer so we can assert a precise decrement
    // regardless of what the seeded ledger reconciliation leaves as the starting value.
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
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "from_account_unid": SEEDED_ACCOUNT_UNID,
                        "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
                        "amount": 100.0,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);

    let after: String =
        sqlx::query_scalar("SELECT balance::text FROM accounts WHERE unid = $1::uuid")
            .bind(SEEDED_ACCOUNT_UNID)
            .fetch_one(&pool)
            .await
            .unwrap();
    let after: rust_decimal::Decimal = after.parse().unwrap();
    assert_eq!(
        after,
        before - rust_decimal::Decimal::new(100, 0),
        "source balance should be decremented by exactly 100.00"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn create_transfer_insufficient_funds_returns_422(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let before: String =
        sqlx::query_scalar("SELECT balance::text FROM accounts WHERE unid = $1::uuid")
            .bind(SEEDED_ACCOUNT_UNID)
            .fetch_one(&pool)
            .await
            .unwrap();

    // 999999.99 passes the model's max-amount validation (≤ 1_000_000) but exceeds
    // any realistic seeded balance, guaranteeing an insufficient-funds rejection.
    let res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "from_account_unid": SEEDED_ACCOUNT_UNID,
                        "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
                        "amount": 999999.99,
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);

    let after: String =
        sqlx::query_scalar("SELECT balance::text FROM accounts WHERE unid = $1::uuid")
            .bind(SEEDED_ACCOUNT_UNID)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(before, after, "balance must be unchanged after failed transfer");
}

#[sqlx::test(migrations = "../migrations")]
async fn create_transfer_from_other_users_account_returns_422(pool: PgPool) {
    // The handler returns 422 (not 403) for unauthorized accounts — security by obscurity:
    // it treats another user's account as "not found" rather than revealing its existence.
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "from_account_unid": ROOT_CHECKING_ACCOUNT_UNID,
                        "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
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
async fn create_transfer_amount_zero_returns_422(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "from_account_unid": SEEDED_ACCOUNT_UNID,
                        "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
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
async fn transfer_amount_negative_returns_422(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "from_account_unid": SEEDED_ACCOUNT_UNID,
                        "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
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

#[sqlx::test(migrations = "../migrations")]
async fn transfer_iban_too_short_returns_422(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool)
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "from_account_unid": SEEDED_ACCOUNT_UNID,
                        "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
                        "amount": 10.0,
                        "recipient_iban": "GB",
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
#[ignore = "requires Phase 5.5 idempotency_key field on CreateTransferRequest"]
async fn transfer_idempotency_prevents_duplicate(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let body = json!({
        "from_account_unid": SEEDED_ACCOUNT_UNID,
        "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
        "amount": 50.0,
        "idempotency_key": "idem-test-key-001",
    })
    .to_string();

    // First request — should succeed.
    let r1 = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(r1.status(), StatusCode::CREATED);

    // Second request with the same idempotency key — must return 201 (replayed) without
    // a second debit. Balance should reflect only one $50.00 deduction.
    let cookie2 = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;
    let r2 = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie2)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(r2.status(), StatusCode::CREATED);

    let balance: String =
        sqlx::query_scalar("SELECT balance::text FROM accounts WHERE unid = $1::uuid")
            .bind(SEEDED_ACCOUNT_UNID)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(balance, "3400.75", "balance should reflect exactly one $50.00 deduction");
}

#[sqlx::test(migrations = "../migrations")]
async fn concurrent_transfers_no_double_debit(pool: PgPool) {
    // Two simultaneous transfers each for 40 000 — any seeded balance is well below
    // 80 000, so only one can succeed. The FOR UPDATE lock prevents double-debit.
    let before: String =
        sqlx::query_scalar("SELECT balance::text FROM accounts WHERE unid = $1::uuid")
            .bind(SEEDED_ACCOUNT_UNID)
            .fetch_one(&pool)
            .await
            .unwrap();
    let before: rust_decimal::Decimal = before.parse().unwrap();
    assert!(
        before < rust_decimal::Decimal::new(80_000, 0),
        "seeded balance must be below 80 000 for this test to be meaningful (got {before})"
    );

    let cookie1 = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;
    let cookie2 = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let make_req = |cookie: String| {
        Request::builder()
            .method("POST")
            .uri("/api/transfers")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .body(Body::from(
                json!({
                    "from_account_unid": SEEDED_ACCOUNT_UNID,
                    "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
                    "amount": 40000.0,
                })
                .to_string(),
            ))
            .unwrap()
    };

    let (r1, r2) = tokio::join!(
        make_app(pool.clone()).oneshot(make_req(cookie1)),
        make_app(pool.clone()).oneshot(make_req(cookie2)),
    );
    let r1 = r1.unwrap();
    let r2 = r2.unwrap();

    let success_count = [r1.status(), r2.status()]
        .iter()
        .filter(|s| **s == StatusCode::CREATED)
        .count();
    assert_eq!(success_count, 1, "exactly one transfer must succeed");

    let after: String =
        sqlx::query_scalar("SELECT balance::text FROM accounts WHERE unid = $1::uuid")
            .bind(SEEDED_ACCOUNT_UNID)
            .fetch_one(&pool)
            .await
            .unwrap();
    let after: rust_decimal::Decimal = after.parse().unwrap();
    assert_eq!(
        after,
        before - rust_decimal::Decimal::new(40_000, 0),
        "balance must reflect exactly one 40 000.00 deduction"
    );
}

// ── Ledger consistency ────────────────────────────────────────────────────────

#[sqlx::test(migrations = "../migrations")]
async fn transfer_creates_two_ledger_entries(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    let res = make_app(pool.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/transfers")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::COOKIE, &cookie)
                .body(Body::from(
                    json!({
                        "from_account_unid": SEEDED_ACCOUNT_UNID,
                        "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
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
    let out_tx_unid: uuid::Uuid = body["unid"]
        .as_str()
        .expect("response must contain unid")
        .parse()
        .expect("unid must be a valid UUID");

    // The implementation creates two separate transactions: `transfer_out` (on source,
    // returned to the caller) and `transfer_in` (on destination, internal).  Each has
    // its own ledger entry, so we query them separately.

    // DEBIT — linked to the transfer_out transaction returned in the response.
    let debit = sqlx::query!(
        "SELECT account_unid, entry_type, amount FROM ledger_entries WHERE transaction_unid = $1",
        out_tx_unid
    )
    .fetch_one(&pool)
    .await
    .expect("missing DEBIT ledger entry for transfer_out transaction");

    assert_eq!(debit.entry_type, "DEBIT", "transfer_out must have a DEBIT entry");
    assert_eq!(
        debit.account_unid.to_string(),
        SEEDED_ACCOUNT_UNID,
        "DEBIT must be on source account"
    );
    assert_eq!(
        debit.amount,
        rust_decimal::Decimal::new(100_0000, 4),
        "DEBIT amount must be 100.0000"
    );

    // CREDIT — linked to the transfer_in transaction on the destination account.
    let dest_uuid: uuid::Uuid = USER_SAVINGS_ACCOUNT_UNID.parse().unwrap();
    let credit = sqlx::query!(
        r#"SELECT le.account_unid, le.entry_type, le.amount
           FROM ledger_entries le
           JOIN transactions t ON t.unid = le.transaction_unid
           WHERE le.account_unid = $1 AND t.transaction_type = 'transfer_in'
           ORDER BY le.created_at DESC
           LIMIT 1"#,
        dest_uuid
    )
    .fetch_one(&pool)
    .await
    .expect("missing CREDIT ledger entry for transfer_in transaction");

    assert_eq!(credit.entry_type, "CREDIT", "transfer_in must have a CREDIT entry");
    assert_eq!(
        credit.account_unid.to_string(),
        USER_SAVINGS_ACCOUNT_UNID,
        "CREDIT must be on destination account"
    );
    assert_eq!(
        credit.amount,
        rust_decimal::Decimal::new(100_0000, 4),
        "CREDIT amount must be 100.0000"
    );
}

#[sqlx::test(migrations = "../migrations")]
async fn account_balance_matches_ledger_sum(pool: PgPool) {
    let cookie = get_session_cookie(pool.clone(), USER_EMAIL, PASSWORD).await;

    for _ in 0..3 {
        let res = make_app(pool.clone())
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/transfers")
                    .header(header::CONTENT_TYPE, "application/json")
                    .header(header::COOKIE, &cookie)
                    .body(Body::from(
                        json!({
                            "from_account_unid": SEEDED_ACCOUNT_UNID,
                            "to_account_unid": USER_SAVINGS_ACCOUNT_UNID,
                            "amount": 100.0,
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED, "each transfer must succeed");
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
        "balance drift detected after transfers: {drifts:#?}"
    );
}
