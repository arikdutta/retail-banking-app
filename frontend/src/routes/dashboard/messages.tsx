import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/messages")({
  component: () => (
    <div className="p-6 text-muted-foreground text-sm">Messages — coming soon</div>
  ),
});
