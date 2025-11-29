import { redirect } from "@tanstack/react-router";
import type { Role } from "@/lib/roles";

export type PermissionDef = {
  rolesRequired: Role[];
  hasPermission: (role: Role) => boolean;
  check: (role: Role) => void;
};

// Mirrors Rust: Permission trait + roles_required() implementation
export function definePermission(...roles: Role[]): PermissionDef {
  const allowed = new Set<Role>(roles);
  return {
    rolesRequired: [...roles] as Role[],
    hasPermission: (role) => allowed.has(role),
    check: (role) => {
      if (!allowed.has(role)) throw redirect({ to: "/dashboard" });
    },
  };
}
