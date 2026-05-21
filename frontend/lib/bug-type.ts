import type { BugType } from "@/bindings/BugType";

export const BUG_TYPE = {
  Bug: "Bug",
  Server: "Server",
  JsError: "JsError",
  PromiseRejection: "PromiseRejection",
  BrowserWarning: "BrowserWarning",
  NetworkError: "NetworkError",
  Payment: "Payment",
} as const satisfies Record<string, BugType>;
