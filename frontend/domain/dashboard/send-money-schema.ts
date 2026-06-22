import { z } from "zod";

export function formatIban(raw: string): string {
  const clean = raw.replace(/\s/g, "").toUpperCase();
  return clean.match(/.{1,4}/g)?.join(" ") ?? clean;
}

export function validateIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 65 ? (code - 55).toString() : c;
    })
    .join("");
  let remainder = 0;
  for (const chunk of numeric.match(/.{1,9}/g) ?? []) {
    remainder = Number(`${remainder}${chunk}`) % 97;
  }
  return remainder === 1;
}

export const sendMoneySchema = z.object({
  fromAccountId: z.string().min(1, "Select a source account"),
  recipientName: z.string().min(2, "Name required").trim(),
  iban: z.string().min(15, "Invalid IBAN").refine(validateIban, "Invalid IBAN"),
  amount: z.coerce.number().positive("Enter a valid amount"),
  description: z.string().optional(),
});

export const ownTransferSchema = z.object({
  fromAccountId: z.string().min(1, "Select a source account"),
  toAccountId: z.string().min(1, "Select a destination account"),
  amount: z.coerce.number().positive("Enter a valid amount"),
  description: z.string().optional(),
});
