import { useState } from "react";
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
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Mock data ────────────────────────────────────────────────────────────────

const cards = [
  { id: 1, balance: "$24,098.00", label: "Rust Finance.", type: "VISA", gradient: "from-blue-600 to-blue-700" },
  { id: 2, balance: "$33,000.00", label: "Rust Finance.", type: "VISA", gradient: "from-amber-400 to-amber-500" },
];

const statsRow = [
  { label: "Last 30 days",   value: "",       sub: "" },
  { label: "Transactions",   value: "56",     sub: "" },
  { label: "Total Spent",    value: "$10,654", sub: "" },
  { label: "Total Cashback", value: "$2,456",  sub: "" },
];

const barData = [
  { date: "Jan 10", moneyIn: 2100, moneyOut: 1400 },
  { date: "Jan 11", moneyIn: 3200, moneyOut: 2100 },
  { date: "Jan 12", moneyIn: 5052, moneyOut: 1800 },
  { date: "Jan 13", moneyIn: 2400, moneyOut: 3100 },
  { date: "Jan 14", moneyIn: 3800, moneyOut: 2200 },
  { date: "Jan 15", moneyIn: 4200, moneyOut: 2800 },
  { date: "Jan 16", moneyIn: 3100, moneyOut: 1900 },
];

const currencies = [
  { flag: "🇺🇸", code: "USD", balance: "56,476.00 USD" },
  { flag: "🇪🇺", code: "EUR", balance: "49,973.67 EUR" },
  { flag: "🇬🇧", code: "GBP", balance: "45,098.56 GBP" },
];

const quickLinks = [
  { label: "Deposit",   icon: ArrowDownToLine, href: null },
  { label: "Send",      icon: Send,            href: null },
  { label: "Receive",   icon: Download,        href: null },
  { label: "Invoicing", icon: FileText,        href: "/dashboard/invoices" },
  { label: "Checkout",  icon: ShoppingCart,    href: null },
];

// ─── Components ───────────────────────────────────────────────────────────────

function CardItem({ card }: { card: typeof cards[number] }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-md", card.gradient)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs opacity-60">Balance</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{card.balance}</p>
        </div>
        <p className="text-xs font-bold tracking-widest opacity-80 mt-1">{card.type}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-semibold opacity-60">{card.label}</p>
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
  const [activeCard, setActiveCard] = useState(0);
  const [statMode, setStatMode] = useState<"in" | "out">("in");

  return (
    <div className="flex min-h-full gap-6 p-6">
      {/* Left column */}
      <div className="flex w-72 shrink-0 flex-col gap-5">
        {/* Total balance */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight">$56,476.00
                <span className="ml-1 text-base font-normal text-muted-foreground">USD</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500">
                ↑ 2.05% <span className="text-muted-foreground">February 05, 2022</span>
              </p>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Card list */}
        <div>
          <p className="mb-2 text-sm font-semibold">Card Lists <span className="text-muted-foreground font-normal">{cards.length}</span></p>
          <div className="flex flex-col gap-3">
            {cards.map((card, i) => (
              <button key={card.id} onClick={() => setActiveCard(i)} className="text-left">
                <CardItem card={card} />
              </button>
            ))}
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
              return href ? (
                <Link key={label} to={href} className={cls}>{inner}</Link>
              ) : (
                <button key={label} className={cls}>{inner}</button>
              );
            })}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {statsRow.map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              {s.value && <p className="mt-1 text-lg font-bold">{s.value}</p>}
            </div>
          ))}
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
              <span className="text-xs text-muted-foreground border rounded px-2 py-1">This month ↓</span>
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
              {currencies.map((c) => (
                <div key={c.code} className="flex items-center gap-3">
                  <span className="text-xl">{c.flag}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c.code}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.balance}</p>
                </div>
              ))}
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
