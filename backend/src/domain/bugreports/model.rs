use std::hash::{DefaultHasher, Hash, Hasher};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumIter, EnumString};
use ts_rs::TS;
use uuid::Uuid;

#[derive(
    Debug,
    Default,
    Clone,
    PartialEq,
    Eq,
    Hash,
    Serialize,
    Deserialize,
    Display,
    EnumString,
    EnumIter,
    sqlx::Type,
    TS,
)]
#[ts(export, export_to = "../../frontend/bindings/")]
#[sqlx(type_name = "varchar", rename_all = "PascalCase")]
#[strum(serialize_all = "PascalCase")]
pub enum BugType {
    #[default]
    Bug,
    Server,
    JsError,
    PromiseRejection,
    BrowserWarning,
    NetworkError,
    Payment,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct AddBugReport {
    pub bug_type: BugType,
    pub message: String,
    pub exception_message: Option<String>,
    pub stack_trace: Option<String>,
    pub user_login: Option<String>,
    pub url: Option<String>,
    pub user_agent: Option<String>,
    pub application: Option<String>,
}

impl AddBugReport {
    pub fn similarity_hash(&self) -> i32 {
        let mut hasher = DefaultHasher::new();
        self.bug_type.to_string().hash(&mut hasher);
        self.message.hash(&mut hasher);
        self.stack_trace.hash(&mut hasher);
        #[allow(clippy::cast_possible_truncation)]
        let hash = hasher.finish() as i32;
        hash
    }
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct BugReport {
    pub id: i64,
    pub unid: Uuid,
    pub bugtype: String,
    pub similarityhash: i32,
    pub message: Option<String>,
    pub exceptionmessage: Option<String>,
    pub stacktrace: Option<String>,
    pub userlogin: Option<String>,
    pub url: Option<String>,
    pub useragent: Option<String>,
    pub application: Option<String>,
    pub created: DateTime<Utc>,
    pub total_count: i64,
    pub similar_count: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../frontend/bindings/")]
pub struct BugPerDay {
    pub date: String,
    pub bug_type: String,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct BugReportQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
    pub bug_type: Option<String>,
}
