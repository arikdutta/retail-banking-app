import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  component: () => (
    <div className="p-6 text-muted-foreground text-sm">Settings — coming soon</div>
  ),
});
