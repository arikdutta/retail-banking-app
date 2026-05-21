import { createFileRoute } from "@tanstack/react-router";
import { AccessDemoPage } from "@/domain/dashboard/page-access-demo";

export const Route = createFileRoute("/dashboard/access-demo")({
  component: AccessDemoPage,
});
