import { describe, it, expect } from "vitest";
import { mapMoneyFlow } from "./data/use-money-flow";

describe("mapMoneyFlow", () => {
  it("maps income/expense to moneyIn/moneyOut", () => {
    const result = mapMoneyFlow({ date: "2024-06-01", income: 1500, expense: 200 });
    expect(result).toEqual({ date: "2024-06-01", moneyIn: 1500, moneyOut: 200 });
  });

  it("preserves the date string unchanged", () => {
    const result = mapMoneyFlow({ date: "2024-01-15", income: 0, expense: 0 });
    expect(result.date).toBe("2024-01-15");
  });

  it("maps zero values correctly", () => {
    const result = mapMoneyFlow({ date: "2024-03-10", income: 0, expense: 500 });
    expect(result).toEqual({ date: "2024-03-10", moneyIn: 0, moneyOut: 500 });
  });
});
