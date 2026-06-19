import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { HttpError } from "@/lib/http-error";

export type DashboardStats = {
  tx_count: number;
  total_spent: number;
  total_received: number;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function useDashboardStats(days = 30) {
  return useQuery<DashboardStats>({
    queryKey: [...queryKeys.dashboardStats(), days],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/dashboard/stats?days=${days}`, {
        credentials: "include",
      });
      if (!r.ok) throw new HttpError(r.status, "Failed to fetch dashboard stats");
      return r.json();
    },
  });
}
