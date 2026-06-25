import { describe, it, expect } from "vitest";
import { fingerprint } from "./error-reporter";
import { BUG_TYPE } from "./bug-type";

describe("fingerprint", () => {
  it("returns the same hash for identical inputs", () => {
    const a = fingerprint(BUG_TYPE.JsError, "TypeError: x is null", "at foo:10");
    const b = fingerprint(BUG_TYPE.JsError, "TypeError: x is null", "at foo:10");
    expect(a).toBe(b);
  });

  it("returns different hashes for different messages", () => {
    const a = fingerprint(BUG_TYPE.JsError, "Error A", "at foo:1");
    const b = fingerprint(BUG_TYPE.JsError, "Error B", "at foo:1");
    expect(a).not.toBe(b);
  });

  it("returns different hashes for different bug types", () => {
    const a = fingerprint(BUG_TYPE.JsError, "same message");
    const b = fingerprint(BUG_TYPE.PromiseRejection, "same message");
    expect(a).not.toBe(b);
  });

  it("returns different hashes when stack trace differs", () => {
    const a = fingerprint(BUG_TYPE.JsError, "same message", "at foo:1");
    const b = fingerprint(BUG_TYPE.JsError, "same message", "at bar:2");
    expect(a).not.toBe(b);
  });
});
