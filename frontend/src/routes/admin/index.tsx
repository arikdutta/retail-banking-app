import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/domain/dashboard/page-dashboard";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});
