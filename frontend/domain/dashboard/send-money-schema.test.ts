import { describe, it, expect } from "vitest";
import { sendMoneySchema } from "./send-money-schema";

const VALID_BASE = {
  fromAccountId: "acc-1",
  recipientName: "Jane Smith",
  iban: "GB29NWBK60161331926819",
  amount: 100,
};

describe("sendMoneySchema", () => {
  it("rejects amount: 0", () => {
    const result = sendMoneySchema.safeParse({ ...VALID_BASE, amount: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const amountIssue = result.error.issues.find((i) => i.path[0] === "amount");
      expect(amountIssue).toBeDefined();
    }
  });

  it("rejects IBAN shorter than 15 chars", () => {
    const result = sendMoneySchema.safeParse({ ...VALID_BASE, iban: "GB29NWB" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const ibanIssue = result.error.issues.find((i) => i.path[0] === "iban");
      expect(ibanIssue).toBeDefined();
    }
  });

  it("accepts a valid payload", () => {
    const result = sendMoneySchema.safeParse(VALID_BASE);
    expect(result.success).toBe(true);
  });
});
