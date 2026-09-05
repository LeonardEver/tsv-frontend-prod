/**
 * Plans page (Phase 21 §8; Stripe phase §5–§6, §16, §18–§19; restyled
 * Phase 23). The Lovable reference `src/routes/plans.tsx` supplies the
 * visual treatment: three plan cards (featured Survivor with the ember
 * glow), the comparison matrix, and the pricing typography — all
 * populated from REAL plan data (the matrix derives from each plan's
 * entitlements; no features are invented).
 *
 * Billing (Stripe TEST mode) is unchanged:
 *  - Subscribe/upgrade starts a plan change on the SERVER (clients
 *    never supply price ids). The server returns either an embedded
 *    checkout client secret (mounted in-app — no redirect to
 *    checkout.stripe.com) or the already-updated subscription.
 *  - Entitlements change ONLY when the webhook lands; the page polls
 *    the canonical GET /subscription and shows a "confirming payment"
 *    state meanwhile. A payment is never claimed before the server
 *    confirms the plan.
 *  - Downgrading to Free cancels at period end — the paid plan is
 *    kept until the period actually ends (§16).
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Minus, ShieldCheck } from "lucide-react";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { queryKeys } from "@/lib/api/keys";
import { ApiError } from "@/lib/api/errors";
import { describeError } from "@/lib/api/error-map";
import { formatDate, formatMoney } from "@/lib/format/format";
import { isBillingEnabled } from "@/lib/config/env";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorState } from "@/components/shared/ErrorState";
import { Chip, SectionHeader } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { useUiStore } from "@/stores/ui-store";
import { UsageCard } from "./UsageCard";
import {
  cancelSubscription,
  chooseDevPlan,
  fetchPlans,
  fetchSubscription,
  fetchUsage,
  startPlanCheckout,
} from "./plans.api";
import { EmbeddedCheckoutModal } from "@/features/billing/EmbeddedCheckoutModal";
import { BillingCard } from "@/features/billing/BillingCard";
import { waitForPlanChange } from "@/features/billing/sync";
import type { PlanCode, PlansResponse } from "@/lib/api/types";

function priceLabel(price: number, currency: string, period: string | null): string {
  // Free renders as "$0" (formatMoney's zero case) — the plan card
  // never shows a localized free label.
  const base = formatMoney(price, currency);
  return period === "month" ? `${base} /month` : base;
}

const PLAN_TAGLINES: Record<string, string> = {
  free: "Your daily training ration. One lesson and one field test a day, with every resource available to view.",
  survivor: "For the committed prepper — 10 lessons and 10 quizzes a day, full Community access and downloadable field resources.",
  operator: "Unlimited training for daily operators and instructors. Everything in Survivor, without daily limits.",
};

/** Feature rows for one plan — derived from its REAL entitlements. */
function planFeatures(plan: PlansResponse["plans"][number]) {
  const e = plan.entitlements;
  return [
    {
      label:
        e.daily_lessons === null
          ? "Unlimited lessons per day"
          : `${e.daily_lessons} ${e.daily_lessons === 1 ? "lesson" : "lessons"} per day`,
      included: true,
    },
    {
      label:
        e.daily_quizzes === null
          ? "Unlimited field tests per day"
          : `${e.daily_quizzes} ${e.daily_quizzes === 1 ? "field test" : "field tests"} per day`,
      included: true,
    },
    { label: "Field test before lesson", included: e.quiz_before_lesson },
    { label: "View field resources", included: true },
    { label: "Download field resources", included: e.resource_download },
    { label: "Community access", included: e.community },
  ];
}

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "string") return <span className="font-mono text-sm">{value}</span>;
  return value ? (
    <Check className="mx-auto size-4 text-[color:var(--success)]" aria-label="Included" />
  ) : (
    <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Not included" />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Checkout state machine (Stripe phase §18) — unchanged
// ═══════════════════════════════════════════════════════════════════════════

type CheckoutPhase =
  | { kind: "idle" }
  | { kind: "opening"; plan: PlanCode }
  | { kind: "open"; plan: PlanCode; clientSecret: string }
  | { kind: "processing"; plan: PlanCode }
  | { kind: "syncing"; plan: PlanCode; timedOut: boolean }
  | { kind: "synced"; plan: PlanCode }
  | { kind: "failed"; plan: PlanCode; message: string };

export default function PlansPage() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const [searchParams, setSearchParams] = useSearchParams();
  const [billingNote, setBillingNote] = useState<string | null>(null);
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null);
  const [phase, setPhase] = useState<CheckoutPhase>({ kind: "idle" });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const plansQuery = useQuery({
    queryKey: queryKeys.plans.plans(userId),
    queryFn: fetchPlans,
    staleTime: 60_000,
  });

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(userId),
    queryFn: fetchSubscription,
    staleTime: 30_000,
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.plans.usage(userId),
    queryFn: fetchUsage,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const invalidatePlanState = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.plans.plans(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.plans.subscription(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.plans.usage(userId) });
  };

  /** The authoritative post-payment sync: poll until the WEBHOOK lands. */
  const runSync = async (plan: PlanCode) => {
    setPhase({ kind: "syncing", plan, timedOut: false });
    const landed = await waitForPlanChange(queryClient, userId, plan);
    if (landed) {
      setPhase({ kind: "synced", plan });
      invalidatePlanState();
      pushToast({
        tone: "success",
        title: "Subscription active",
        description: "Your plan changed. Welcome aboard.",
      });
    } else {
      // §18/§19: webhook synchronization pending — never claim a plan.
      setPhase({ kind: "syncing", plan, timedOut: true });
    }
  };

  // Return-URL entry point: Stripe redirects here after embedded
  // checkout completion (?checkout=cs_…). Start the authoritative sync.
  const checkoutParam = searchParams.get("checkout");
  useEffect(() => {
    if (!checkoutParam) return;
    setSearchParams({}, { replace: true }); // keep the URL clean
    setPhase({ kind: "syncing", plan: "survivor", timedOut: false });
    void (async () => {
      const landed = await waitForPlanChange(queryClient, userId);
      if (landed) {
        setPhase({ kind: "synced", plan: "survivor" });
        invalidatePlanState();
        pushToast({
          tone: "success",
          title: "Payment received",
          description: "Your subscription is active.",
        });
      } else {
        setPhase({ kind: "syncing", plan: "survivor", timedOut: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutParam]);

  const checkoutMutation = useMutation({
    mutationFn: startPlanCheckout,
    onSuccess: (result, requestedPlan) => {
      if (result.result === "subscription_updated" && result.subscription) {
        // In-place upgrade — the server already changed the plan.
        setPhase({ kind: "synced", plan: result.subscription.plan_code });
        invalidatePlanState();
        pushToast({
          tone: "success",
          title: `You're now on ${result.subscription.plan_name}`,
          description: "The price difference is prorated by Stripe.",
        });
        return;
      }
      if (result.result === "checkout" && result.client_secret) {
        setPhase({
          kind: "open",
          plan: requestedPlan,
          clientSecret: result.client_secret,
        });
        return;
      }
      setPhase({
        kind: "failed",
        plan: requestedPlan,
        message: "The payment provider returned an unexpected response. Please try again.",
      });
    },
    onError: (err, requestedPlan) => {
      const copy = describeError(err);
      setPhase({
        kind: "failed",
        plan: requestedPlan,
        message: `${copy.title}${copy.description ? ` ${copy.description}` : ""}`,
      });
    },
    onSettled: () => { setSwitchingPlan(null); },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (subscription) => {
      setCancelDialogOpen(false);
      invalidatePlanState();
      pushToast({
        tone: "success",
        title: "Cancellation scheduled",
        description: subscription.ends_at
          ? `${subscription.plan_name} stays active until ${formatDate(subscription.ends_at)}.`
          : "Your plan will end at the period end.",
      });
    },
    onError: (err) => {
      const copy = describeError(err);
      pushToast({ tone: "error", title: copy.title, description: copy.description });
    },
  });

  const devPlanMutation = useMutation({
    mutationFn: chooseDevPlan,
    onSuccess: invalidatePlanState,
    onError: (err) => {
      if (err instanceof ApiError && err.status === 404) {
        // Production without the dev switch. Honest state — no payment
        // is claimed.
        setBillingNote(
          "Plan changes will be available here when billing goes live. Prices shown are the planned product pricing.",
        );
      }
    },
    onSettled: () => { setSwitchingPlan(null); },
  });

  const billingEnabled = isBillingEnabled();

  /** Plan-card action: subscribe/upgrade via the server, or dev switch
   * when Stripe isn't configured in this environment. */
  const choosePlan = (plan: PlanCode) => {
    setBillingNote(null);
    if (plan === "free") {
      // Downgrade = cancel at period end (§16), never an instant cut.
      setCancelDialogOpen(true);
      return;
    }
    setSwitchingPlan(plan);
    if (billingEnabled) {
      checkoutMutation.mutate(plan as "survivor" | "operator");
    } else {
      devPlanMutation.mutate(plan);
    }
  };

  const handleCheckoutComplete = () => {
    // Stripe fires this only on successful completion — payment
    // failures are rendered by Stripe inside the embedded form.
    const plan = phase.kind === "open" ? phase.plan : "survivor";
    setPhase({ kind: "processing", plan });
    void runSync(plan);
  };

  if (plansQuery.isPending) {
    return (
      <div role="status" aria-label="Loading plans" className="space-y-6">
        <div className="panel h-16 animate-pulse" aria-hidden="true" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel h-96 animate-pulse" aria-hidden="true" />
          <div className="panel h-96 animate-pulse" aria-hidden="true" />
          <div className="panel h-96 animate-pulse" aria-hidden="true" />
        </div>
      </div>
    );
  }
  if (plansQuery.isError) {
    return <ErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />;
  }

  const plans = plansQuery.data;
  const subscription = subscriptionQuery.data;
  const paidSubscription = subscription && subscription.plan_code !== "free";
  const matrixRows =
    plans.plans.length > 0 && plans.plans[0]
      ? planFeatures(plans.plans[0]).map((f) => f.label)
      : [];

  return (
    <div>
      <PageHeader
        eyebrow="Subscription"
        title="Choose Your Plan"
        description="Every plan opens the whole academy. Plans change how much you can train per day and what you can take into the field."
      />

      {subscription ? <div className="mb-10"><BillingCard subscription={subscription} /></div> : null}

      {/* ── Checkout states (loading / open / processing / syncing /
           failed) — the embedded checkout is mounted in a native
           dialog, payment never leaves the app. ── */}
      <EmbeddedCheckoutModal
        open={phase.kind === "open"}
        clientSecret={phase.kind === "open" ? phase.clientSecret : ""}
        onComplete={handleCheckoutComplete}
        onClose={() => { setPhase({ kind: "idle" }); }}
      />

      {phase.kind === "opening" || phase.kind === "processing" ? (
        <div className="panel-2 mb-6 flex items-center gap-3 p-4">
          <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
          <p role="status" className="text-sm text-muted-foreground">
            {phase.kind === "opening" ? "Preparing secure checkout…" : "Processing payment…"}
          </p>
        </div>
      ) : null}

      {phase.kind === "syncing" ? (
        <div className="panel-2 mb-6 space-y-2 p-4">
          <div className="flex items-center gap-3">
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
            <p role="status" className="text-sm">
              {phase.timedOut
                ? "We're still confirming your payment with the bank."
                : "Payment received — confirming your subscription…"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {phase.timedOut
              ? "Your plan activates automatically the moment the payment clears. This can take a moment."
              : "Your plan activates as soon as Stripe confirms the payment."}
          </p>
          {phase.timedOut ? (
            <button
              type="button"
              onClick={() => { void runSync(phase.plan); }}
              className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              Check status
            </button>
          ) : null}
        </div>
      ) : null}

      {phase.kind === "synced" ? (
        <div className="panel-2 mb-6 flex items-center gap-2 border-success/40 p-4 text-sm text-[color:var(--success)]">
          <Check aria-hidden="true" className="size-4" />
          <p role="status">
            {plans.plans.find((p) => p.code === phase.plan)?.name ?? "Your"} plan is active —
            paid features are available right now.
          </p>
        </div>
      ) : null}

      {phase.kind === "failed" ? (
        <div className="panel-2 mb-6 space-y-1 border-destructive/40 p-4" role="alert">
          <p className="text-sm font-semibold text-destructive">Payment failed</p>
          <p className="text-sm text-muted-foreground">{phase.message} No charge was made.</p>
        </div>
      ) : null}

      <section className="mb-12 grid gap-4 lg:grid-cols-3">
        {plans.plans.map((plan) => {
          const current = plan.code === plans.current_plan_code;
          const featured = plan.code === "survivor";
          const switching = switchingPlan === plan.code;
          return (
            <article
              key={plan.code}
              className={featured ? "panel glow-ember relative flex flex-col p-6" : "panel relative flex flex-col p-6"}
              style={featured ? { borderColor: "color-mix(in oklab, var(--ember) 40%, var(--border))" } : undefined}
            >
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">
                  {plan.name}
                </h2>
                {current && <Chip color="var(--success)">Current plan</Chip>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{PLAN_TAGLINES[plan.code]}</p>
              <p className="mt-5 font-display text-4xl font-semibold">
                {priceLabel(plan.price, plan.currency, plan.billing_period)}
              </p>
              <ul className="mt-6 grid flex-1 gap-3">
                {planFeatures(plan).map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
                    ) : (
                      <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={f.included ? "" : "text-muted-foreground"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              {current ? (
                <button
                  type="button"
                  disabled
                  className="mt-7 inline-flex min-h-12 cursor-default items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  <ShieldCheck aria-hidden="true" className="size-4" />
                  Current plan
                </button>
              ) : (
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => { choosePlan(plan.code); }}
                  className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {switching
                    ? "Working…"
                    : plan.code === "free"
                      ? "Downgrade to Free"
                      : plan.code === "operator" && paidSubscription
                        ? "Upgrade to Operator"
                        : `Choose ${plan.name}`}
                </button>
              )}
            </article>
          );
        })}
      </section>

      <section className="mb-6">
        <SectionHeader eyebrow="Detail" title="Feature Comparison" />
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Plan feature comparison</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="eyebrow p-4">Feature</th>
                {plans.plans.map((p) => (
                  <th key={p.code} scope="col" className="eyebrow p-4 text-center">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((label) => (
                <tr key={label} className="border-b border-border last:border-0">
                  <th scope="row" className="p-4 text-sm font-normal">
                    {label}
                  </th>
                  {plans.plans.map((p) => {
                    const row = planFeatures(p).find((f) => f.label === label);
                    return (
                      <td key={p.code} className="p-4 text-center">
                        <Cell value={row?.included ?? false} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          Cancel anytime. No long-term contract.
        </p>
      </section>

      {/* Downgrade = cancel at period end (§16). The user keeps the
          paid plan until the period actually ends — stated clearly. */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Downgrade to the Free plan?"
        description={
          subscription?.ends_at
            ? `Your ${subscription.plan_name} plan stays active until ${formatDate(subscription.ends_at)}. After that you'll be on the Free plan — one lesson and one quiz per day, and no PDF downloads. You can upgrade again any time.`
            : "Your paid plan stays active until the current period ends. After that you'll be on the Free plan."
        }
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            disabled={cancelMutation.isPending}
            onClick={() => { setCancelDialogOpen(false); }}
          >
            Keep my plan
          </Button>
          <Button
            variant="danger"
            loading={cancelMutation.isPending}
            onClick={() => { cancelMutation.mutate(); }}
          >
            Cancel subscription
          </Button>
        </div>
      </Dialog>

      {usageQuery.data ? (
        <div className="mb-6">
          <UsageCard usage={usageQuery.data} />
        </div>
      ) : null}

      {billingNote ? (
        <div className="panel-2 mb-6 p-4">
          <p role="status" className="text-sm text-muted-foreground">
            {billingNote}
          </p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {billingEnabled
          ? "Payments are processed by Stripe in TEST mode — cards are simulated and nothing is charged."
          : "Billing is not configured in this environment — no payment is processed on this page."}
      </p>
    </div>
  );
}
