import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/wallets")({
  component: () => (
    <div className="p-6 text-muted-foreground text-sm">My Wallets — coming soon</div>
  ),
});
