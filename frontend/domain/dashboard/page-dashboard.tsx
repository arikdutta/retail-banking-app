import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Send,
  Download,
  FileText,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PromoBanner } from "@/domain/dashboard/promo-banner";
import { SendMoneyModal, type SendMoneyPrefill } from "@/domain/dashboard/send-money-modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useStatCards } from "@/hooks/data/use-stat-cards";
import { useMoneyFlow } from "@/hooks/data/use-money-flow";
import { useRecentTransactions } from "@/hooks/data/use-recent-transactions";
import { useSavings } from "@/hooks/data/use-savings";
import { useDonutStats } from "@/hooks/data/use-donut-stats";
import type { Transaction } from "@/bindings/Transaction";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

function useActivityFeed(limit = 10) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions", "activity", limit],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/api/transactions/activity?limit=${limit}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to fetch activity");
      return r.json();
    },
    staleTime: 1000 * 30,
  });
}

const AVATAR_COLORS = ["bg-purple-500", "bg-blue-600", "bg-green-500", "bg-indigo-500", "bg-rose-500"];
const SAVINGS_COLORS = ["bg-blue-600", "bg-blue-400"];
const DONUT_COLORS   = ["#3B82F6", "#93C5FD", "#DBEAFE"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCards() {
  const { data, isPending } = useStatCards();

  if (isPending) return (
    <div className="grid grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-24" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      {(data ?? []).map((card) => (
        <div key={card.label} className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-lg font-bold tracking-tight">{card.balance.toLocaleString("en-US", { style: "currency", currency: card.currency })}</p>
          <div className="mt-2 flex items-center gap-1">
            {card.trend > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-400" />
            )}
            <span className={cn("text-xs font-medium", card.trend > 0 ? "text-emerald-500" : "text-red-400")}>
              {Math.abs(card.trend)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MoneyFlowChart() {
  const { data, isPending } = useMoneyFlow();

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Money Flow</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" /> Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-200" /> Expenses
          </span>
          <span>Jan 10 – Jan 16</span>
        </div>
      </div>
      {isPending ? (
        <div className="space-y-2">
          <div className="flex items-end gap-1 h-[200px] px-1">
            {[40, 70, 50, 90, 60, 80, 45].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between px-1">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-2.5 w-6" />
            ))}
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtDate} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
              formatter={(val) => [`$${Number(val).toLocaleString()}`, ""]}
            />
            <Line type="monotone" dataKey="income"   stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="expenses" stroke="#BFDBFE" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function RecentTransactions() {
  const { data, isPending } = useRecentTransactions();

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Recent Transactions</h3>
        <button className="text-xs text-blue-600 hover:underline">View all</button>
      </div>
      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <div className="space-y-1.5 items-end flex flex-col">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((tx, i) => (
            <div key={tx.id} className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                {tx.description.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.description}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(tx.timestamp)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("text-sm font-semibold", tx.amount > 0 ? "text-emerald-500" : "")}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toLocaleString("en-US", { style: "currency", currency: tx.currency })}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-0.5 text-[10px] px-1.5 py-0 border-0 h-4",
                    tx.status === "completed" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
                    tx.status === "pending"   && "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
                    tx.status === "failed"    && "bg-red-50 text-red-600 dark:bg-red-950/30",
                  )}
                >
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WalletCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs opacity-70">Balance</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">$24,098.00</p>
        </div>
        <p className="text-xs font-bold tracking-widest opacity-80 mt-1">VISA</p>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-semibold opacity-60">Rust Finance.</p>
        <div className="flex items-center">
          <div className="h-6 w-6 rounded-full bg-white/30" />
          <div className="-ml-3 h-6 w-6 rounded-full bg-white/20" />
        </div>
      </div>
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-4 -right-2 h-14 w-14 rounded-full bg-white/5" />
    </div>
  );
}

const ACTION_CLS = "flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function WalletActions({ onSend }: { onSend: () => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <button className={ACTION_CLS} onClick={onSend}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30">
          <Send className="h-4 w-4" />
        </div>
        Send
      </button>
      <button className={ACTION_CLS}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30">
          <Download className="h-4 w-4" />
        </div>
        Receive
      </button>
      <button className={ACTION_CLS}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30">
          <MoreHorizontal className="h-4 w-4" />
        </div>
        More
      </button>
      <Link to="/dashboard/invoices" search={{ page: 1 }} className={ACTION_CLS}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30">
          <FileText className="h-4 w-4" />
        </div>
        Invoicing
      </Link>
    </div>
  );
}

function QuickTransfer({ onSend }: { onSend: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-3 font-semibold text-sm">Quick Transfer</h3>
      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={onSend}>
        Send Money
      </Button>
    </div>
  );
}

function RecentActivity({ onSendAgain }: { onSendAgain: (prefill: SendMoneyPrefill) => void }) {
  const { data, isPending } = useActivityFeed(8);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Recent Activity</h3>
        <button className="text-xs text-blue-600 hover:underline">View all</button>
      </div>
      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((tx, i) => {
            const label = tx.counterparty_name ?? tx.description;
            const isOut = tx.transaction_type === "transfer_out";
            return (
              <div key={tx.unid} className="flex items-center gap-3">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                  {label.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(tx.created_at)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <p className={cn("text-sm font-semibold", tx.amount > 0 ? "text-emerald-500" : "")}>
                    {tx.amount > 0 ? "+" : ""}
                    {Number(tx.amount).toLocaleString("en-US", { style: "currency", currency: tx.currency })}
                  </p>
                  {isOut && (
                    <button
                      title="Send Again"
                      className="text-muted-foreground hover:text-blue-600 transition-colors"
                      onClick={() =>
                        onSendAgain({
                          recipientName: tx.counterparty_name ?? undefined,
                          recipientIban: tx.counterparty_iban ?? undefined,
                          amount: String(Math.abs(Number(tx.amount))),
                        })
                      }
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SavingsSection() {
  const { data, isPending } = useSavings();

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Saving</h3>
        <span className="text-xs text-muted-foreground">This month ↓</span>
      </div>
      {isPending ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((item, i) => {
            const progress = Math.round((item.current_amount / item.target_amount) * 100);
            return (
              <div key={item.id}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold">{item.current_amount.toLocaleString("en-US", { style: "currency", currency: item.currency })}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all", SAVINGS_COLORS[i % SAVINGS_COLORS.length])} style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatisticsDonut() {
  const { data, isPending } = useDonutStats();

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Statistics</h3>
        <button className="text-xs text-blue-600 hover:underline">View all</button>
      </div>
      {isPending ? (
        <div className="flex items-center gap-3">
          <Skeleton className="h-[90px] w-[90px] rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                <Skeleton className="h-2.5 flex-1" />
                <Skeleton className="h-2.5 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <PieChart width={90} height={90}>
            <Pie data={data ?? []} cx={40} cy={40} innerRadius={24} outerRadius={42} dataKey="amount" strokeWidth={0}>
              {(data ?? []).map((_entry, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]!} />
              ))}
            </Pie>
          </PieChart>
          <div className="space-y-1.5 flex-1">
            {(data ?? []).map((d, i) => (
              <div key={d.category} className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="text-muted-foreground truncate">{d.label}</span>
                <span className="ml-auto font-semibold">{d.amount.toLocaleString("en-US", { style: "currency", currency: d.currency })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageDashboard() {
  const [sendPrefill, setSendPrefill] = useState<SendMoneyPrefill | null>(null);

  function openSend(prefill?: SendMoneyPrefill) {
    setSendPrefill(prefill ?? {});
  }

  return (
    <div className="flex min-h-full gap-6 p-6">
      {sendPrefill !== null && (
        <SendMoneyModal
          prefill={Object.keys(sendPrefill).length > 0 ? sendPrefill : undefined}
          onClose={() => setSendPrefill(null)}
        />
      )}

      {/* Left column */}
      <div className="flex flex-1 flex-col gap-5 min-w-0">
        <PromoBanner />
        <StatCards />
        <MoneyFlowChart />
        <RecentTransactions />
        <div className="grid grid-cols-2 gap-4">
          <SavingsSection />
          <StatisticsDonut />
        </div>
      </div>

      {/* Right column */}
      <div className="flex w-72 shrink-0 flex-col gap-4">
        <WalletCard />
        <WalletActions onSend={() => openSend()} />
        <QuickTransfer onSend={() => openSend()} />
        <RecentActivity onSendAgain={(prefill) => openSend(prefill)} />
      </div>
    </div>
  );
}
