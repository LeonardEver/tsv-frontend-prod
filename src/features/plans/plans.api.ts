/**
 * Plans / subscription / usage API (Phase 21).
 *
 * The backend is the ONLY authority on entitlements and quotas — these
 * calls never write plan state except through the dev-only switch, which
 * exists for development and is not registered in production (a 404
 * means billing is the real path there).
 */
import { request } from "@/lib/api/client";
import type {
  BillingPortalResponse,
  CheckoutStartResponse,
  PlansResponse,
  SubscriptionResponse,
  UsageResponse,
} from "@/lib/api/types";

export function fetchPlans(): Promise<PlansResponse> {
  return request<PlansResponse>("/plans");
}

export function fetchSubscription(): Promise<SubscriptionResponse> {
  return request<SubscriptionResponse>("/subscription");
}

export function fetchUsage(): Promise<UsageResponse> {
  return request<UsageResponse>("/usage");
}

/** Dev/test plan switch — never presented as a payment. */
export function chooseDevPlan(planCode: string): Promise<SubscriptionResponse> {
  return request<SubscriptionResponse>("/subscription/dev-plan", {
    method: "POST",
    body: { plan_code: planCode },
  });
}

// ── Stripe billing (Stripe phase §6, §14–§16) ───────────────────────────────
//
// The client supplies ONLY a plan code; the server resolves the Stripe
// price, reuses the customer, and returns either an embedded-checkout
// client secret or the already-updated subscription (in-place upgrade).

/** Start a plan change. `result: "checkout"` → mount embedded checkout
 * with the client_secret; `result: "subscription_updated"` → the plan
 * changed server-side (upgrade path), refresh subscription state. */
export function startPlanCheckout(plan: "survivor" | "operator"): Promise<CheckoutStartResponse> {
  return request<CheckoutStartResponse>("/billing/checkout", {
    method: "POST",
    body: { plan },
  });
}

/** Cancel at period end — the paid plan is kept until current_period_end. */
export function cancelSubscription(): Promise<SubscriptionResponse> {
  return request<SubscriptionResponse>("/billing/cancel", { method: "POST" });
}

/** Undo a pending cancellation. */
export function resumeSubscription(): Promise<SubscriptionResponse> {
  return request<SubscriptionResponse>("/billing/resume", { method: "POST" });
}

/** Stripe Customer Portal (payment method updates, invoices). */
export function createBillingPortal(): Promise<BillingPortalResponse> {
  return request<BillingPortalResponse>("/billing/portal", { method: "POST" });
}
