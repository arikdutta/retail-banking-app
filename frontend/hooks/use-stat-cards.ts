import { useQuery } from "@tanstack/react-query";

type StatCard = { label: string; value: string; trend: number };

export function useStatCards() {
  return useQuery<StatCard[]>({
    queryKey: ["stat-cards"],
    queryFn: () => fetch("/data/stat-cards.json").then((r) => r.json()),
  });
}
