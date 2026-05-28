import { useQuery } from "@tanstack/react-query";

type SavingsItem = {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  currency: string;
};

export function useSavings() {
  return useQuery<SavingsItem[]>({
    queryKey: ["savings"],
    queryFn: () => fetch("/data/savings.json").then((r) => r.json()),
  });
}
