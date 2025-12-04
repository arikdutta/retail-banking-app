import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/transactions")({
  component: () => (
    <div className="p-6 text-muted-foreground text-sm">Transactions — coming soon</div>
  ),
});
