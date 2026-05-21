import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryKeys } from "@/lib/query-keys";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

type DashboardStats = {
  users: { total: number; by_role: Record<string, number> };
};

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_URL}/api/dashboard/stats`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export default function PageDashboard() {
  const { data: stats, isError, error } = useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: fetchDashboardStats,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Overview</h1>
      </div>

      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Error loading stats: {error.message}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Users
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stats == null ? (
                  <span className="animate-pulse text-muted-foreground">—</span>
                ) : (
                  stats.users.total
                )}
              </p>
              {stats && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {Object.entries(stats.users.by_role)
                    .map(([r, n]) => `${r}: ${n}`)
                    .join(" · ")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
