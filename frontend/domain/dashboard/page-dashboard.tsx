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
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStatCards } from "@/hooks/use-stat-cards";

// ─── Mock data ────────────────────────────────────────────────────────────────

const moneyFlowData = [
  { date: "Jan 10", income: 3200, expenses: 2100 },
  { date: "Jan 11", income: 4100, expenses: 2800 },
  { date: "Jan 12", income: 5052, expenses: 3200 },
  { date: "Jan 13", income: 3800, expenses: 4100 },
  { date: "Jan 14", income: 4600, expenses: 2900 },
  { date: "Jan 15", income: 5200, expenses: 3500 },
  { date: "Jan 16", income: 4800, expenses: 3100 },
];

const recentTransactions = [
  { id: 1, name: "Bitcoin transactions", date: "Jan 16, 2022", amount: -835,  status: "success", color: "bg-orange-500", initials: "₿" },
  { id: 2, name: "Sent to Antonio",      date: "Jan 14, 2022", amount: -150,  status: "pending", color: "bg-blue-500",   initials: "A" },
  { id: 3, name: "Withdraw Paypal",      date: "Jan 13, 2022", amount: +200,  status: "success", color: "bg-blue-400",   initials: "P" },
];

const recentActivity = [
  { id: 1, name: "Stripe",   sub: "Deposit",     amount: +523.10,  date: "Today at 9:25 AM",      color: "bg-purple-500", initials: "S" },
  { id: 2, name: "Facebook", sub: "Advertising", amount: -600.00,  date: "Today at 9:34 AM",       color: "bg-blue-600",   initials: "f" },
  { id: 3, name: "Upwork",   sub: "Business",    amount: -1243.00, date: "Yesterday at 10:05 PM",  color: "bg-green-500",  initials: "U" },
  { id: 4, name: "UI8.net",  sub: "Payment",     amount: -190.00,  date: "Yesterday at 4:00 PM",   color: "bg-indigo-500", initials: "U" },
];

const savingsData = [
  { name: "Mutual funds", amount: 545, progress: 72, color: "bg-blue-600" },
  { name: "Investment",   amount: 234, progress: 38, color: "bg-blue-400" },
];

const donutData = [
  { name: "Savings",    value: 725,  color: "#3B82F6" },
  { name: "Expenses",   value: 2350, color: "#93C5FD" },
  { name: "Investment", value: 110,  color: "#DBEAFE" },
];


// ─── Sub-components ───────────────────────────────────────────────────────────

function PromoBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
      <div className="relative z-10">
        <p className="text-sm font-medium opacity-80">Special Offer</p>
        <h2 className="mt-1 text-2xl font-bold leading-tight">Unlimited Cashback</h2>
        <p className="mt-1 text-sm opacity-70">
          Instant 2% back on all your spendings on your account
        </p>
        <Button size="sm" className="mt-4 bg-white text-blue-600 hover:bg-blue-50 font-semibold">
          Upgrade Now →
        </Button>
      </div>
      <div className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 opacity-10">
        <div className="h-40 w-40 rounded-full border-[16px] border-white" />
      </div>
      <div className="pointer-events-none absolute right-12 top-4 opacity-10">
        <Smartphone className="h-20 w-20" />
      </div>
    </div>
  );
}

function StatCards() {
  const { data, isPending } = useStatCards();

  if (isPending) return <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="rounded-xl border bg-card p-4 h-20 animate-pulse" />)}</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {(data ?? []).map((card) => (
        <div key={card.label} className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-lg font-bold tracking-tight">{card.value}</p>
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
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={moneyFlowData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
    </div>
  );
}

function RecentTransactions() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Recent Transactions</h3>
        <button className="text-xs text-blue-600 hover:underline">View all</button>
      </div>
      <div className="space-y-3">
        {recentTransactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", tx.color)}>
              {tx.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.name}</p>
              <p className="text-xs text-muted-foreground">{tx.date}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("text-sm font-semibold", tx.amount > 0 ? "text-emerald-500" : "")}>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "mt-0.5 text-[10px] px-1.5 py-0 border-0 h-4",
                  tx.status === "success" && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
                  tx.status === "pending" && "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
                )}
              >
                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
              </Badge>
            </div>
          </div>
        ))}
      </div>
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
        <p className="text-xs font-semibold opacity-60">Overpay.</p>
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

function WalletActions() {
  const actions = [
    { label: "Send",      icon: Send },
    { label: "Receive",   icon: Download },
    { label: "Invoicing", icon: FileText },
    { label: "More",      icon: MoreHorizontal },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ label, icon: Icon }) => (
        <button
          key={label}
          className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30">
            <Icon className="h-4 w-4" />
          </div>
          {label}
        </button>
      ))}
    </div>
  );
}

function QuickTransfer() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-3 font-semibold text-sm">Quick Transfer</h3>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Debit</span>
        <span className="font-semibold">$10,431 ↓</span>
      </div>
      <div className="rounded-lg border bg-muted/40 px-3 py-2 mb-3">
        <p className="text-xs text-muted-foreground mb-0.5">Enter amount</p>
        <p className="text-xl font-bold">$1,24</p>
      </div>
      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
        Send Money
      </Button>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Recent Activity</h3>
        <button className="text-xs text-blue-600 hover:underline">View all</button>
      </div>
      <div className="space-y-3">
        {recentActivity.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", item.color)}>
              {item.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{item.name}</p>
              <p className="text-[10px] text-muted-foreground">{item.date}</p>
            </div>
            <p className={cn("text-sm font-semibold shrink-0", item.amount > 0 ? "text-emerald-500" : "")}>
              {item.amount > 0 ? "+" : ""}
              {item.amount.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavingsSection() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Saving</h3>
        <span className="text-xs text-muted-foreground">This month ↓</span>
      </div>
      <div className="space-y-4">
        {savingsData.map((item) => (
          <div key={item.name}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-semibold">${item.amount}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${item.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatisticsDonut() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Statistics</h3>
        <button className="text-xs text-blue-600 hover:underline">View all</button>
      </div>
      <div className="flex items-center gap-3">
        <PieChart width={90} height={90}>
          <Pie data={donutData} cx={40} cy={40} innerRadius={24} outerRadius={42} dataKey="value" strokeWidth={0}>
            {donutData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="space-y-1.5 flex-1">
          {donutData.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-muted-foreground truncate">{d.name}</span>
              <span className="ml-auto font-semibold">${d.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageDashboard() {
  return (
    <div className="flex min-h-full gap-6 p-6">
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
        <WalletActions />
        <QuickTransfer />
        <RecentActivity />
      </div>
    </div>
  );
}
