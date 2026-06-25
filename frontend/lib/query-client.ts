import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { report } from "@/lib/error-reporter";
import { BUG_TYPE } from "@/lib/bug-type";
import { HttpError } from "@/lib/http-error";
import type { BugType } from "@/bindings/BugType";

export function bugTypeFromError(error: Error): BugType {
  if (error instanceof HttpError) {
    if (error.status === 404) return BUG_TYPE.NotFound;
    if (error.status === 401 || error.status === 403) return BUG_TYPE.AuthError;
    return BUG_TYPE.ApiError;
  }
  return BUG_TYPE.NetworkError;
}

function onQueryError(error: Error, context?: string) {
  report({
    bugType: bugTypeFromError(error),
    message: error.message,
    ...(error.stack ? { stackTrace: error.stack } : {}),
    ...(context ? { exceptionMessage: context } : {}),
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, refetchOnWindowFocus: "always" },
  },
  queryCache: new QueryCache({
    onError: (error, query) => onQueryError(error, String(query.queryKey[0] ?? "")),
  }),
  mutationCache: new MutationCache({
    onError: (error) => onQueryError(error),
  }),
});
