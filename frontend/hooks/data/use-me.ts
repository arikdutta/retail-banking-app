import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

export type Me = { email: string; role: string };

async function fetchMe(): Promise<Me | null> {
  const r = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
  if (!r.ok) return null;
  const data = await r.json();
  return data?.email ? (data as Me) : null;
}

export function useMe() {
  return useQuery<Me | null>({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}
