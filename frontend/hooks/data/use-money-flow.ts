import { useQuery } from "@tanstack/react-query";

type MoneyFlowEntry = {
  date: string;
  income: number;
  expenses: number;
  currency: string;
};

export function useMoneyFlow() {
  return useQuery<MoneyFlowEntry[]>({
    queryKey: ["money-flow"],
    queryFn: () => fetch("/data/money-flow.json").then((r) => r.json()),
  });
}
