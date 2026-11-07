/**
 * TanStack Query v5 configuration (frontend spec §9/§10).
 *
 * - Global defaults only; per-resource staleness overrides live at the
 *   useQuery call sites once features land.
 * - NO persister: the query cache is memory-only. Persisting it would
 *   leak one user's server data to the next user of a shared device.
 * - window-focus refetch is OFF globally; user-state queries opt in
 *   explicitly where the spec requires it (progress/gamification).
 */
import { QueryClient } from "@tanstack/react-query";
import { NetworkError, RETRYABLE_STATUSES } from "@/lib/api/errors";

function isRetryableError(err: unknown): boolean {
  if (err instanceof NetworkError) return true;
  if (typeof err === "object" && err !== null && "status" in err) {
    return RETRYABLE_STATUSES.has((err as { status: number }).status);
  }
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: (failureCount, error) =>
        isRetryableError(error) && failureCount < 2,
      // Auth bootstrap must never be served from a stale cache after logout.
    },
    mutations: {
      retry: false,
    },
  },
});

/** Erase all cached server state (logout / 401 handling). Callers pass
 * the ACTIVE provider client — the app singleton in production, the
 * test-scoped client in tests. */
export function clearServerCache(client: QueryClient = queryClient): void {
  client.clear();
}
