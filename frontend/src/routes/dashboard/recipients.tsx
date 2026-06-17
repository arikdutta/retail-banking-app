import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import PageRecipients from "@/domain/dashboard/page-recipients";

export const Route = createFileRoute("/dashboard/recipients")({
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
  }),
  component: PageRecipients,
});
