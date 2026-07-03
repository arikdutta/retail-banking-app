import { describe, it, expect } from "vitest";
import { depositSchema } from "./deposit-schema";

const CASH_BASE = {
  toAccountId: "acc-1",
  source: "cash" as const,
  sourceName: "Cash deposit",
  amount: 100,
};

const BANK_BASE = {
  toAccountId: "acc-1",
  source: "bank_transfer" as const,
  sourceName: "Chase Bank",
  sourceIban: "GB29NWBK60161331926819",
  amount: 100,
};

describe("depositSchema", () => {
  it("accepts a valid cash payload", () => {
    const result = depositSchema.safeParse(CASH_BASE);
    expect(result.success).toBe(true);
  });

  it("accepts a valid card payload", () => {
    const result = depositSchema.safeParse({
      ...CASH_BASE,
      source: "card",
      sourceName: "Visa •••• 4242",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid bank_transfer payload", () => {
    const result = depositSchema.safeParse(BANK_BASE);
    expect(result.success).toBe(true);
  });

  it("rejects bank_transfer without an IBAN", () => {
    const result = depositSchema.safeParse({ ...BANK_BASE, sourceIban: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "sourceIban");
      expect(issue).toBeDefined();
    }
  });

  it("rejects bank_transfer with an invalid IBAN", () => {
    const result = depositSchema.safeParse({ ...BANK_BASE, sourceIban: "GB29NWB" });
    expect(result.success).toBe(false);
  });

  it("rejects amount: 0", () => {
    const result = depositSchema.safeParse({ ...CASH_BASE, amount: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "amount");
      expect(issue).toBeDefined();
    }
  });
});
