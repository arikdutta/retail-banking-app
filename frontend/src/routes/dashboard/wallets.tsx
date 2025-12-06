import { createFileRoute } from "@tanstack/react-router";
import PageWallets from "@/domain/dashboard/page-wallets";

export const Route = createFileRoute("/dashboard/wallets")({
  component: PageWallets,
});
