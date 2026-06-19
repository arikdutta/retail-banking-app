import type { BugType } from "@/bindings/BugType";
import { BUG_TYPE } from "@/lib/bug-type";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

// 30s dedup window — same error doesn't flood the DB
const recent = new Set<string>();

let currentUserLogin: string | null = null;

export function setReporterUser(login: string | null) {
  currentUserLogin = login;
}

function fingerprint(bugType: BugType, message: string, stack?: string): string {
  const raw = `${bugType}:${message}:${stack ?? ""}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return String(h);
}

export function report({
  bugType,
  message,
  exceptionMessage,
  stackTrace,
}: {
  bugType: BugType;
  message: string;
  exceptionMessage?: string;
  stackTrace?: string;
}) {
  const key = fingerprint(bugType, message, stackTrace);
  if (recent.has(key)) return;
  recent.add(key);
  setTimeout(() => recent.delete(key), 30_000);

  fetch(`${API_URL}/api/bugreports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bug_type: bugType,
      message,
      exception_message: exceptionMessage ?? null,
      stack_trace: stackTrace ?? null,
      url: window.location.href,
      user_login: currentUserLogin ?? null,
      application: "invoiceapp",
    }),
  }).catch((e) => console.error("[error-reporter] failed:", e));
}

export function initErrorReporter() {
  window.onerror = (_event, source, lineno, colno, error) => {
    const stack = error?.stack ?? `${source}:${lineno}:${colno}`;
    report({
      bugType: BUG_TYPE.JsError,
      message: error?.message ?? String(_event),
      ...(stack ? { stackTrace: stack } : {}),
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    const stack = reason instanceof Error ? reason.stack : undefined;
    report({
      bugType: BUG_TYPE.PromiseRejection,
      message: reason instanceof Error ? reason.message : String(reason),
      ...(stack ? { stackTrace: stack } : {}),
    });
  };
}
