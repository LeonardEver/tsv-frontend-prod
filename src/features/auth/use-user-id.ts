/**
 * Current user id — derived from the CANONICAL /auth/me query, so it
 * works in any component regardless of AuthProvider nesting. The same
 * key + the same queryFn as the AuthProvider's bootstrap query means
 * TanStack dedupes to ONE shared query — no duplicate fetch, and no
 * "missing queryFn" errors when this observer registers first.
 * Returns 0 while the bootstrap is pending or unauthenticated.
 *
 * Phase 21 §16: user-scoped query keys use this id, which is exactly
 * what guarantees cross-user cache isolation on shared devices.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { fetchCurrentUser } from "./auth.api";

export function useCurrentUserId(): number {
  const { data } = useQuery<{ user_id?: number }, Error, number>({
    queryKey: queryKeys.auth.me,
    queryFn: fetchCurrentUser,
    select: (user) => user.user_id ?? 0,
    staleTime: 30_000,
  });
  return data ?? 0;
}
