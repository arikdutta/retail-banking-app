import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateDepositRequest } from "@/bindings/CreateDepositRequest";
import type { Transaction } from "@/bindings/Transaction";
import { HttpError } from "@/lib/http-error";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

async function postDeposit(body: CreateDepositRequest): Promise<Transaction> {
  const r = await fetch(`${API_URL}/api/deposits`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new HttpError(r.status, (err as { error?: string }).error ?? `Deposit failed: ${r.status}`);
  }
  return r.json();
}

export function useDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
