import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CLIENT_API_URL } from "@/lib/api-url";
import { ROLES } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import { UserPermission, BugReportsPermission, StatsPermission } from "@/domain/dashboard/permissions";

// ── Types ────────────────────────────────────────────────────────────────────

type RoleAccess = { unid: string; role: string; grantedto_unid: string };
type RoleAccessWithUser = { unid: string; role: string; user_email: string; user_unid: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  Root:        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Admin:       "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  RegularUser: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Demo:        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role] ?? ""}`}>
      {role}
    </span>
  );
}

// ── Section 1: Root Access Check ─────────────────────────────────────────────

function RootAccessCheck() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["roleaccesses", "root-check"],
    queryFn: async () => {
      const r = await fetch(`${CLIENT_API_URL}/api/roleaccesses/root-check`, { credentials: "include" });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json() as Promise<{ ok: boolean; message: string }>;
    },
    retry: false,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Root Access Check</CardTitle>
        <p className="text-xs text-muted-foreground">
          Calls <code className="font-mono text-[11px]">GET /api/roleaccesses/root-check</code> — Root only. Mirrors Rust's <code className="font-mono text-[11px]">get_root_access_data()</code>.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {data && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
            <ShieldCheck className="h-4 w-4" />
            {data.message}
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
            <ShieldX className="h-4 w-4" />
            Access denied — Root role required
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Section 2: Your Current Roles (from roleaccesses table) ──────────────────

function MyRoles() {
  const { data, isLoading } = useQuery({
    queryKey: ["roleaccesses", "mine"],
    queryFn: async () => {
      const r = await fetch(`${CLIENT_API_URL}/api/roleaccesses/mine`, { credentials: "include" });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json() as Promise<{ roles: RoleAccess[] }>;
    },
  });

  const permissionMatrix = [
    { label: "Users — ListAll",    permission: UserPermission.ListAll },
    { label: "Bug Reports — View", permission: BugReportsPermission.View },
    { label: "Stats — View",       permission: StatsPermission.View },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Your Current Roles</CardTitle>
        <p className="text-xs text-muted-foreground">
          Loaded from <code className="font-mono text-[11px]">roleaccesses</code> table. Mirrors Rust's <code className="font-mono text-[11px]">get_current_user_roles()</code>.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {data && (
          <>
            <div className="flex flex-wrap gap-2">
              {data.roles.length === 0
                ? <span className="text-sm text-muted-foreground">No role grants found</span>
                : data.roles.map((ra) => <RoleBadge key={ra.unid} role={ra.role} />)
              }
            </div>

            {data.roles.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permission checks</p>
                {permissionMatrix.map(({ label, permission }) => {
                  const role = data.roles[0]?.role as Role | undefined;
                  const allowed = role ? permission.hasPermission(role) : false;
                  return (
                    <div key={label} className="flex items-center gap-2 text-sm">
                      {allowed
                        ? <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                        : <ShieldX    className="h-3.5 w-3.5 text-red-400 opacity-60" />}
                      <span className={allowed ? "" : "text-muted-foreground"}>
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        requires: {permission.rolesRequired.join(", ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Section 3: All Role Grants (Root only) ───────────────────────────────────

function AllRoleGrants() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["roleaccesses", "all"],
    queryFn: async () => {
      const r = await fetch(`${CLIENT_API_URL}/api/roleaccesses`, { credentials: "include" });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json() as Promise<{ grants: RoleAccessWithUser[] }>;
    },
    retry: false,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">All Role Grants</CardTitle>
        <p className="text-xs text-muted-foreground">
          From <code className="font-mono text-[11px]">roleaccesses</code> joined with <code className="font-mono text-[11px]">users</code> — Root only. Mirrors Rust's <code className="font-mono text-[11px]">get_all_users()</code>.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {isError && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <ShieldX className="h-4 w-4" />
            Access denied — Root role required
          </div>
        )}
        {data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-muted-foreground text-xs">Grant ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.grants.map((g) => (
                <TableRow key={g.unid}>
                  <TableCell className="text-sm">{g.user_email}</TableCell>
                  <TableCell><RoleBadge role={g.role} /></TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{g.unid}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AccessDemoPage() {
  const { user } = useRouteContext({ from: "/dashboard" });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Access Control Demo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Roles stored in <code className="font-mono text-xs">roleaccesses</code> table. Permissions defined in code.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">{user!.email}</span>
          <RoleBadge role={user!.role} />
        </div>
      </div>

      {/* Section 1 — mirrors get_root_access_data() */}
      <RootAccessCheck />

      {/* Section 2 — mirrors get_current_user_roles() */}
      <MyRoles />

      {/* Section 3 — mirrors get_all_users() */}
      <AllRoleGrants />
    </div>
  );
}
