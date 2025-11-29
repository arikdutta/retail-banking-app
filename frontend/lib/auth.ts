import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import type { Role } from "@/lib/roles";
import { SERVER_API_URL } from "@/lib/api-url";

export type SessionUser = { email: string; role: Role };

// Paths accessible without authentication (opt-in)
export const PUBLIC_PATHS = ["/login", "/demo"];

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = getCookie("session");
  if (!session) {
    console.log("[auth] getSessionUser: no session cookie");
    return null;
  }
  console.log("[auth] getSessionUser: calling", SERVER_API_URL);
  const res = await fetch(`${SERVER_API_URL}/api/auth/me`, {
    headers: { Cookie: `session=${session}` },
  });
  if (!res.ok) {
    console.warn("[auth] getSessionUser: /me returned", res.status);
    return null;
  }
  return res.json() as Promise<SessionUser>;
});
