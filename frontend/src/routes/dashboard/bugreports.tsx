import { createFileRoute } from "@tanstack/react-router";
import { BugReportsPermission } from "@/domain/dashboard/permissions";
import DashboardBugReportsPage from "@/domain/dashboard/page-dashboard-bugreports";

export const Route = createFileRoute("/dashboard/bugreports")({
  beforeLoad: ({ context }) => {
    BugReportsPermission.View.check(context.user!.role);
  },
  component: DashboardBugReportsPage,
});
