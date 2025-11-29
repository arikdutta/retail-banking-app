import { createFileRoute } from "@tanstack/react-router";
import { UserPermission } from "@/domain/dashboard/permissions";
import DashboardUsersPage from "@/domain/dashboard/page-dashboard-users";

export const Route = createFileRoute("/dashboard/users")({
  beforeLoad: ({ context }) => {
    UserPermission.ListAll.check(context.user!.role);
  },
  component: DashboardUsersPage,
});
