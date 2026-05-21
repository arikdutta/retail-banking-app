import { describe, it, expect } from "vitest";
import { emailInitials } from "./utils";

describe("emailInitials", () => {
  it("two-part local with dot: max.wells@example.com → MW", () => {
    expect(emailInitials("max.wells@example.com")).toBe("MW");
  });

  it("two-part local with dash: jean-pierre@example.com → JP", () => {
    expect(emailInitials("jean-pierre@example.com")).toBe("JP");
  });

  it("two-part local with underscore: john_doe@example.com → JD", () => {
    expect(emailInitials("john_doe@example.com")).toBe("JD");
  });

  it("single-part local: admin@example.com → AD", () => {
    expect(emailInitials("admin@example.com")).toBe("AD");
  });

  it("single char local: a@b.com → A", () => {
    expect(emailInitials("a@b.com")).toBe("A");
  });

  it("empty local (@domain.com) → ?", () => {
    expect(emailInitials("@domain.com")).toBe("?");
  });

  it("no @ treated as full local: admin → AD", () => {
    expect(emailInitials("admin")).toBe("AD");
  });

  it("uppercases result", () => {
    expect(emailInitials("max.wells@example.com")).toBe("MW");
    expect(emailInitials("MAX.WELLS@example.com")).toBe("MW");
  });
});
