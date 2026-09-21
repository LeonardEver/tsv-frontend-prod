/**
 * Admin capability probe.
 *
 * `/auth/me` deliberately carries no `role` — the backend treats
 * authorization as internal state that is never user-facing surface data
 * (`backend/src/modules/auth/routes.ts`: "internal authorization concepts
 * are never user-facing surface data"). So the frontend cannot compute
 * admin-ness locally, and there is no `RequireAdmin` to write against a
 * user object.
 *
 * Instead we ask the API surface itself: one request to the cheapest
 * `/admin/analytics/*` endpoint. 200 ⇒ admin, 401/403 ⇒ not.
 *
 * Failure policy is **fail closed**: anything we cannot positively
 * confirm (network failure, 5xx, still loading) hides the navigation
 * entry and shows the "could not confirm" state. A missing nav item is a
 * cosmetic problem; a nav item that leads to a broken page is not.
 *
 * The result is cached for the session — `clearServerCache()` wipes it on
 * logout, so a role change never leaks across accounts.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { useAuth } from "@/features/auth/auth-context";
import { probeAdminAccess } from "./analytics.api";

export type AdminAccessStatus =
  /** Auth or probe still resolving — render neutral placeholders. */
  | "checking"
  /** Backend confirmed `role === 'admin'`. */
  | "admin"
  /** Backend answered 401/403, or no session exists. */
  | "denied"
  /** The probe itself failed — treated as denied, but reported honestly. */
  | "unreachable";

export interface AdminAccess {
  status: AdminAccessStatus;
  isAdmin: boolean;
}

export function useAdminAccess(): AdminAccess {
  const { status: authStatus } = useAuth();
  const authed = authStatus === "authenticated";

  const probe = useQuery({
    queryKey: queryKeys.admin.access,
    queryFn: probeAdminAccess,
    enabled: authed,
    // One probe per session: the answer cannot change without a new
    // session, and refresh()/logout clears the cache.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  if (!authed) {
    return {
      status: authStatus === "loading" ? "checking" : "denied",
      isAdmin: false,
    };
  }
  if (probe.isPending) return { status: "checking", isAdmin: false };
  if (probe.isError) return { status: "unreachable", isAdmin: false };
  return probe.data
    ? { status: "admin", isAdmin: true }
    : { status: "denied", isAdmin: false };
}
