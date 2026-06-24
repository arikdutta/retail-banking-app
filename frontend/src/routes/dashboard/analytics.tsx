import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import { useMoneyFlow } from "@/hooks/data/use-money-flow";
import { useBalanceHistory } from "@/hooks/data/use-balance-history";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const CHART_COLORS = [
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#F97316",
  "#14B8A6",
];

function fmtMonth(yyyyMM: string) {
  const [year, month] = yyyyMM.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function useAnalyticsDonut() {
  return useQuery<Array<{ category: string; total: number }>>({
    queryKey: ["analytics-donut"],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/dashboard/donut-stats`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch category stats");
      return r.json();
    },
    staleTime: 1000 * 60,
  });
}

// ─── Monthly Spending Bar Chart ────────────────────────────────────────────────

function MonthlySpendChart({ from, to }: { from: Date; to: Date }) {
  const { data, isPending, isError, refetch } = useMoneyFlow(from, to);

  const monthly = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { income: number; expense: number }>();
    for (const row of data) {
      const month = row.date.slice(0, 7);
      const existing = map.get(month) ?? { income: 0, expense: 0 };
      map.set(month, {
        income: existing.income + Number(row.income),
        expense: existing.expense + Number(row.expense),
      });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({ month, ...vals }));
  }, [data]);

  if (isError) return <ErrorCard message="Failed to load monthly spend. Retry?" onRetry={refetch} />;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Monthly Spending</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" /> Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> Spending
          </span>
        </div>
      </div>
      {isPending ? (
        <div className="flex items-end gap-2 h-[200px]">
          {[60, 80, 45, 90, 70, 85, 55, 75, 65, 88, 72, 50].map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : !monthly.length ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No transactions in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtMonth}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                fontSize: 12,
                border: "1px solid hsl(var(--border))",
              }}
              formatter={(val) => [`$${Number(val).toLocaleString()}`, ""]}
              labelFormatter={(label) => fmtMonth(String(label ?? ""))}
            />
            <Bar dataKey="income" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Income" />
            <Bar dataKey="expense" fill="#FB7185" radius={[3, 3, 0, 0]} name="Spending" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Spending by Category Pie Chart ───────────────────────────────────────────

function CategoryPieChart() {
  const { data, isPending, isError, refetch } = useAnalyticsDonut();

  const top = data?.slice(0, 8) ?? [];
  const total = top.reduce((s, d) => s + Number(d.total), 0);

  if (isError) return <ErrorCard message="Failed to load category data. Retry?" onRetry={refetch} />;

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 font-semibold text-sm">Spending by Category</h3>
      {isPending ? (
        <div className="flex items-center gap-4">
          <Skeleton className="h-[160px] w-[160px] rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                <Skeleton className="h-2.5 flex-1" />
                <Skeleton className="h-2.5 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : !top.length ? (
        <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
          No spending data yet.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <PieChart width={160} height={160}>
            <Pie
              data={top}
              cx={75}
              cy={75}
              innerRadius={40}
              outerRadius={72}
              dataKey="total"
              strokeWidth={0}
            >
              {top.map((_e, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length] ?? "#3B82F6"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                fontSize: 12,
                border: "1px solid hsl(var(--border))",
              }}
              formatter={(val) => [`$${Number(val).toLocaleString()}`, ""]}
            />
          </PieChart>
          <div className="flex-1 space-y-1.5 min-w-0">
            {top.map((d, i) => {
              const pct = total > 0 ? ((Number(d.total) / total) * 100).toFixed(1) : "0";
              return (
                <div key={d.category} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate flex-1">
                    {capitalize(d.category)}
                  </span>
                  <span className="text-muted-foreground shrink-0">{pct}%</span>
                  <span className="font-semibold shrink-0">${Number(d.total).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Balance Over Time Area Chart ─────────────────────────────────────────────

function BalanceChart({ from, to }: { from: Date; to: Date }) {
  const gradientId = "balance-gradient-chart";
  const { data, isPending, isError, refetch } = useBalanceHistory(from, to);

  if (isError) return <ErrorCard message="Failed to load balance data. Retry?" onRetry={refetch} />;

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 font-semibold text-sm">Balance Over Time</h3>
      {isPending ? (
        <div className="flex items-end gap-1 h-[200px] px-1">
          {[50, 55, 45, 60, 70, 65, 80, 75, 85, 90, 88, 95].map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No transactions in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtDate}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                fontSize: 12,
                border: "1px solid hsl(var(--border))",
              }}
              formatter={(val) => [
                `$${Number(val).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
                "Balance",
              ]}
              labelFormatter={(label) => fmtDate(String(label ?? ""))}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const [dateRange, setDateRange] = useState<DateRange>({ from: yearAgo, to: today });
  const [calOpen, setCalOpen] = useState(false);

  const fmtLabel = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const rangeLabel =
    dateRange.from && dateRange.to
      ? `${fmtLabel(dateRange.from)} – ${fmtLabel(dateRange.to)}`
      : "Pick a range";

  const from = dateRange.from ?? yearAgo;
  const to = dateRange.to ?? today;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Analytics</h2>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-sm hover:bg-muted transition-colors">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{rangeLabel}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                if (range) setDateRange(range);
                if (range?.from && range?.to) setCalOpen(false);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <MonthlySpendChart from={from} to={to} />
        <CategoryPieChart />
      </div>

      <BalanceChart from={from} to={to} />
    </div>
  );
}

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
});
