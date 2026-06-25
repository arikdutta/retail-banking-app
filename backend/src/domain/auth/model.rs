use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: uuid::Uuid, // user unid
    pub exp: usize,      // unix timestamp
}

#[derive(Debug, Clone, PartialEq, Display, EnumString)]
#[strum(serialize_all = "PascalCase")]
pub enum Role {
    Root,
    Admin,
    RegularUser,
    Demo,
}

impl Role {
    /// Returns true for roles that have elevated (admin-level) privileges.
    pub fn is_elevated(&self) -> bool {
        matches!(self, Role::Root | Role::Admin)
    }
}
