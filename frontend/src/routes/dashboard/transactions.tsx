import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PageTransactions from "@/domain/dashboard/page-transactions";

export const Route = createFileRoute("/dashboard/transactions")({
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
  }),
  component: PageTransactions,
});
