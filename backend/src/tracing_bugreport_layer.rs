use sqlx::PgPool;
use tracing::Level;
use tracing_subscriber::Layer;

use crate::domain::bugreports::{
    db::BugReportsDb,
    model::{AddBugReport, BugType},
};

pub struct BugReportLayer {
    pub pool: PgPool,
}

#[derive(Default)]
struct MessageVisitor {
    message: String,
}

impl tracing::field::Visit for MessageVisitor {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{value:?}");
        }
    }

    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" {
            self.message = value.to_owned();
        }
    }
}

impl<S: tracing::Subscriber> Layer<S> for BugReportLayer {
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: tracing_subscriber::layer::Context<'_, S>) {
        if *event.metadata().level() != Level::ERROR {
            return;
        }

        let mut visitor = MessageVisitor::default();
        event.record(&mut visitor);

        if visitor.message.is_empty() {
            return;
        }

        let report = AddBugReport {
            bug_type: BugType::Server,
            message: visitor.message,
            exception_message: None,
            stack_trace: None,
            user_login: None,
            url: None,
            user_agent: None,
            application: Some("backend".to_owned()),
        };

        let pool = self.pool.clone();
        tokio::spawn(async move {
            let _ = BugReportsDb::insert(&pool, &report).await;
        });
    }
}
