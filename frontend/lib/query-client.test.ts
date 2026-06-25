import { describe, it, expect } from "vitest";
import { bugTypeFromError } from "./query-client";
import { HttpError } from "./http-error";

describe("bugTypeFromError", () => {
  it("404 → NotFound", () => {
    expect(bugTypeFromError(new HttpError(404, "not found"))).toBe("NotFound");
  });

  it("401 → AuthError", () => {
    expect(bugTypeFromError(new HttpError(401, "unauthorized"))).toBe("AuthError");
  });

  it("403 → AuthError", () => {
    expect(bugTypeFromError(new HttpError(403, "forbidden"))).toBe("AuthError");
  });

  it("500 → ApiError", () => {
    expect(bugTypeFromError(new HttpError(500, "server error"))).toBe("ApiError");
  });

  it("422 → ApiError", () => {
    expect(bugTypeFromError(new HttpError(422, "validation error"))).toBe("ApiError");
  });

  it("plain Error (network/timeout) → NetworkError", () => {
    expect(bugTypeFromError(new Error("fetch failed"))).toBe("NetworkError");
  });
});
