use sqlx::PgPool;
use uuid::Uuid;

use super::model::{AddBugReport, BugPerDay, BugReport};

pub struct BugReportsDb;

impl BugReportsDb {
    pub async fn insert(pool: &PgPool, report: &AddBugReport) -> Result<i64, sqlx::Error> {
        let bug_type = report.bug_type.to_string();
        let similarity_hash = report.similarity_hash();

        let id = sqlx::query_scalar!(
            r#"
            INSERT INTO public.bugreports (
                bugtype, similarityhash, message, exceptionmessage,
                stacktrace, userlogin, url, useragent, application
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
            "#,
            bug_type,
            similarity_hash,
            report.message,
            report.exception_message,
            report.stack_trace,
            report.user_login,
            report.url,
            report.user_agent,
            report.application,
        )
        .fetch_one(pool)
        .await?;

        Ok(id)
    }

    pub async fn list(
        pool: &PgPool,
        page: i64,
        per_page: i64,
        search: Option<&str>,
        bug_type: Option<&str>,
    ) -> Result<Vec<BugReport>, sqlx::Error> {
        let offset = (page - 1) * per_page;

        if search.is_none_or(str::is_empty) && bug_type.is_none() {
            sqlx::query_as!(
                BugReport,
                r#"
                WITH unique_bugs AS (
                    SELECT DISTINCT ON (similarityhash)
                        id, unid, bugtype, similarityhash, message, exceptionmessage,
                        stacktrace, userlogin, url, useragent, application, created
                    FROM public.bugreports
                    ORDER BY similarityhash, created DESC
                ),
                counted AS (
                    SELECT u.*,
                        (SELECT COUNT(*) FROM public.bugreports b2 WHERE b2.similarityhash = u.similarityhash) AS similar_count
                    FROM unique_bugs u
                )
                SELECT
                    id, unid, bugtype, similarityhash, message, exceptionmessage,
                    stacktrace, userlogin, url, useragent, application, created,
                    COUNT(*) OVER() AS "total_count!",
                    similar_count AS "similar_count!"
                FROM counted
                ORDER BY created DESC
                LIMIT $1 OFFSET $2
                "#,
                per_page,
                offset,
            )
            .fetch_all(pool)
            .await
        } else if bug_type.is_some() && search.is_none_or(str::is_empty) {
            sqlx::query_as!(
                BugReport,
                r#"
                WITH unique_bugs AS (
                    SELECT DISTINCT ON (similarityhash)
                        id, unid, bugtype, similarityhash, message, exceptionmessage,
                        stacktrace, userlogin, url, useragent, application, created
                    FROM public.bugreports
                    WHERE bugtype = $3
                    ORDER BY similarityhash, created DESC
                ),
                counted AS (
                    SELECT u.*,
                        (SELECT COUNT(*) FROM public.bugreports b2 WHERE b2.similarityhash = u.similarityhash) AS similar_count
                    FROM unique_bugs u
                )
                SELECT
                    id, unid, bugtype, similarityhash, message, exceptionmessage,
                    stacktrace, userlogin, url, useragent, application, created,
                    COUNT(*) OVER() AS "total_count!",
                    similar_count AS "similar_count!"
                FROM counted
                ORDER BY created DESC
                LIMIT $1 OFFSET $2
                "#,
                per_page,
                offset,
                bug_type,
            )
            .fetch_all(pool)
            .await
        } else {
            let pattern = format!("%{}%", search.unwrap_or("").to_lowercase());
            sqlx::query_as!(
                BugReport,
                r#"
                WITH unique_bugs AS (
                    SELECT DISTINCT ON (similarityhash)
                        id, unid, bugtype, similarityhash, message, exceptionmessage,
                        stacktrace, userlogin, url, useragent, application, created
                    FROM public.bugreports
                    WHERE (LOWER(message) LIKE $3 OR LOWER(exceptionmessage) LIKE $3)
                        AND ($4::varchar IS NULL OR bugtype = $4)
                    ORDER BY similarityhash, created DESC
                ),
                counted AS (
                    SELECT u.*,
                        (SELECT COUNT(*) FROM public.bugreports b2 WHERE b2.similarityhash = u.similarityhash) AS similar_count
                    FROM unique_bugs u
                )
                SELECT
                    id, unid, bugtype, similarityhash, message, exceptionmessage,
                    stacktrace, userlogin, url, useragent, application, created,
                    COUNT(*) OVER() AS "total_count!",
                    similar_count AS "similar_count!"
                FROM counted
                ORDER BY created DESC
                LIMIT $1 OFFSET $2
                "#,
                per_page,
                offset,
                pattern,
                bug_type,
            )
            .fetch_all(pool)
            .await
        }
    }

    pub async fn get_by_unid(pool: &PgPool, unid: Uuid) -> Result<Option<BugReport>, sqlx::Error> {
        sqlx::query_as!(
            BugReport,
            r#"
            SELECT
                b.id, b.unid, b.bugtype, b.similarityhash, b.message, b.exceptionmessage,
                b.stacktrace, b.userlogin, b.url, b.useragent, b.application, b.created,
                1::bigint AS "total_count!",
                (SELECT COUNT(*) FROM public.bugreports b2 WHERE b2.similarityhash = b.similarityhash) AS "similar_count!"
            FROM public.bugreports b
            WHERE b.unid = $1
            "#,
            unid,
        )
        .fetch_optional(pool)
        .await
    }

    pub async fn delete_all(pool: &PgPool) -> Result<u64, sqlx::Error> {
        let deleted = sqlx::query_scalar!("DELETE FROM public.bugreports RETURNING id")
            .fetch_all(pool)
            .await?;
        Ok(deleted.len() as u64)
    }

    pub async fn get_bugs_per_day(pool: &PgPool, days: i32) -> Result<Vec<BugPerDay>, sqlx::Error> {
        sqlx::query_as!(
            BugPerDay,
            r#"
            SELECT
                to_char(created::date, 'YYYY-MM-DD') AS "date!",
                bugtype AS "bug_type!",
                COUNT(*) AS "count!"
            FROM public.bugreports
            WHERE created >= CURRENT_DATE - $1::integer
            GROUP BY created::date, bugtype
            ORDER BY created::date ASC, bugtype ASC
            "#,
            days,
        )
        .fetch_all(pool)
        .await
    }
}
