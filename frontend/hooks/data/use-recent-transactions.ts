import { useQuery } from "@tanstack/react-query";

type Transaction = {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
};

export function useRecentTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["recent-transactions"],
    queryFn: () => fetch("/data/recent-transactions.json").then((r) => r.json()),
  });
}
