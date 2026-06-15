import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PageInvoices from "@/domain/dashboard/page-invoices";

export const Route = createFileRoute("/dashboard/invoices")({
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
  }),
  component: PageInvoices,
});
