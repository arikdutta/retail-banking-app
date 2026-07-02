import { z } from "zod";
import { validateIban } from "./send-money-schema";

export const depositSchema = z
  .object({
    toAccountId: z.string().min(1, "Select a destination account"),
    source: z.enum(["bank_transfer", "card", "cash"]),
    sourceName: z.string().min(1, "Source name required").trim(),
    sourceIban: z.string().optional(),
    amount: z.coerce.number().positive("Enter a valid amount"),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.source === "bank_transfer" && !(data.sourceIban && validateIban(data.sourceIban))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceIban"],
        message: "Invalid IBAN",
      });
    }
  });
