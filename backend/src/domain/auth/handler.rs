use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde_json::json;
use time::Duration;
use uuid::Uuid;

use super::middleware::AdminUser;
use super::model::{Claims, LoginRequest};
use crate::state::AppState;

struct LoginRow {
    unid: Uuid,
    password: String,
}
struct MeRow {
    unid: Uuid,
    email: String,
    role: String,
}

fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").expect("JWT_SECRET not set")
}

fn make_token(user_unid: Uuid) -> Result<String, jsonwebtoken::errors::Error> {
    let exp = (chrono::Utc::now() + chrono::Duration::days(30)).timestamp() as usize;
    encode(
        &Header::default(),
        &Claims {
            sub: user_unid,
            exp,
        },
        &EncodingKey::from_secret(jwt_secret().as_bytes()),
    )
}

pub fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret().as_bytes()),
        &Validation::default(),
    )?;
    Ok(data.claims)
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(body): Json<LoginRequest>,
) -> impl IntoResponse {
    let row = sqlx::query_as!(
        LoginRow,
        "SELECT unid, password FROM users WHERE email = $1",
        body.email
    )
    .fetch_optional(&state.pool)
    .await;

    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "invalid credentials"})),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("auth login db: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "db error"})),
            )
                .into_response();
        }
    };

    if !pwhash::unix::verify(&body.password, &row.password) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "invalid credentials"})),
        )
            .into_response();
    }

    let token = match make_token(row.unid) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("jwt encode: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "token error"})),
            )
                .into_response();
        }
    };

    let is_prod = std::env::var("APP_ENV")
        .map(|v| v == "production")
        .unwrap_or(false);
    let cookie = Cookie::build(("session", token))
        .http_only(true)
        .secure(is_prod)
        .same_site(SameSite::Lax)
        .path("/")
        .max_age(Duration::days(30))
        .build();

    (jar.add(cookie), Json(json!({"ok": true}))).into_response()
}

/// POST /api/auth/logout
pub async fn logout(jar: CookieJar) -> impl IntoResponse {
    let cookie = Cookie::build(("session", ""))
        .http_only(true)
        .path("/")
        .max_age(Duration::seconds(0))
        .build();
    (jar.add(cookie), Json(json!({"ok": true}))).into_response()
}

/// GET /api/auth/me
pub async fn me(State(state): State<AppState>, jar: CookieJar) -> impl IntoResponse {
    let token = match jar.get("session") {
        Some(c) => c.value().to_string(),
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "no session"})),
            )
                .into_response()
        }
    };

    let claims = match verify_token(&token) {
        Ok(c) => c,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "invalid token"})),
            )
                .into_response()
        }
    };

    let row = sqlx::query_as!(
        MeRow,
        "SELECT unid, email, role as \"role!\" FROM users WHERE unid = $1",
        claims.sub
    )
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(r)) => (
            StatusCode::OK,
            Json(json!({"unid": r.unid, "email": r.email, "role": r.role})),
        )
            .into_response(),
        _ => (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "user not found"})),
        )
            .into_response(),
    }
}

/// GET /api/dashboard/users — admin or root only.
pub async fn dashboard_users(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> impl IntoResponse {
    struct UserRow {
        unid: uuid::Uuid,
        email: String,
        role: String,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let rows = sqlx::query_as!(
        UserRow,
        r#"SELECT unid, email, role as "role!", created_at FROM users ORDER BY created_at DESC"#
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let users: Vec<_> = rows
                .iter()
                .map(|r| {
                    json!({
                        "unid":       r.unid,
                        "email":      r.email,
                        "role":       r.role,
                        "created_at": r.created_at.to_rfc3339(),
                    })
                })
                .collect();
            (StatusCode::OK, Json(json!({ "users": users }))).into_response()
        }
        Err(e) => {
            tracing::error!("dashboard_users db: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "db error"})),
            )
                .into_response()
        }
    }
}

/// GET /api/dashboard/stats — admin or root only.
pub async fn dashboard_stats(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> impl IntoResponse {
    struct UserRoleCount {
        role: String,
        count: i64,
    }

    let users = sqlx::query_as!(
        UserRoleCount,
        r#"SELECT role as "role!", COUNT(*)::bigint as "count!"
           FROM users GROUP BY role"#
    )
    .fetch_all(&state.pool)
    .await;

    let total_users = sqlx::query_scalar!(r#"SELECT COUNT(*)::bigint as "count!" FROM users"#)
        .fetch_one(&state.pool)
        .await;

    match (users, total_users) {
        (Ok(users), Ok(total)) => {
            let by_role: serde_json::Value = serde_json::to_value(
                users
                    .iter()
                    .map(|r| (r.role.clone(), r.count))
                    .collect::<std::collections::HashMap<_, _>>(),
            )
            .unwrap_or(serde_json::Value::Null);

            (
                StatusCode::OK,
                Json(json!({
                    "users": { "total": total, "by_role": by_role },
                })),
            )
                .into_response()
        }
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "db error"})),
        )
            .into_response(),
    }
}
