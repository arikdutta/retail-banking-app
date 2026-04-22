import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Account } from "@/bindings/Account";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

async function fetchAccounts(): Promise<Account[]> {
  const r = await fetch(`${API_URL}/api/accounts`, { credentials: "include" });
  if (!r.ok) throw new Error(`Failed to fetch accounts: ${r.status}`);
  return r.json();
}

export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: queryKeys.accounts.list(),
    queryFn: fetchAccounts,
    staleTime: 1000 * 30,
  });
}
