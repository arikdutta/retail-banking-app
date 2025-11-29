import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell } from "@/domain/dashboard/dashboard-shell";

export const Route = createFileRoute("/dashboard")({
  component: () => {
    const { user } = Route.useRouteContext();
    return (
      <DashboardShell user={user!}>
        <Outlet />
      </DashboardShell>
    );
  },
});
