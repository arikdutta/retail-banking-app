import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Transaction } from "@/bindings/Transaction";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

export type TransactionsPage = {
  data: Transaction[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

async function fetchTransactions(page: number, accountUnid?: string): Promise<TransactionsPage> {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });
  if (accountUnid) params.set("account_unid", accountUnid);
  const r = await fetch(`${API_URL}/api/transactions?${params}`, { credentials: "include" });
  if (!r.ok) throw new Error(`Failed to fetch transactions: ${r.status}`);
  return r.json();
}

export function useTransactions(page: number, accountUnid?: string) {
  return useQuery<TransactionsPage>({
    queryKey: queryKeys.transactions.list(page, accountUnid),
    queryFn: () => fetchTransactions(page, accountUnid),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}
