import { useQuery } from "@tanstack/react-query";

type StatCard = {
  id: string;
  account_id: string;
  label: string;
  balance: number;
  currency: string;
  trend: number;
};

export function useStatCards() {
  return useQuery<StatCard[]>({
    queryKey: ["stat-cards"],
    queryFn: () => fetch("/data/stat-cards.json").then((r) => r.json()),
  });
}
