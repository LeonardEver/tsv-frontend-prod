/**
 * The field-test gate — one rule, one place.
 *
 * On the Free plan the module's lesson must be completed before the field
 * test opens (`entitlements.quiz_before_lesson === false`); Survivor and
 * Operator can test themselves any time. The BACKEND is the enforcement
 * authority and refuses the attempt regardless — this hook only decides
 * what the UI may offer.
 *
 * It lives here rather than inline on the quiz page because two surfaces
 * express the same rule: the quiz page (which renders the unlock card
 * instead of a session) and the lesson page (whose "Take field test" CTA
 * is disabled until the gate opens). Both read the identical two sources,
 * so the lesson page can never offer an attempt the quiz page would
 * refuse.
 *
 * Deliberately NOT scoped to a user id: a missing or delayed `/auth/me`
 * says nothing about the plan, and a gate that never resolves would hide
 * the quiz from a signed-in learner. Both sources are plain authenticated
 * reads.
 *
 * Failure policy is the product's own, unchanged: the gate renders
 * "locked" only when the server has POSITIVELY said lesson-first (`false`
 * entitlement) AND the lesson is not completed. A read that fails or is
 * still in flight never invents a lock — and never stalls the page either,
 * because the backend refuses the attempt regardless of what the UI shows.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { fetchModuleProgress } from "@/features/progress/progress.api";
import { fetchSubscription } from "@/features/plans/plans.api";

export type FieldTestGate =
  /** Entitlements or per-module progress still resolving. */
  | "checking"
  /** The learner may start an attempt now. */
  | "open"
  /** Free plan and the lesson is not completed yet (or unconfirmable). */
  | "locked";

/**
 * `moduleId` may be empty while the module detail is still resolving (or
 * when it resolved to nothing): there is no module to gate yet, so the
 * gate reports "checking" rather than querying a resource that does not
 * exist. Callers must not treat "checking" as a refusal.
 */
export function useFieldTestGate(moduleId: string): FieldTestGate {
  const known = Boolean(moduleId);

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(0),
    queryFn: fetchSubscription,
    staleTime: 60_000,
  });

  const moduleProgressQuery = useQuery({
    queryKey: queryKeys.learning.moduleProgress(moduleId),
    queryFn: () => fetchModuleProgress(moduleId),
    staleTime: 30_000,
    enabled: known,
  });

  if (!known) return "checking";

  if (subscriptionQuery.data === undefined) {
    // Still loading — undecided. A FAILED entitlements read is not a rule
    // either: the page renders and the backend refuses if it should.
    return subscriptionQuery.isError ? "open" : "checking";
  }
  // The plan's rule, verbatim from entitlements: only an explicit `false`
  // imposes lesson-first. The API types the field as a boolean, so the
  // false branch is the only one that can reach the lock.
  if (subscriptionQuery.data.entitlements.quiz_before_lesson) return "open";

  // Lesson-first applies. Without the progress answer there is nothing to
  // base a lock on, so the gate stays undecided rather than guessing.
  if (moduleProgressQuery.data === undefined) return "checking";
  return moduleProgressQuery.data.lesson_completed ? "open" : "locked";
}
