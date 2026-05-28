import { useQuery } from "@tanstack/react-query";

type ActivityItem = {
  id: number;
  name: string;
  sub: string;
  amount: number;
  date: string;
  color: string;
  initials: string;
};

export function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ["recent-activity"],
    queryFn: () => fetch("/data/recent-activity.json").then((r) => r.json()),
  });
}
