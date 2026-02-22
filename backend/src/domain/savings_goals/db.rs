use sqlx::PgPool;
use uuid::Uuid;

use super::model::SavingsGoal;

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
}
