import { useQuery } from "@tanstack/react-query";

type ActivityItem = {
  id: string;
  merchant_name: string;
  category: string;
  amount: number;
  currency: string;
  timestamp: string;
};

export function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ["recent-activity"],
    queryFn: () => fetch("/data/recent-activity.json").then((r) => r.json()),
  });
}
