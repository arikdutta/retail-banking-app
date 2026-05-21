import { definePermission } from "@/lib/permission";
import { ROLES } from "@/lib/roles";

// Mirrors Rust: UserPermission enum implementing Permission trait
export const UserPermission = {
  ListAll: definePermission(ROLES.Root),
} as const;

export const BugReportsPermission = {
  View: definePermission(ROLES.Root, ROLES.Admin),
} as const;

export const StatsPermission = {
  View: definePermission(ROLES.Root, ROLES.Admin),
} as const;
