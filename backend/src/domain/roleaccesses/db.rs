use sqlx::PgPool;
use uuid::Uuid;

use super::model::{RoleAccess, RoleAccessWithUser};

pub struct RoleAccessesDb;

impl RoleAccessesDb {
    pub async fn get_for_user(pool: &PgPool, user_unid: Uuid) -> Result<Vec<RoleAccess>, sqlx::Error> {
        sqlx::query_as!(
            RoleAccess,
            r#"SELECT unid, role, grantedto_unid FROM roleaccesses WHERE grantedto_unid = $1 ORDER BY role"#,
            user_unid
        )
        .fetch_all(pool)
        .await
    }

    pub async fn get_all_with_users(pool: &PgPool) -> Result<Vec<RoleAccessWithUser>, sqlx::Error> {
        sqlx::query_as!(
            RoleAccessWithUser,
            r#"
                SELECT ra.unid, ra.role, u.email as user_email, u.unid as user_unid
                FROM roleaccesses ra
                JOIN users u ON u.unid = ra.grantedto_unid
                ORDER BY ra.role, u.email
            "#
        )
        .fetch_all(pool)
        .await
    }
}
