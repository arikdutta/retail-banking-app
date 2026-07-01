import { useState, useId } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { report } from "@/lib/error-reporter";
import { BUG_TYPE } from "@/lib/bug-type";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  UserRound,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  useRecipients,
  useCreateRecipient,
  useDeleteRecipient,
} from "@/hooks/data/use-recipients";
import { SendMoneyModal, type SendMoneyPrefill } from "@/domain/dashboard/send-money-modal";
import type { Recipient } from "@/bindings/Recipient";

const routeApi = getRouteApi("/dashboard/recipients");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

// ─── Delete button with inline confirm  ────────────────────────────────────────

function DeleteButton({ recipient }: { recipient: Recipient }) {
  const [confirming, setConfirming] = useState(false);
  const { mutate, isPending } = useDeleteRecipient();

  function handleDelete() {
    mutate(recipient.unid, {
      onSuccess: () => {
        toast.success(`${recipient.name} removed.`);
        setConfirming(false);
      },
      onError: (err) => {
        toast.error(err.message);
        report({ bugType: BUG_TYPE.Server, message: err.message, ...(err.stack ? { stackTrace: err.stack } : {}) });
        setConfirming(false);
      },
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          disabled={isPending}
          onClick={handleDelete}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"
      title="Remove recipient"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  iban: string;
  email: string;
  notes: string;
};

const EMPTY_FORM: FormState = { name: "", iban: "", email: "", notes: "" };

const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";

function CreateRecipientModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { mutate, isPending } = useCreateRecipient();

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    mutate(
      {
        name:  form.name.trim(),
        iban:  form.iban.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Recipient added.");
          onClose();
        },
        onError: (err) => {
          toast.error(err.message);
          report({ bugType: BUG_TYPE.Server, message: err.message, ...(err.stack ? { stackTrace: err.stack } : {}) });
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle className="mb-4">Add Recipient</DialogTitle>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor={`${titleId}-name`} className={labelCls}>Name *</label>
            <input
              id={`${titleId}-name`}
              required
              className={inputCls}
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-iban`} className={labelCls}>IBAN</label>
            <input
              id={`${titleId}-iban`}
              className={inputCls}
              placeholder="GB29 NWBK 6016 1331 9268 19"
              value={form.iban}
              onChange={(e) => set("iban", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-email`} className={labelCls}>Email</label>
            <input
              id={`${titleId}-email`}
              type="email"
              className={inputCls}
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-notes`} className={labelCls}>Notes</label>
            <textarea
              id={`${titleId}-notes`}
              rows={2}
              className={cn(inputCls, "resize-none")}
              placeholder="Freelancer, monthly retainer…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
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
              Add Recipient
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageRecipients() {
  const { page }  = routeApi.useSearch();
  const navigate  = useNavigate({ from: "/dashboard/recipients" });
  const [search, setSearch]         = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [sendPrefill, setSendPrefill] = useState<SendMoneyPrefill | null>(null);

  const { data, isLoading, isFetching } = useRecipients(page);

  const recipients  = data?.data ?? [];
  const totalPages  = data?.total_pages ?? 1;

  const filtered = recipients.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.iban ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    navigate({ search: () => ({ page: p }) });
  }

  return (
    <>
      {showCreate && (
        <CreateRecipientModal onClose={() => setShowCreate(false)} />
      )}
      {sendPrefill !== null && (
        <SendMoneyModal
          prefill={sendPrefill}
          onClose={() => setSendPrefill(null)}
        />
      )}

      <div className="flex min-h-full flex-col p-6">
        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, IBAN or email…"
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
              Add Recipient
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  IBAN
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Added
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-16 text-center text-sm text-muted-foreground"
                      >
                        {search
                          ? "No recipients match your search."
                          : "No recipients yet. Add your first one!"}
                      </td>
                    </tr>
                  )
                : filtered.map((r) => (
                    <tr
                      key={r.unid}
                      className="border-b transition-colors hover:bg-muted/40 group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/40">
                            <UserRound className="h-3.5 w-3.5 text-violet-600" />
                          </div>
                          <span className="font-medium">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.iban ?? <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {r.email ?? <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-[180px]">
                        <span className="truncate block">
                          {r.notes ?? <span className="opacity-40">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSendPrefill({ recipientName: r.name, ...(r.iban ? { recipientIban: r.iban } : {}) });
                            }}
                            className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 text-muted-foreground hover:text-blue-600 transition-colors"
                            title="Send money"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          <DeleteButton recipient={r} />
                        </div>
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
                : `Page ${page} of ${totalPages} — ${data?.total ?? 0} recipients`}
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
                  ),
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
    </>
  );
}
