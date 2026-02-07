import { createFileRoute } from "@tanstack/react-router";
import DashboardUsersPage from "@/domain/dashboard/page-dashboard-users";

export const Route = createFileRoute("/admin/users")({
  component: DashboardUsersPage,
});
