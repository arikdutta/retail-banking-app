import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Invoice } from "@/bindings/Invoice";
import type { CreateInvoiceRequest } from "@/bindings/CreateInvoiceRequest";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

export type InvoicesPage = {
  data: Invoice[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

async function fetchInvoices(page: number): Promise<InvoicesPage> {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });
  const r = await fetch(`${API_URL}/api/invoices?${params}`, { credentials: "include" });
  if (!r.ok) throw new Error(`Failed to fetch invoices: ${r.status}`);
  return r.json();
}

async function createInvoice(body: CreateInvoiceRequest): Promise<Invoice> {
  const r = await fetch(`${API_URL}/api/invoices`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Failed to create invoice: ${r.status}`);
  }
  return r.json();
}

async function updateInvoiceStatus(id: string, status: string): Promise<Invoice> {
  const r = await fetch(`${API_URL}/api/invoices/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Failed to update status: ${r.status}`);
  }
  return r.json();
}

export function useInvoices(page: number) {
  return useQuery<InvoicesPage>({
    queryKey: queryKeys.invoices.list(page),
    queryFn: () => fetchInvoices(page),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
