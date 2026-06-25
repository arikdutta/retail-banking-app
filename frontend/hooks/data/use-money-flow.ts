import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { HttpError } from "@/lib/http-error";

type MoneyFlowEntry = {
  date: string;
  income: number;
  expense: number;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useMoneyFlow(from?: Date, to?: Date) {
  const fromStr = from ? toLocalDateStr(from) : undefined;
  const toStr   = to   ? toLocalDateStr(to)   : undefined;

  return useQuery<MoneyFlowEntry[]>({
    queryKey: ["money-flow", fromStr, toStr],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromStr) params.set("from", fromStr);
      if (toStr)   params.set("to",   toStr);
      const r = await fetch(`${API_URL}/api/dashboard/money-flow?${params}`, {
        credentials: "include",
      });
      if (!r.ok) throw new HttpError(r.status, "Failed to fetch money flow");
      return r.json();
    },
    placeholderData: keepPreviousData,
  });
}
