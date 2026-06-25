import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { UpdateProfileRequest } from "@/bindings/UpdateProfileRequest";
import type { UserProfile } from "@/bindings/UserProfile";
import { HttpError } from "@/lib/http-error";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

async function fetchProfile(): Promise<UserProfile> {
  const r = await fetch(`${API_URL}/api/profile`, { credentials: "include" });
  if (!r.ok) throw new HttpError(r.status, `Failed to fetch profile: ${r.status}`);
  return r.json();
}

async function putProfile(body: UpdateProfileRequest): Promise<UserProfile> {
  const r = await fetch(`${API_URL}/api/profile`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new HttpError(r.status, `Failed to update profile: ${r.status}`);
  return r.json();
}

export function useProfile() {
  return useQuery<UserProfile>({
    queryKey: queryKeys.profile(),
    queryFn: fetchProfile,
    staleTime: 1000 * 60,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<UserProfile, Error, UpdateProfileRequest>({
    mutationFn: putProfile,
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.profile(), data);
    },
  });
}
