import { useQuery } from "@tanstack/react-query";

type DonutEntry = {
  category: string;
  label: string;
  amount: number;
  currency: string;
};

export function useDonutStats() {
  return useQuery<DonutEntry[]>({
    queryKey: ["donut-stats"],
    queryFn: () => fetch("/data/donut-stats.json").then((r) => r.json()),
  });
}
