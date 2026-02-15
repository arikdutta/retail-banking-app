import { useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Search, Filter, Upload, X, ChevronLeft, ChevronRight,
  FileDown, Loader2, Mail,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { DateRangePicker, dateRangeSchema } from "@/components/date-range-picker";
import { cn } from "@/lib/utils";
import { useTransactions } from "@/hooks/data/use-transactions";
import type { Transaction } from "@/bindings/Transaction";
import type { TransactionStatus } from "../../../backend/bindings/TransactionStatus";
import type { TransactionType } from "../../../backend/bindings/TransactionType";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";
const routeApi = getRouteApi("/dashboard/transactions");

// ─── Styles ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<TransactionStatus, string> = {
  completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
  pending:   "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
  failed:    "bg-red-50 text-red-500 dark:bg-red-950/30",
};

const TYPE_COLOR: Record<TransactionType, string> = {
  credit:       "bg-emerald-500",
  debit:        "bg-red-400",
  transfer_in:  "bg-blue-400",
  transfer_out: "bg-blue-600",
  fee:          "bg-gray-400",
  interest:     "bg-indigo-500",
  refund:       "bg-orange-400",
};

const TYPE_ICON: Record<TransactionType, string> = {
  credit:       "↑",
  debit:        "↓",
  transfer_in:  "→",
  transfer_out: "←",
  fee:          "F",
  interest:     "%",
  refund:       "R",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatAmount(amount: number, currency: string) {
  const prefix = amount >= 0 ? "+" : "";
  return `${prefix}${amount.toFixed(2)} ${currency}`;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function downloadPdf(from: string, to: string, setDownloading: (v: boolean) => void) {
  setDownloading(true);
  try {
    const res = await fetch(`${API_URL}/api/transactions/pdf?from=${from}&to=${to}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`PDF generation failed: ${res.status}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `transactions-${from}-to-${to}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
  } finally {
    setDownloading(false);
  }
}

async function emailPdf(
  from: string,
  to: string,
  setEmailing: (v: boolean) => void,
) {
  setEmailing(true);
  try {
    const res = await fetch(`${API_URL}/api/transactions/email-statement?from=${from}&to=${to}`, {
      method: "POST",
      credentials: "include",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `Email sending failed: ${res.status}`);
    toast.success(`Statement sent to ${body.email}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email sending failed";
    console.error(err);
    toast.error(message);
  } finally {
    setEmailing(false);
  }
}

// ─── Pagination helper ────────────────────────────────────────────────────────

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 1;
  const left  = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const pages: (number | "…")[] = [1];
  if (left > 2) pages.push("…");
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  tx,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  tx: Transaction;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const color = TYPE_COLOR[tx.transaction_type];
  const icon  = TYPE_ICON[tx.transaction_type];

  return (
    <div className="w-72 shrink-0 border-l bg-card flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} disabled={!hasPrev} className="p-1 rounded hover:bg-muted disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">Transaction Detail</span>
          <button onClick={onNext} disabled={!hasNext} className="p-1 rounded hover:bg-muted disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col items-center p-6 border-b gap-2">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white", color)}>
          {icon}
        </div>
        <p className={cn("text-2xl font-bold", tx.amount >= 0 ? "text-emerald-500" : "")}>
          {formatAmount(tx.amount, tx.currency)}
        </p>
        <Badge variant="outline" className={cn("text-[10px] px-2 border-0", STATUS_STYLES[tx.status])}>
          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
        </Badge>
      </div>

      <div className="p-4 space-y-3 text-sm overflow-y-auto flex-1">
        {[
          ["Type",        tx.transaction_type.replace(/_/g, " ")],
          ["Description", tx.description],
          ["Category",    tx.category],
          ["Date",        `${formatDate(tx.created_at)} ${formatTime(tx.created_at)}`],
          ...(tx.counterparty_name ? [["Counterparty", tx.counterparty_name]] : []),
          ...(tx.counterparty_iban ? [["IBAN",         tx.counterparty_iban]] : []),
          ...(tx.reference         ? [["Reference",    tx.reference]]         : []),
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="font-medium text-right text-xs break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageTransactions() {
  const { page }   = routeApi.useSearch();
  const navigate   = useNavigate({ from: "/dashboard/transactions" });
  const [selected, setSelected]   = useState<Transaction | null>(null);
  const [search, setSearch]       = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateError, setDateError] = useState<string | undefined>(undefined);
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const { data, isLoading, isFetching } = useTransactions(page);

  const transactions = data?.data ?? [];
  const totalPages   = data?.total_pages ?? 1;

  const filtered = transactions.filter((t) =>
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    (t.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.counterparty_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const selectedIdx = selected ? filtered.findIndex((t) => t.unid === selected.unid) : -1;

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    setSelected(null);
    navigate({ search: () => ({ page: p }) });
  }

  const parsedRange = dateRangeSchema.safeParse(dateRange);
  const canExport = parsedRange.success && !downloading && !emailing;

  function handlePdf() {
    if (!parsedRange.success) {
      const issue = parsedRange.error.issues[0];
      setDateError(issue?.message ?? "Invalid date range");
      return;
    }
    setDateError(undefined);
    const from = format(parsedRange.data.from, "yyyy-MM-dd");
    const to   = format(parsedRange.data.to,   "yyyy-MM-dd");
    downloadPdf(from, to, setDownloading);
  }

  function handleEmailPdf() {
    if (!parsedRange.success) {
      const issue = parsedRange.error.issues[0];
      setDateError(issue?.message ?? "Invalid date range");
      return;
    }
    setDateError(undefined);
    const from = format(parsedRange.data.from, "yyyy-MM-dd");
    const to   = format(parsedRange.data.to, "yyyy-MM-dd");
    emailPdf(from, to, setEmailing);
  }

  return (
    <div className="flex min-h-full gap-0">
      {/* Table section */}
      <div className="flex flex-1 flex-col min-w-0 p-6">
        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, reference…"
              className="w-full rounded-lg border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Export
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <DateRangePicker
              value={dateRange}
              onChange={(r) => { setDateRange(r); setDateError(undefined); }}
              error={dateError}
              placeholder="Statement period"
            />
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={!canExport}
              onClick={handlePdf}
            >
              {downloading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />}
              Download PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
              disabled={!canExport}
              onClick={handleEmailPdf}
            >
              {emailing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Mail className="h-3.5 w-3.5" />}
              Email PDF
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Counterparty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                : filtered.map((tx) => {
                    const color = TYPE_COLOR[tx.transaction_type];
                    const icon  = TYPE_ICON[tx.transaction_type];
                    return (
                      <tr
                        key={tx.unid}
                        onClick={() => setSelected(tx)}
                        className={cn(
                          "border-b cursor-pointer transition-colors hover:bg-muted/40",
                          selected?.unid === tx.unid && "bg-blue-50/60 dark:bg-blue-950/20",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", color)}>
                              {icon}
                            </div>
                            <div>
                              <p className="font-medium">{tx.description}</p>
                              <p className="text-xs text-muted-foreground capitalize">{tx.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {tx.counterparty_name ?? <span className="text-xs opacity-40">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{formatDate(tx.created_at)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(tx.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={cn("font-semibold tabular-nums", tx.amount >= 0 ? "text-emerald-500" : "")}>
                            {formatAmount(tx.amount, tx.currency)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0 border-0 h-4", STATUS_STYLES[tx.status])}
                          >
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {isFetching && !isLoading ? "Loading…" : `Page ${page} of ${totalPages} — ${data?.total ?? 0} transactions`}
            </p>
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); goToPage(page - 1); }}
                    className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>

                {pageRange(page, totalPages).map((p, i) =>
                  p === "…" ? (
                    <PaginationItem key={`ell-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <Button
                        variant={p === page ? "outline" : "ghost"}
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => goToPage(p)}
                      >
                        {p}
                      </Button>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); goToPage(page + 1); }}
                    className={page >= totalPages ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          tx={selected}
          onClose={() => setSelected(null)}
          onPrev={() => {
            if (selectedIdx > 0) setSelected(filtered[selectedIdx - 1]!);
          }}
          onNext={() => {
            if (selectedIdx < filtered.length - 1) setSelected(filtered[selectedIdx + 1]!);
          }}
          hasPrev={selectedIdx > 0}
          hasNext={selectedIdx < filtered.length - 1}
        />
      )}
    </div>
  );
}
