import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { report } from "@/lib/error-reporter";
import { BUG_TYPE } from "@/lib/bug-type";

function onQueryError(error: Error, context?: string) {
  report({
    bugType: BUG_TYPE.NetworkError,
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
