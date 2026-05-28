import { useQuery } from "@tanstack/react-query";

type Transaction = {
  id: number;
  name: string;
  date: string;
  amount: number;
  status: string;
  color: string;
  initials: string;
};

export function useRecentTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["recent-transactions"],
    queryFn: () => fetch("/data/recent-transactions.json").then((r) => r.json()),
  });
}
