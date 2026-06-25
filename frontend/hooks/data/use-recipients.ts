import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Recipient } from "@/bindings/Recipient";
import type { CreateRecipientRequest } from "@/bindings/CreateRecipientRequest";
import { HttpError } from "@/lib/http-error";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

export type RecipientsPage = {
  data: Recipient[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

async function fetchRecipients(page: number): Promise<RecipientsPage> {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });
  const r = await fetch(`${API_URL}/api/recipients?${params}`, { credentials: "include" });
  if (!r.ok) throw new HttpError(r.status, `Failed to fetch recipients: ${r.status}`);
  return r.json();
}

async function createRecipient(body: CreateRecipientRequest): Promise<Recipient> {
  const r = await fetch(`${API_URL}/api/recipients`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new HttpError(r.status, (err as { error?: string }).error ?? `Failed to create recipient: ${r.status}`);
  }
  return r.json();
}

async function deleteRecipient(id: string): Promise<void> {
  const r = await fetch(`${API_URL}/api/recipients/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok && r.status !== 204) {
    const err = await r.json().catch(() => ({}));
    throw new HttpError(r.status, (err as { error?: string }).error ?? `Failed to delete recipient: ${r.status}`);
  }
}

export function useRecipients(page: number) {
  return useQuery<RecipientsPage>({
    queryKey: queryKeys.recipients.list(page),
    queryFn: () => fetchRecipients(page),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useCreateRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
    },
  });
}

export function useDeleteRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecipient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
    },
  });
}
