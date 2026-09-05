/**
 * Webhook-sync polling (Stripe phase §19).
 *
 * After Stripe signals payment completion, the authoritative plan
 * change arrives via the STRIPE WEBHOOK — the browser is never
 * trusted as the source of entitlement. This helper polls the
 * canonical GET /subscription until the effective plan matches, or
 * gives up and reports "sync pending".
 */
import type { QueryClient } from "@tanstack/react-query";
import { fetchSubscription } from "@/features/plans/plans.api";
import { queryKeys } from "@/lib/api/keys";

export const SYNC_POLL_INTERVAL_MS = 1_500;
export const SYNC_TIMEOUT_MS = 20_000;

/**
 * Poll the subscription until the effective plan matches `targetPlan`.
 * With no target (return-URL case), resolves on ANY paid plan.
 * Returns true when the webhook landed, false on timeout.
 */
export async function waitForPlanChange(
  queryClient: QueryClient,
  userId: number,
  targetPlan?: string,
  timeoutMs: number = SYNC_TIMEOUT_MS,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const subscription = await queryClient.fetchQuery({
        queryKey: queryKeys.plans.subscription(userId),
        queryFn: fetchSubscription,
        staleTime: 0,
      });
      if (targetPlan === undefined) {
        if (subscription.plan_code !== "free") return true;
      } else if (subscription.plan_code === targetPlan) {
        return true;
      }
    } catch {
      // Transient backend hiccup — keep polling until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, SYNC_POLL_INTERVAL_MS));
  }
  return false;
}
