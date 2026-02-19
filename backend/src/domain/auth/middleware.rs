use axum::{
    extract::{FromRequestParts, Request},
    http::{header, request::Parts, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde_json::json;

use super::handler::verify_token;

use super::model::Role;
use crate::state::AppState;

pub struct AuthUser {
    #[allow(dead_code)]
    pub unid: uuid::Uuid,
    pub role: Role,
}

/// Requires a valid session cookie or Bearer token, plus any non-guest role.
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = extract_session_cookie(&parts.headers)
            .or_else(|| extract_bearer_token(&parts.headers))
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    axum::Json(json!({"error": "no session"})),
                )
                    .into_response()
            })?;

        let claims = verify_token(&token).map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                axum::Json(json!({"error": "invalid token"})),
            )
                .into_response()
        })?;

        let role = sqlx::query_scalar!(
            "SELECT role as \"role!\" FROM users WHERE unid = $1",
            claims.sub
        )
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("AuthUser db: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(json!({"error": "db error"})),
            )
                .into_response()
        })?
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                axum::Json(json!({"error": "user not found"})),
            )
                .into_response()
        })?;

        Ok(AuthUser {
            unid: claims.sub,
            role: role.parse().unwrap_or(Role::RegularUser),
        })
    }
}

/// Requires Admin or Root role.
#[allow(dead_code)]
pub struct AdminUser(pub AuthUser);

impl FromRequestParts<AppState> for AdminUser {
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if !user.role.is_elevated() {
            return Err((
                StatusCode::FORBIDDEN,
                axum::Json(json!({"error": "admin required"})),
            )
                .into_response());
        }
        Ok(AdminUser(user))
    }
}

/// Requires Root role only.
#[allow(dead_code)]
pub struct RootUser(pub AuthUser);

impl FromRequestParts<AppState> for RootUser {
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if user.role != Role::Root {
            return Err((
                StatusCode::FORBIDDEN,
                axum::Json(json!({"error": "root required"})),
            )
                .into_response());
        }
        Ok(RootUser(user))
    }
}

fn extract_bearer_token(headers: &axum::http::HeaderMap) -> Option<String> {
    let value = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    value.strip_prefix("Bearer ").map(|t| t.to_string())
}

pub(crate) fn extract_session_cookie(headers: &axum::http::HeaderMap) -> Option<String> {
    let cookie_header = headers.get(header::COOKIE)?.to_str().ok()?;
    for part in cookie_header.split(';') {
        let part = part.trim();
        if let Some(val) = part.strip_prefix("session=") {
            return Some(val.to_string());
        }
    }
    None
}

