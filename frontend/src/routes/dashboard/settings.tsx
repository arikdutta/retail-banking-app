import { createFileRoute } from "@tanstack/react-router";
import PageAccountDetails from "@/domain/dashboard/page-account-details";

export const Route = createFileRoute("/dashboard/settings")({
  component: PageAccountDetails,
});
