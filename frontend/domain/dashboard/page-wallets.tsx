import { useState, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowDownToLine,
  Send,
  Download,
  FileText,
  ShoppingCart,
  MoreVertical,
  CalendarIcon,
  CreditCard,
  Coins,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AccountType } from "../../../backend/bindings/AccountType";
import { useAccounts } from "@/hooks/data/use-accounts";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardStats } from "@/hooks/data/use-dashboard-stats";
import { SendMoneyModal } from "@/domain/dashboard/send-money-modal";

const ACCOUNT_TYPE_META: Record<AccountType, { gradient: string; brand: string }> = {
  checking:   { gradient: "from-blue-600 to-blue-700",       brand: "VISA" },
  savings:    { gradient: "from-amber-400 to-amber-500",     brand: "MASTERCARD" },
  business:   { gradient: "from-emerald-500 to-emerald-600", brand: "AMEX" },
  investment: { gradient: "from-purple-500 to-purple-600",   brand: "DISCOVER" },
};

function formatBalance(balance: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(balance);
}


function daysInRange(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function mockValue(date: Date, seed: number): number {
  const d = date.getDate() + date.getMonth() * 31;
  return Math.round(1000 + ((d * seed * 1337) % 4000));
}

function generateBarData(from: Date, to: Date) {
  return daysInRange(from, to).map((date) => ({
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    moneyIn: mockValue(date, 7),
    moneyOut: mockValue(date, 3),
  }));
}

function formatRange(range: DateRange | undefined): string {
  if (!range?.from) return "Pick a range";
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return range.to ? `${fmt(range.from)} – ${fmt(range.to)}` : fmt(range.from);
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", CAD: "🇨🇦", AUD: "🇦🇺",
  JPY: "🇯🇵", CHF: "🇨🇭", CNY: "🇨🇳", INR: "🇮🇳", SGD: "🇸🇬",
};

const quickLinks = [
  { label: "Deposit",   icon: ArrowDownToLine, href: null },
  { label: "Send",      icon: Send,            href: null },
  { label: "Receive",   icon: Download,        href: null },
  { label: "Invoicing", icon: FileText,        href: "/dashboard/invoices" },
  { label: "Checkout",  icon: ShoppingCart,    href: null },
];

// ─── Components ───────────────────────────────────────────────────────────────

function CardItem({ account }: { account: { label: string; balance: number; currency: string; account_type: AccountType } }) {
  const { gradient, brand } = ACCOUNT_TYPE_META[account.account_type];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-md", gradient)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs opacity-60">Balance</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{formatBalance(account.balance, account.currency)}</p>
        </div>
        <p className="text-xs font-bold tracking-widest opacity-80 mt-1">{brand}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-semibold opacity-60">{account.label}</p>
        <div className="flex items-center">
          <div className="h-5 w-5 rounded-full bg-white/30" />
          <div className="-ml-2.5 h-5 w-5 rounded-full bg-white/20" />
        </div>
      </div>
      <div className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full bg-white/5" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageWallets() {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: stats } = useDashboardStats(30);
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const [sendOpen, setSendOpen] = useState(false);

  function handleReceive() {
    const iban = accounts[0]?.iban;
    if (!iban) {
      toast.error("No IBAN available for this account.");
      return;
    }
    navigator.clipboard.writeText(iban).then(() => {
      toast.success("IBAN copied to clipboard", { description: iban });
    });
  }

  const currencies = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) {
      map.set(a.currency, (map.get(a.currency) ?? 0) + a.balance);
    }
    return Array.from(map.entries()).map(([code, balance]) => ({
      flag: CURRENCY_FLAGS[code] ?? "🏳️",
      code,
      balance,
    }));
  }, [accounts]);

  const [activeCard, setActiveCard] = useState(0);
  const [statMode, setStatMode] = useState<"in" | "out">("in");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(2025, 0, 10),
    to:   new Date(2025, 0, 16),
  });
  const [calOpen, setCalOpen] = useState(false);

  const barData = useMemo(
    () => dateRange.from && dateRange.to ? generateBarData(dateRange.from, dateRange.to) : [],
    [dateRange],
  );

  return (
    <div className="flex min-h-full gap-6 p-6">
      {sendOpen && <SendMoneyModal onClose={() => setSendOpen(false)} />}
      {/* Left column */}
      <div className="flex w-72 shrink-0 flex-col gap-5">
        {/* Total balance */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight">
                {accountsLoading ? <Skeleton className="h-8 w-36 inline-block" /> : formatBalance(totalBalance, "USD")}
              </p>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Card list */}
        <div>
          <p className="mb-2 text-sm font-semibold">Card Lists <span className="text-muted-foreground font-normal">{accounts.length}</span></p>
          <div className="flex flex-col gap-3">
            {accountsLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
              : !accounts.length
              ? <EmptyState icon={CreditCard} message="No cards yet" />
              : accounts.map((account, i) => (
                  <button key={account.unid} onClick={() => setActiveCard(i)} className="text-left">
                    <CardItem account={account} />
                  </button>
                ))
            }
          </div>
        </div>

        <Button variant="outline" className="w-full font-semibold">Manage Card</Button>
      </div>

      {/* Right column */}
      <div className="flex flex-1 flex-col gap-5 min-w-0">
        {/* Quick links */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Quick Links</p>
          </div>
          <div className="flex gap-2">
            {quickLinks.map(({ label, icon: Icon, href }) => {
              const cls = "flex flex-1 flex-col items-center gap-1.5 rounded-xl border bg-muted/30 p-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";
              const inner = (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                    <Icon className="h-4 w-4" />
                  </div>
                  {label}
                </>
              );
              const onClick =
                label === "Send" ? () => setSendOpen(true) :
                label === "Receive" ? handleReceive :
                undefined;
              return href ? (
                <Link key={label} to={href} className={cls}>{inner}</Link>
              ) : (
                <button key={label} className={cls} onClick={onClick}>{inner}</button>
              );
            })}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="mt-1 text-lg font-bold">
              {stats ? stats.tx_count.toString() : <Skeleton className="h-6 w-12 inline-block" />}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="mt-1 text-lg font-bold">
              {stats ? formatBalance(stats.total_spent, "USD") : <Skeleton className="h-6 w-20 inline-block" />}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Received</p>
            <p className="mt-1 text-lg font-bold">
              {stats ? formatBalance(stats.total_received, "USD") : <Skeleton className="h-6 w-20 inline-block" />}
            </p>
          </div>
        </div>

        {/* Statistics bar chart */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Statistics</h3>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border overflow-hidden text-xs">
                <button
                  onClick={() => setStatMode("in")}
                  className={cn("px-3 py-1.5 font-medium transition-colors", statMode === "in" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted")}
                >
                  Money In
                </button>
                <button
                  onClick={() => setStatMode("out")}
                  className={cn("px-3 py-1.5 font-medium transition-colors", statMode === "out" ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted")}
                >
                  Money Out
                </button>
              </div>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded px-2 py-1 hover:bg-muted transition-colors">
                    <CalendarIcon className="h-3 w-3" />
                    {formatRange(dateRange)}
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
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Bar dataKey={statMode === "in" ? "moneyIn" : "moneyOut"} fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Currency + Conversion */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-semibold text-sm">Currency</h3>
            <div className="space-y-3">
              {accountsLoading
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
                : !currencies.length
                ? <EmptyState icon={Coins} message="No currencies" />
                : currencies.map((c) => (
                    <div key={c.code} className="flex items-center gap-3">
                      <span className="text-xl">{c.flag}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{c.code}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatBalance(c.balance, c.code)}</p>
                    </div>
                  ))
              }
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-semibold text-sm">Conversion</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">USD –</span>
                <span className="font-semibold">$1,000.00</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">EUR –</span>
                <span className="font-semibold">875.05</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
