use sqlx::PgPool;
use uuid::Uuid;

use super::model::{UpdateProfileRequest, UserProfile};

pub struct UserProfileDb;

impl UserProfileDb {
    pub async fn get(pool: &PgPool, user_unid: Uuid) -> Result<Option<UserProfile>, sqlx::Error> {
        sqlx::query_as!(
            UserProfile,
            r#"
            SELECT user_unid, first_name, last_name, date_of_birth,
                   phone, country, city, address, postal_code, avatar_data, updated_at
            FROM user_profiles
            WHERE user_unid = $1
            "#,
            user_unid,
        )
        .fetch_optional(pool)
        .await
    }

    pub async fn upsert(
        pool: &PgPool,
        user_unid: Uuid,
        req: UpdateProfileRequest,
    ) -> Result<UserProfile, sqlx::Error> {
        sqlx::query_as!(
            UserProfile,
            r#"
            INSERT INTO user_profiles (
                user_unid, first_name, last_name, date_of_birth,
                phone, country, city, address, postal_code, avatar_data, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
            ON CONFLICT (user_unid) DO UPDATE SET
                first_name    = EXCLUDED.first_name,
                last_name     = EXCLUDED.last_name,
                date_of_birth = EXCLUDED.date_of_birth,
                phone         = EXCLUDED.phone,
                country       = EXCLUDED.country,
                city          = EXCLUDED.city,
                address       = EXCLUDED.address,
                postal_code   = EXCLUDED.postal_code,
                avatar_data   = EXCLUDED.avatar_data,
                updated_at    = now()
            RETURNING user_unid, first_name, last_name, date_of_birth,
                      phone, country, city, address, postal_code, avatar_data, updated_at
            "#,
            user_unid,
            req.first_name,
            req.last_name,
            req.date_of_birth,
            req.phone,
            req.country,
            req.city,
            req.address,
            req.postal_code,
            req.avatar_data,
        )
        .fetch_one(pool)
        .await
    }
}
