import { useState } from "react";
import { Search, Filter, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Mock data ────────────────────────────────────────────────────────────────

type Status = "success" | "pending" | "failed";

type Transaction = {
  id: number;
  name: string;
  sub: string;
  date: string;
  time: string;
  invoiceId: string;
  amount: number;
  status: Status;
  color: string;
  initials: string;
};

const transactions: Transaction[] = [
  { id: 1,  name: "Stripe",        sub: "Withdraw",    date: "Jan 29, 2022", time: "at 09:00 AM", invoiceId: "PMX09812", amount: +300.00,   status: "pending", color: "bg-purple-500", initials: "S" },
  { id: 2,  name: "Bitcoin transaction", sub: "Deposit", date: "Jan 25, 2022", time: "at 09:15 AM", invoiceId: "PMX0979",  amount: -890.15,  status: "success", color: "bg-orange-500", initials: "₿" },
  { id: 3,  name: "Facebook charge", sub: "Advertising", date: "Jan 25, 2022", time: "at 09:45 AM", invoiceId: "OVF19244", amount: -600.00, status: "success", color: "bg-blue-600",   initials: "f" },
  { id: 4,  name: "Upwork",         sub: "Business",   date: "Jan 23, 2022", time: "at 09:00 PM", invoiceId: "AMX09871", amount: +1243.00,  status: "pending", color: "bg-green-500", initials: "U" },
  { id: 5,  name: "Send to Antonio", sub: "Transfer",  date: "Jan 15, 2022", time: "at 10:15 AM", invoiceId: "PMX09873", amount: -123.00,  status: "failed",  color: "bg-blue-400",  initials: "A" },
  { id: 6,  name: "UI8.net",        sub: "Payment",    date: "Jan 15, 2022", time: "at 09:00 AM", invoiceId: "AMX89786", amount: -190.00,  status: "success", color: "bg-indigo-500", initials: "U" },
  { id: 7,  name: "Bank of America", sub: "Withdraw",  date: "Jan 15, 2022", time: "at 07:00 AM", invoiceId: "AMX89785", amount: -1565.99, status: "success", color: "bg-red-500",    initials: "B" },
  { id: 8,  name: "UI8.net",        sub: "Payment",    date: "Jan 11, 2022", time: "at 05:00 AM", invoiceId: "AMX76543", amount: -10.00,   status: "success", color: "bg-indigo-500", initials: "U" },
];

const detailBarData = [
  { m: "Aug", v: 400 },
  { m: "Sep", v: 600 },
  { m: "Oct", v: 300 },
  { m: "Nov", v: 1250 },
  { m: "Dec", v: 500 },
  { m: "Jan", v: 750 },
];

const STATUS_STYLES: Record<Status, string> = {
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
  pending: "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
  failed:  "bg-red-50 text-red-500 dark:bg-red-950/30",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageTransactions() {
  const [selected, setSelected] = useState<Transaction | null>(transactions[5]!);
  const [search, setSearch] = useState("");

  const filtered = transactions.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.invoiceId.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedIdx = selected ? transactions.findIndex((t) => t.id === selected.id) : -1;

  function prev() {
    if (selectedIdx > 0) setSelected(transactions[selectedIdx - 1]!);
  }
  function next() {
    if (selectedIdx < transactions.length - 1) setSelected(transactions[selectedIdx + 1]!);
  }

  return (
    <div className="flex min-h-full gap-0">
      {/* Table section */}
      <div className="flex flex-1 flex-col min-w-0 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for transactions…"
              className="w-full rounded-lg border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Exports
          </Button>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name/Business ↕</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date ↕</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Invoice ID ↕</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelected(tx)}
                  className={cn(
                    "border-b cursor-pointer transition-colors hover:bg-muted/40",
                    selected?.id === tx.id && "bg-blue-50/60 dark:bg-blue-950/20",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", tx.color)}>
                        {tx.initials}
                      </div>
                      <div>
                        <p className="font-medium">{tx.name}</p>
                        <p className="text-xs text-muted-foreground">{tx.sub}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{tx.date}</p>
                    <p className="text-xs text-muted-foreground">{tx.time}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{tx.invoiceId}</td>
                  <td className="px-4 py-3 text-right">
                    <p className={cn("font-semibold", tx.amount > 0 ? "text-emerald-500" : "")}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn("mt-0.5 text-[10px] px-1.5 py-0 border-0 h-4", STATUS_STYLES[tx.status])}
                    >
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment detail panel */}
      {selected && (
        <div className="w-72 shrink-0 border-l bg-card flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <button onClick={prev} disabled={selectedIdx <= 0} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">Payment Detail</span>
              <button onClick={next} disabled={selectedIdx >= transactions.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col items-center p-6 border-b gap-2">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white", selected.color)}>
              {selected.initials}
            </div>
            <p className={cn("text-2xl font-bold", selected.amount > 0 ? "text-emerald-500" : "")}>
              {selected.amount > 0 ? "+" : ""}{selected.amount.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{selected.sub}</p>
          </div>

          <div className="p-4 space-y-3 text-sm border-b">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border flex items-center justify-center text-[10px]">R</span>
                Recipient
              </span>
              <span className="font-medium">{selected.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border flex items-center justify-center text-[10px]">D</span>
                Date
              </span>
              <span className="font-medium">{selected.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border flex items-center justify-center text-[10px]">F</span>
                Transaction fee
              </span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border flex items-center justify-center text-[10px]">I</span>
                Invoice
              </span>
              <span className="font-mono text-xs font-medium">{selected.invoiceId}</span>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <button className="text-muted-foreground hover:text-foreground">
                <span className="text-lg">⋯</span>
              </button>
            </div>
            <p className="text-xl font-bold mb-3">$1,250.00</p>
            <ResponsiveContainer width="100%" height={70}>
              <BarChart data={detailBarData} barSize={10} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Bar
                  dataKey="v"
                  radius={[3, 3, 0, 0]}
                  fill="#BFDBFE"
                  label={false}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              {detailBarData.map((d) => (
                <span key={d.m}>{d.m}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
