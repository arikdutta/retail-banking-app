import { useQuery } from "@tanstack/react-query";
import { Users, AlertCircle } from "lucide-react";
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
import type { Role } from "@/lib/roles";
import { queryKeys } from "@/lib/query-keys";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

type UserRow = {
  unid: string;
  email: string;
  role: Role;
  created_at: string;
};

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline" | "muted"> = {
  Root: "default",
  Admin: "secondary",
  RegularUser: "outline",
  Demo: "outline",
};

async function fetchUsers(): Promise<{ users: UserRow[] }> {
  const r = await fetch(`${API_URL}/api/dashboard/users`, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export default function PageDashboardUsers() {
  const { data, isError, error } = useQuery({
    queryKey: queryKeys.dashboardUsers(),
    queryFn: fetchUsers,
  });
  const users = data?.users ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Users</h1>
        {users && <span className="text-sm text-muted-foreground">({users.length})</span>}
      </div>

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Error loading users: {error.message}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            All users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users === null && !error ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading…
            </div>
          ) : users && users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No users found.
            </div>
          ) : users ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 text-xs font-medium text-muted-foreground">
                    Email
                  </TableHead>
                  <TableHead className="px-4 text-xs font-medium text-muted-foreground">
                    Role
                  </TableHead>
                  <TableHead className="px-4 text-xs font-medium text-muted-foreground">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.unid}>
                    <TableCell className="px-4 font-medium">{u.email}</TableCell>
                    <TableCell className="px-4">
                      <Badge
                        variant={ROLE_VARIANT[u.role] ?? "outline"}
                        className="text-xs"
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
