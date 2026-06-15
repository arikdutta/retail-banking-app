import { useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  FileText,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoiceStatus,
} from "@/hooks/data/use-invoices";
import type { Invoice } from "@/bindings/Invoice";
import type { InvoiceStatus } from "../../../backend/bindings/InvoiceStatus";

const routeApi = getRouteApi("/dashboard/invoices");

// ─── Styles ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     "bg-gray-50 text-gray-600 dark:bg-gray-950/30",
  sent:      "bg-blue-50 text-blue-600 dark:bg-blue-950/30",
  paid:      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
  overdue:   "bg-red-50 text-red-600 dark:bg-red-950/30",
  cancelled: "bg-slate-50 text-slate-500 dark:bg-slate-950/30",
};

const STATUS_NEXT: Record<InvoiceStatus, InvoiceStatus | null> = {
  draft:     "sent",
  sent:      "paid",
  paid:      null,
  overdue:   "paid",
  cancelled: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

// ─── Download ─────────────────────────────────────────────────────────────────

function downloadInvoice(invoice: Invoice) {
  const fmt = (n: number, c: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: c, minimumFractionDigits: 2 }).format(n);
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${invoice.invoice_number}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;color:#111;background:#fff;padding:48px 56px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
  .logo{font-size:22px;font-weight:700;letter-spacing:-.5px}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;background:#dbeafe;color:#1d4ed8}
  .inv-num{font-size:13px;color:#6b7280;margin-top:6px}
  h1{font-size:28px;font-weight:700;margin-bottom:24px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:36px}
  .field label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:4px;display:block}
  .field p{font-size:14px;color:#111}
  .divider{border:none;border-top:1px solid #e5e7eb;margin:32px 0}
  .amount-row{display:flex;justify-content:flex-end;align-items:center;gap:24px}
  .amount-label{font-size:13px;color:#6b7280}
  .amount-value{font-size:28px;font-weight:700}
  .notes{margin-top:32px;padding:16px;background:#f9fafb;border-radius:8px}
  .notes label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:6px;display:block}
  .notes p{font-size:13px;color:#374151;line-height:1.6}
  .footer{margin-top:48px;font-size:11px;color:#9ca3af;text-align:center}
  @media print{body{padding:32px 40px}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">RetailBank</div>
    <div class="inv-num">${invoice.invoice_number}</div>
  </div>
  <span class="badge">${invoice.status}</span>
</div>

<h1>Invoice</h1>

<div class="grid">
  <div class="field">
    <label>Bill To</label>
    <p><strong>${invoice.recipient_name}</strong></p>
    ${invoice.recipient_email ? `<p style="color:#6b7280;font-size:13px">${invoice.recipient_email}</p>` : ""}
    ${invoice.recipient_iban  ? `<p style="color:#6b7280;font-size:13px;font-family:monospace">${invoice.recipient_iban}</p>` : ""}
  </div>
  <div>
    <div class="field" style="margin-bottom:12px">
      <label>Issue Date</label>
      <p>${fmtDate(invoice.created_at)}</p>
    </div>
    ${invoice.due_date ? `<div class="field"><label>Due Date</label><p>${fmtDate(invoice.due_date)}</p></div>` : ""}
  </div>
</div>

${invoice.description ? `<div class="field" style="margin-bottom:24px"><label>Description</label><p>${invoice.description}</p></div>` : ""}

<hr class="divider"/>

<div class="amount-row">
  <span class="amount-label">Total Amount</span>
  <span class="amount-value">${fmt(Number(invoice.amount), invoice.currency)}</span>
</div>

${invoice.notes ? `<div class="notes"><label>Notes</label><p>${invoice.notes}</p></div>` : ""}

<div class="footer">Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) win.onload = () => { win.focus(); win.print(); };
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  invoice,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  invoice: Invoice;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const { mutate: updateStatus, isPending } = useUpdateInvoiceStatus();
  const nextStatus = STATUS_NEXT[invoice.status];

  function handleAdvance() {
    if (!nextStatus) return;
    updateStatus(
      { id: invoice.unid, status: nextStatus },
      {
        onSuccess: () => toast.success(`Invoice marked as ${nextStatus}`),
        onError:   (e) => toast.error(e.message),
      },
    );
  }

  const rows: [string, string | null | undefined][] = [
    ["Invoice #",    invoice.invoice_number],
    ["Recipient",    invoice.recipient_name],
    ["Email",        invoice.recipient_email],
    ["IBAN",         invoice.recipient_iban],
    ["Description",  invoice.description],
    ["Amount",       formatAmount(Number(invoice.amount), invoice.currency)],
    ["Currency",     invoice.currency],
    ["Due",          invoice.due_date ? formatDate(invoice.due_date) : undefined],
    ["Created",      formatDate(invoice.created_at)],
    ["Notes",        invoice.notes],
  ];

  return (
    <div className="w-72 shrink-0 border-l bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="p-1 rounded hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">Invoice Detail</span>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-1 rounded hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => downloadInvoice(invoice)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Amount hero */}
      <div className="flex flex-col items-center p-6 border-b gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <p className="text-2xl font-bold tabular-nums">
          {formatAmount(Number(invoice.amount), invoice.currency)}
        </p>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-2 border-0",
            STATUS_STYLES[invoice.status],
          )}
        >
          {capitalize(invoice.status)}
        </Badge>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-3 text-sm overflow-y-auto flex-1">
        {rows
          .filter(([, v]) => v != null && v !== "")
          .map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="font-medium text-right text-xs break-all">
                {value}
              </span>
            </div>
          ))}
      </div>

      {/* Status advance */}
      {nextStatus && (
        <div className="p-4 border-t">
          <Button
            size="sm"
            className="w-full"
            disabled={isPending}
            onClick={handleAdvance}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Mark as {capitalize(nextStatus)}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

type FormState = {
  recipient_name: string;
  recipient_email: string;
  recipient_iban: string;
  description: string;
  amount: string;
  currency: string;
  due_date: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  recipient_name: "",
  recipient_email: "",
  recipient_iban: "",
  description: "",
  amount: "",
  currency: "USD",
  due_date: "",
  notes: "",
};

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { mutate, isPending } = useCreateInvoice();

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = Number.parseFloat(form.amount);
    if (!form.recipient_name.trim() || Number.isNaN(amount) || amount <= 0) {
      toast.error("Recipient name and a valid amount are required.");
      return;
    }

    mutate(
      {
        recipient_name:  form.recipient_name.trim(),
        recipient_email: form.recipient_email.trim() || null,
        recipient_iban:  form.recipient_iban.trim()  || null,
        description:     form.description.trim()     || null,
        amount,
        currency:        form.currency,
        due_date:        form.due_date ? new Date(form.due_date).toISOString() : null,
        notes:           form.notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Invoice created");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const inputCls =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-muted-foreground";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">New Invoice</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Recipient name *</label>
              <input
                required
                className={inputCls}
                placeholder="Jane Doe"
                value={form.recipient_name}
                onChange={(e) => set("recipient_name", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                placeholder="jane@example.com"
                value={form.recipient_email}
                onChange={(e) => set("recipient_email", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>IBAN</label>
              <input
                className={inputCls}
                placeholder="GB29 NWBK …"
                value={form.recipient_iban}
                onChange={(e) => set("recipient_iban", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Amount *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className={inputCls}
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Currency</label>
              <select
                className={inputCls}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                {["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <input
                className={inputCls}
                placeholder="Web design services"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Due date</label>
              <input
                type="date"
                className={inputCls}
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                rows={2}
                className={cn(inputCls, "resize-none")}
                placeholder="Payment terms, bank details…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageInvoices() {
  const { page }   = routeApi.useSearch();
  const navigate   = useNavigate({ from: "/dashboard/invoices" });
  const [selected, setSelected]       = useState<Invoice | null>(null);
  const [search, setSearch]           = useState("");
  const [showCreate, setShowCreate]   = useState(false);

  const { data, isLoading, isFetching } = useInvoices(page);

  const invoices   = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  const filtered = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      (inv.description ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const selectedIdx = selected
    ? filtered.findIndex((inv) => inv.unid === selected.unid)
    : -1;

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    setSelected(null);
    navigate({ search: () => ({ page: p }) });
  }

  return (
    <>
      {showCreate && (
        <CreateInvoiceModal onClose={() => setShowCreate(false)} />
      )}

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
                placeholder="Search invoice # or recipient…"
                className="w-full rounded-lg border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="ml-auto">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Invoice
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Recipient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Due
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Skeleton className="h-4 w-16 ml-auto" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center text-sm text-muted-foreground"
                        >
                          {search ? "No invoices match your search." : "No invoices yet. Create your first one!"}
                        </td>
                      </tr>
                    )
                  : filtered.map((inv) => (
                      <tr
                        key={inv.unid}
                        onClick={() => setSelected(inv)}
                        className={cn(
                          "border-b cursor-pointer transition-colors hover:bg-muted/40",
                          selected?.unid === inv.unid &&
                            "bg-blue-50/60 dark:bg-blue-950/20",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40">
                              <FileText className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium font-mono text-xs">
                                {inv.invoice_number}
                              </p>
                              {inv.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                                  {inv.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{inv.recipient_name}</p>
                          {inv.recipient_email && (
                            <p className="text-xs text-muted-foreground">
                              {inv.recipient_email}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {inv.due_date ? (
                            formatDate(inv.due_date)
                          ) : (
                            <span className="opacity-40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold tabular-nums">
                            {formatAmount(Number(inv.amount), inv.currency)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 border-0 h-4",
                              STATUS_STYLES[inv.status],
                            )}
                          >
                            {capitalize(inv.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isFetching && !isLoading
                  ? "Loading…"
                  : `Page ${page} of ${totalPages} — ${data?.total ?? 0} invoices`}
              </p>
              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(page - 1);
                      }}
                      className={
                        page <= 1 ? "pointer-events-none opacity-40" : ""
                      }
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
                    ),
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(page + 1);
                      }}
                      className={
                        page >= totalPages ? "pointer-events-none opacity-40" : ""
                      }
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
            invoice={selected}
            onClose={() => setSelected(null)}
            onPrev={() => {
              if (selectedIdx > 0) setSelected(filtered[selectedIdx - 1]!);
            }}
            onNext={() => {
              if (selectedIdx < filtered.length - 1)
                setSelected(filtered[selectedIdx + 1]!);
            }}
            hasPrev={selectedIdx > 0}
            hasNext={selectedIdx < filtered.length - 1}
          />
        )}
      </div>
    </>
  );
}
