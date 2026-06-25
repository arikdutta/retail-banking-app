use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use super::model::{CreateSavingsGoalRequest, SavingsGoal};

pub struct SavingsGoalsDb;

impl SavingsGoalsDb {
    pub async fn list_for_user(
        pool: &PgPool,
        user_unid: Uuid,
    ) -> Result<Vec<SavingsGoal>, sqlx::Error> {
        sqlx::query_as!(
            SavingsGoal,
            r#"
            SELECT unid, user_unid, name, current_amount, target_amount, currency, created_at, updated_at
            FROM savings_goals
            WHERE user_unid = $1
            ORDER BY created_at ASC
            "#,
            user_unid,
        )
        .fetch_all(pool)
        .await
    }

    pub async fn create(
        pool: &PgPool,
        user_unid: Uuid,
        req: CreateSavingsGoalRequest,
    ) -> Result<SavingsGoal, sqlx::Error> {
        let currency = req.currency.unwrap_or_else(|| "USD".to_string());
        sqlx::query_as!(
            SavingsGoal,
            r#"
            INSERT INTO savings_goals (user_unid, name, target_amount, currency)
            VALUES ($1, $2, $3, $4)
            RETURNING unid, user_unid, name, current_amount, target_amount, currency, created_at, updated_at
            "#,
            user_unid,
            req.name,
            req.target_amount,
            currency,
        )
        .fetch_one(pool)
        .await
    }

    pub async fn update_progress(
        pool: &PgPool,
        unid: Uuid,
        user_unid: Uuid,
        current_amount: Decimal,
    ) -> Result<Option<SavingsGoal>, sqlx::Error> {
        sqlx::query_as!(
            SavingsGoal,
            r#"
            UPDATE savings_goals
            SET current_amount = $3
            WHERE unid = $1 AND user_unid = $2
            RETURNING unid, user_unid, name, current_amount, target_amount, currency, created_at, updated_at
            "#,
            unid,
            user_unid,
            current_amount,
        )
        .fetch_optional(pool)
        .await
    }

    pub async fn delete(
        pool: &PgPool,
        unid: Uuid,
        user_unid: Uuid,
    ) -> Result<Option<SavingsGoal>, sqlx::Error> {
        sqlx::query_as!(
            SavingsGoal,
            r#"
            DELETE FROM savings_goals
            WHERE unid = $1 AND user_unid = $2
            RETURNING unid, user_unid, name, current_amount, target_amount, currency, created_at, updated_at
            "#,
            unid,
            user_unid,
        )
        .fetch_optional(pool)
        .await
    }

    pub async fn exists(pool: &PgPool, unid: Uuid) -> Result<bool, sqlx::Error> {
        sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM savings_goals WHERE unid = $1)",
            unid,
        )
        .fetch_one(pool)
        .await
        .map(|v| v.unwrap_or(false))
    }
}
