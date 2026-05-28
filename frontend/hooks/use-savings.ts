import { useQuery } from "@tanstack/react-query";

type SavingsItem = { name: string; amount: number; progress: number; color: string };

export function useSavings() {
  return useQuery<SavingsItem[]>({
    queryKey: ["savings"],
    queryFn: () => fetch("/data/savings.json").then((r) => r.json()),
  });
}
