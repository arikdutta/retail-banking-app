import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateTransferRequest } from "@/bindings/CreateTransferRequest";
import type { PayInvoiceRequest } from "@/bindings/PayInvoiceRequest";
import type { Transaction } from "@/bindings/Transaction";
import { HttpError } from "@/lib/http-error";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

async function postTransfer(body: CreateTransferRequest): Promise<Transaction> {
  const r = await fetch(`${API_URL}/api/transfers`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new HttpError(r.status, (err as { error?: string }).error ?? `Transfer failed: ${r.status}`);
  }
  return r.json();
}

async function postPayInvoice(
  invoiceId: string,
  body: PayInvoiceRequest,
): Promise<{ paid: boolean; invoice_id: string }> {
  const r = await fetch(`${API_URL}/api/invoices/${invoiceId}/pay`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new HttpError(r.status, (err as { error?: string }).error ?? `Payment failed: ${r.status}`);
  }
  return r.json();
}

export function useTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function usePayInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PayInvoiceRequest) => postPayInvoice(invoiceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
