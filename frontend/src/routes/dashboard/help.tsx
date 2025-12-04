import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/help")({
  component: () => (
    <div className="p-6 text-muted-foreground text-sm">Get Help — coming soon</div>
  ),
});
