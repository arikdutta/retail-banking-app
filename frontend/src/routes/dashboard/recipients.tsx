import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/recipients")({
  component: () => (
    <div className="p-6 text-muted-foreground text-sm">Recipients — coming soon</div>
  ),
});
