import { useQuery } from "@tanstack/react-query";

type DonutEntry = { name: string; value: number; color: string };

export function useDonutStats() {
  return useQuery<DonutEntry[]>({
    queryKey: ["donut-stats"],
    queryFn: () => fetch("/data/donut-stats.json").then((r) => r.json()),
  });
}
