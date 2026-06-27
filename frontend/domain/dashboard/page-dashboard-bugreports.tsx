import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, AlertCircle, Trash2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { BugType } from "@/bindings/BugType";
import { queryKeys } from "@/lib/query-keys";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

type BugReport = {
  unid: string;
  bugtype: BugType;
  message: string | null;
  exceptionmessage: string | null;
  stacktrace: string | null;
  userlogin: string | null;
  url: string | null;
  useragent: string | null;
  application: string | null;
  created: string;
  similar_count: number;
  total_count: number;
};

type ApiResponse = {
  data: BugReport[];
  total: number;
  page: number;
  per_page: number;
};

const BUG_TYPE_VARIANT: Record<
  BugType,
  "default" | "secondary" | "outline" | "muted" | "destructive"
> = {
  Bug: "destructive",
  Server: "default",
  JsError: "destructive",
  PromiseRejection: "secondary",
  BrowserWarning: "muted",
  NetworkError: "secondary",
  NotFound: "muted",
  AuthError: "destructive",
  ApiError: "secondary",
  Payment: "secondary",
};

const ALL_BUG_TYPES: BugType[] = [
  "Bug",
  "Server",
  "JsError",
  "PromiseRejection",
  "BrowserWarning",
  "NetworkError",
  "Payment",
];

const PER_PAGE = 20;

async function fetchBugReports(
  page: number,
  search: string,
  bugType: BugType | "all",
): Promise<ApiResponse> {
  const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
  if (search) params.set("search", search);
  if (bugType !== "all") params.set("bug_type", bugType);
  const r = await fetch(`${API_URL}/api/bugreports?${params}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export default function PageDashboardBugReports() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [bugType, setBugType] = useState<BugType | "all">("all");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const qc = useQueryClient();
  const {
    data: response,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.bugreports.list(page, search, bugType),
    queryFn: () => fetchBugReports(page, search, bugType),
  });

  const data = response?.data ?? null;
  const total = response?.total ?? 0;

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };
  const handleType = (val: string) => {
    setBugType(val as BugType | "all");
    setPage(1);
  };

  const deleteAll = async () => {
    if (!confirm("Delete ALL bug reports? Cannot be undone.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const r = await fetch(`${API_URL}/api/bugreports`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`${r.status}`);
      qc.invalidateQueries({ queryKey: queryKeys.bugreports.all() });
      setPage(1);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Bug className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Bug Reports</h1>
        {data && <span className="text-sm text-muted-foreground">({total} total)</span>}
        <div className="ml-auto">
          <Button
            variant="destructive"
            size="sm"
            onClick={deleteAll}
            disabled={deleting || !data || data.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete all
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={bugType} onValueChange={handleType}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ALL_BUG_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(isError || deleteError) && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {deleteError ?? error?.message}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data === null && !error ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading…
            </div>
          ) : data && data.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No bug reports.
            </div>
          ) : data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 text-muted-foreground font-medium text-xs">
                    Type
                  </TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium text-xs">
                    Message
                  </TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium text-xs">
                    User
                  </TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium text-xs text-center">
                    Similar
                  </TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium text-xs">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <>
                    <TableRow
                      key={r.unid}
                      className="cursor-pointer"
                      onClick={() => setExpanded(expanded === r.unid ? null : r.unid)}
                    >
                      <TableCell className="px-4">
                        <Badge
                          variant={BUG_TYPE_VARIANT[r.bugtype] ?? "outline"}
                          className="text-xs"
                        >
                          {r.bugtype}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 max-w-xs">
                        <span className="truncate block font-mono text-xs">
                          {r.message ?? r.exceptionmessage ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground text-xs">
                        {r.userlogin ?? "anon"}
                      </TableCell>
                      <TableCell className="px-4 text-center">
                        {r.similar_count > 1 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            ×{r.similar_count}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(r.created).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                    {expanded === r.unid && (
                      <TableRow
                        key={`${r.unid}-detail`}
                        className="bg-muted/20 hover:bg-muted/20"
                      >
                        <TableCell colSpan={5} className="px-4 py-3 space-y-2">
                          {r.exceptionmessage && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                Exception:{" "}
                              </span>
                              <span className="text-xs font-mono">
                                {r.exceptionmessage}
                              </span>
                            </div>
                          )}
                          {r.stacktrace && (
                            <pre className="text-xs font-mono bg-background border border-border rounded p-2 overflow-x-auto max-h-48 text-muted-foreground whitespace-pre-wrap">
                              {r.stacktrace}
                            </pre>
                          )}
                          {r.url && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                URL:{" "}
                              </span>
                              <span className="text-xs font-mono break-all">{r.url}</span>
                            </div>
                          )}
                          {r.useragent && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                UA:{" "}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {r.useragent}
                              </span>
                            </div>
                          )}
                          {r.application && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                App:{" "}
                              </span>
                              <span className="text-xs">{r.application}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-4 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
