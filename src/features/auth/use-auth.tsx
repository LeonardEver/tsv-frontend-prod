/**
 * Auth bootstrap provider (frontend spec §6).
 *
 * Auth state is a DERIVED value of the /auth/me query — one source of
 * truth, never duplicated into a second store, never persisted. The
 * backend remains the only authentication authority.
 *
 * Statuses:
 *  - "loading"         — bootstrap in flight (RequireAuth renders skeleton)
 *  - "authenticated"   — session valid
 *  - "unauthenticated" — backend said 401
 *  - "error"           — server unreachable: retry screen, NOT a login
 *                        redirect (a failed /auth/me must never log out)
 */
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { ApiError, NetworkError } from "@/lib/api/errors";
import { clearServerCache } from "@/app/query-client";
import { fetchCurrentUser, logoutSession } from "./auth.api";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const activeClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchCurrentUser,
    staleTime: 30_000,
    gcTime: 0, // never keep the user object beyond memory (spec §6.1)
    retry: false, // bootstrap errors surface as "error", not retry loops
  });

  const logoutMutation = useMutation({
    mutationFn: logoutSession,
    onSettled: () => {
      // Session is gone server-side (or the request failed entirely) —
      // either way the client must drop all cached server state. Clear
      // the ACTIVE provider client — the app singleton in production,
      // the test-scoped client in tests.
      clearServerCache(activeClient);
    },
  });

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Even if the logout call fails (offline), the client session cache
      // is cleared onSettled; the server session expires on its own.
    }
  }, [logoutMutation]);

  const handleRefresh = useCallback((): void => {
    // Refetch by key via the active client (the query object itself
    // changes identity every render). The client instance is stable.
    void activeClient.refetchQueries({ queryKey: queryKeys.auth.me });
  }, [activeClient]);

  const value = useMemo<AuthContextValue>(() => {
    if (query.isPending) {
      return {
        status: "loading",
        user: null,
        error: null,
        refresh: handleRefresh,
        logout: handleLogout,
        isUnauthenticated: false,
      };
    }
    if (query.isError) {
      const is401 =
        query.error instanceof ApiError && query.error.status === 401;
      const clientError =
        query.error instanceof ApiError
          ? query.error
          : query.error instanceof Error
            ? new NetworkError(query.error.message)
            : new NetworkError("Authentication request failed");
      return {
        status: is401 ? "unauthenticated" : "error",
        user: null,
        error: is401 ? null : clientError,
        refresh: handleRefresh,
        logout: handleLogout,
        isUnauthenticated: is401,
      };
    }
    return {
      status: "authenticated",
      // TanStack Query narrows data to non-undefined here (pending and
      // error branches handled above).
      user: query.data,
      error: null,
      refresh: handleRefresh,
      logout: handleLogout,
      isUnauthenticated: false,
    };
  }, [query.isPending, query.isError, query.error, query.data, handleRefresh, handleLogout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
