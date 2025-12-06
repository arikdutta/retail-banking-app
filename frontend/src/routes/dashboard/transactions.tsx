import { createFileRoute } from "@tanstack/react-router";
import PageTransactions from "@/domain/dashboard/page-transactions";

export const Route = createFileRoute("/dashboard/transactions")({
  component: PageTransactions,
});