pub async fn require_auth(request: Request, next: Next) -> Response {
    let path = request.uri().path().to_owned();

    let token = match extract_session_cookie(request.headers()) {
        Some(t) => t,
        None => {
            tracing::warn!(path, "require_auth: no session cookie");
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(json!({"error": "no session"})),
            )
                .into_response();
        }
    };

    if let Err(e) = verify_token(&token) {
        tracing::warn!(path, error = %e, "require_auth: invalid token");
        return (
            StatusCode::UNAUTHORIZED,
            axum::Json(json!({"error": "invalid token"})),
        )
            .into_response();
    }

    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::auth::model::Claims;
    use axum::http::{HeaderMap, HeaderValue};
    use jsonwebtoken::{encode, EncodingKey, Header};

    static ENV_LOCK: std::sync::OnceLock<std::sync::Mutex<()>> = std::sync::OnceLock::new();
    fn env_lock() -> &'static std::sync::Mutex<()> {
        ENV_LOCK.get_or_init(|| std::sync::Mutex::new(()))
    }

    fn make_header(value: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(header::COOKIE, HeaderValue::from_str(value).unwrap());
        headers
    }

    fn make_token_with_secret(exp: usize, secret: &str) -> String {
        encode(
            &Header::default(),
            &Claims {
                sub: uuid::Uuid::new_v4(),
                exp,
            },
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .unwrap()
    }

    // ── extract_session_cookie ────────────────────────────────────────────────

    #[test]
    fn extracts_session_from_single_cookie() {
        let headers = make_header("session=mytoken");
        assert_eq!(
            extract_session_cookie(&headers),
            Some("mytoken".to_string())
        );
    }

    #[test]
    fn extracts_session_from_multiple_cookies() {
        let headers = make_header("foo=bar; session=mytoken; baz=qux");
        assert_eq!(
            extract_session_cookie(&headers),
            Some("mytoken".to_string())
        );
    }

    #[test]
    fn returns_none_when_no_session_cookie() {
        let headers = make_header("foo=bar; baz=qux");
        assert_eq!(extract_session_cookie(&headers), None);
    }

    #[test]
    fn returns_none_when_no_cookie_header() {
        let headers = HeaderMap::new();
        assert_eq!(extract_session_cookie(&headers), None);
    }

    #[test]
    fn handles_jwt_with_equals_padding_in_value() {
        let headers = make_header("session=abc.def.ghi==");
        assert_eq!(
            extract_session_cookie(&headers),
            Some("abc.def.ghi==".to_string())
        );
    }

    // ── verify_token ─────────────────────────────────────────────────────────

    #[test]
    fn valid_token_returns_correct_claims() {
        let _g = env_lock().lock().unwrap();
        std::env::set_var("JWT_SECRET", "test_secret");
        let exp = (chrono::Utc::now() + chrono::Duration::days(1)).timestamp() as usize;
        let token = make_token_with_secret(exp, "test_secret");
        let claims = super::super::handler::verify_token(&token).unwrap();
        assert!(claims.sub.to_string().len() == 36); // valid UUID
    }

    #[test]
    fn expired_token_is_rejected() {
        let _g = env_lock().lock().unwrap();
        std::env::set_var("JWT_SECRET", "test_secret");
        let exp = (chrono::Utc::now() - chrono::Duration::seconds(120)).timestamp() as usize;
        let token = make_token_with_secret(exp, "test_secret");
        assert!(super::super::handler::verify_token(&token).is_err());
    }

    #[test]
    fn wrong_secret_is_rejected() {
        let _g = env_lock().lock().unwrap();
        std::env::set_var("JWT_SECRET", "correct_secret");
        let exp = (chrono::Utc::now() + chrono::Duration::days(1)).timestamp() as usize;
        let token = make_token_with_secret(exp, "wrong_secret");
        assert!(super::super::handler::verify_token(&token).is_err());
    }

    #[test]
    fn malformed_token_is_rejected() {
        let _g = env_lock().lock().unwrap();
        std::env::set_var("JWT_SECRET", "test_secret");
        assert!(super::super::handler::verify_token("not.a.jwt").is_err());
        assert!(super::super::handler::verify_token("").is_err());
        assert!(super::super::handler::verify_token("garbage").is_err());
    }

    // ── extract_bearer_token ─────────────────────────────────────────────────

    #[test]
    fn extracts_bearer_token() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Bearer mytoken123"),
        );
        assert_eq!(
            extract_bearer_token(&headers),
            Some("mytoken123".to_string())
        );
    }

    #[test]
    fn rejects_non_bearer_auth_scheme() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Basic dXNlcjpwYXNz"),
        );
        assert_eq!(extract_bearer_token(&headers), None);
    }

    #[test]
    fn returns_none_when_no_auth_header() {
        let headers = HeaderMap::new();
        assert_eq!(extract_bearer_token(&headers), None);
    }

    // ── Role ─────────────────────────────────────────────────────────────────

    #[test]
    fn role_parse() {
        use std::str::FromStr;
        assert_eq!(Role::from_str("Admin").unwrap(), Role::Admin);
        assert_eq!(Role::from_str("RegularUser").unwrap(), Role::RegularUser);
        assert_eq!(Role::from_str("Demo").unwrap(), Role::Demo);
        assert!("unknown".parse::<Role>().is_err());
    }

    #[test]
    fn role_display_roundtrip() {
        assert_eq!(Role::Admin.to_string(), "Admin");
        assert_eq!(Role::RegularUser.to_string(), "RegularUser");
        assert_eq!(Role::Demo.to_string(), "Demo");
    }
}
