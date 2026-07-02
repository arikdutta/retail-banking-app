import { describe, it, expect } from "vitest";
import { fmtDate, fmtShortDate } from "./date";

describe("fmtDate", () => {
  it("strips time from a full ISO datetime", () => {
    expect(fmtDate("2024-06-15T10:30:00Z")).toBe("2024-06-15");
  });

  it("strips time with offset", () => {
    expect(fmtDate("2024-01-01T23:59:59+05:30")).toBe("2024-01-01");
  });

  it("returns an already-date-only string unchanged", () => {
    expect(fmtDate("2024-12-31")).toBe("2024-12-31");
  });
});

describe("fmtShortDate", () => {
  it("formats an ISO datetime as month + day", () => {
    expect(fmtShortDate("2024-06-15T10:30:00Z")).toBe("Jun 15");
  });
});
