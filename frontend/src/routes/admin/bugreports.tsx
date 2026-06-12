import { createFileRoute } from "@tanstack/react-router";
import DashboardBugReportsPage from "@/domain/dashboard/page-dashboard-bugreports";

export const Route = createFileRoute("/admin/bugreports")({
  component: DashboardBugReportsPage,
});
