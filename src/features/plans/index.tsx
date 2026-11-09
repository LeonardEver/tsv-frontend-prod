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
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
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
  return period === "month" ? uiText("subscriptions:priceMonthly", { price: base }) : base;
}

const PLAN_TAGLINES: Record<string, string> = {
  get free() { return uiText("subscriptions:freeTagline"); },
  get survivor() { return uiText("subscriptions:survivorTagline"); },
  get operator() { return uiText("subscriptions:operatorTagline"); },
};

/** Feature rows for one plan — derived from its REAL entitlements. */
function planFeatures(plan: PlansResponse["plans"][number]) {
  const e = plan.entitlements;
  return [
    {
      label:
        e.daily_lessons === null
          ? uiText("subscriptions:unlimitedLessons")
          : uiText("subscriptions:dailyLessons", { count: e.daily_lessons }),
      included: true,
    },
    {
      label:
        e.daily_quizzes === null
          ? uiText("subscriptions:unlimitedTests")
          : uiText("subscriptions:dailyTests", { count: e.daily_quizzes }),
      included: true,
    },
    { get label() { return uiText("subscriptions:field_test_before_lesson_f25ded"); }, included: e.quiz_before_lesson },
    { get label() { return uiText("subscriptions:view_field_resources_09c551"); }, included: e.resource_download },
    { get label() { return uiText("subscriptions:download_field_resources_2b048b"); }, included: e.resource_download },
    { get label() { return uiText("subscriptions:community_access_b8fca8"); }, included: e.community },
  ];
}

function Cell({ value }: { value: string | boolean }) {
  useInterfaceLocale();
  if (typeof value === "string") return <span className="font-mono text-sm">{value}</span>;
  return value ? (
    <Check className="mx-auto size-4 text-[color:var(--success)]" aria-label={uiText("subscriptions:included_3e2c57")} />
  ) : (
    <Minus className="mx-auto size-4 text-muted-foreground" aria-label={uiText("subscriptions:not_included_bfca33")} />
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
  useInterfaceLocale();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const [searchParams, setSearchParams] = useSearchParams();
  const [billingNote, setBillingNote] = useState<"billingUnavailable" | "localMockOnly" | null>(null);
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
        get title() { return uiText("subscriptions:subscription_active_ef30f6"); },
        get description() { return uiText("subscriptions:your_plan_changed_welcome_aboard_0413d5"); },
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
          get title() { return uiText("subscriptions:payment_received_2608cc"); },
          get description() { return uiText("subscriptions:your_subscription_is_active_b29d06"); },
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
        const updatedPlanName = result.subscription.plan_name;
        pushToast({
          tone: "success",
          get title() { return uiText("subscriptions:you_re_now_on_value_f2dc74", { value0: uiValue(updatedPlanName) }); },
          get description() { return uiText("subscriptions:the_price_difference_is_prorated_by_stripe_7e0433"); },
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
        get message() { return uiText("subscriptions:the_payment_provider_returned_an_unexpected_response_ffb118"); },
      });
    },
    onError: (err, requestedPlan) => {
      const copy = describeError(err);
      setPhase({
        kind: "failed",
        plan: requestedPlan,
        get message() { return uiText("subscriptions:valuevalue_6bbfd3", { value0: uiValue(copy.title), value1: uiValue(copy.description ? ` ${copy.description}` : "") }); },
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
        get title() { return uiText("subscriptions:cancellation_scheduled_70cd2e"); },
        get description() { return subscription.ends_at
          ? uiText("subscriptions:planActiveUntil", { plan: subscription.plan_name, date: formatDate(subscription.ends_at) })
          : uiText("subscriptions:planWillEnd"); },
      });
    },
    onError: (err) => {
      const copy = describeError(err);
      pushToast({ tone: "error", get title() { return copy.title; }, get description() { return copy.description; } });
    },
  });

  const devPlanMutation = useMutation({
    mutationFn: chooseDevPlan,
    onSuccess: invalidatePlanState,
    onError: (err) => {
      if (err instanceof ApiError && err.status === 404) {
        // Production without the dev switch. Honest state — no payment
        // is claimed.
        setBillingNote("billingUnavailable");
      } else if (err instanceof ApiError && err.status === 403) {
        setBillingNote("localMockOnly");
      } else {
        const copy = describeError(err);
        pushToast({ tone: "error", get title() { return copy.title; }, get description() { return copy.description; } });
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
      <div role="status" aria-label={uiText("subscriptions:loading_plans_852261")} className="space-y-6">
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
        eyebrow={uiText("subscriptions:subscription_8fde48")}
        title={uiText("subscriptions:choose_your_plan_c197d6")}
        description={uiText("subscriptions:every_plan_opens_the_whole_academy_plans_c7c2eb")}
      />

      {import.meta.env.DEV && import.meta.env.MODE !== "test" ? <p role="note" className="mb-6 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">{uiText("subscriptions:localTestingNote")}</p> : null}

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
            {phase.kind === "opening" ? uiText("subscriptions:preparing_secure_checkout_8272b4") : uiText("subscriptions:processing_payment_da92bc")}
          </p>
        </div>
      ) : null}

      {phase.kind === "syncing" ? (
        <div className="panel-2 mb-6 space-y-2 p-4">
          <div className="flex items-center gap-3">
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
            <p role="status" className="text-sm">
              {phase.timedOut
                ? uiText("subscriptions:we_re_still_confirming_your_payment_with_82d5d6")
                : uiText("subscriptions:payment_received_confirming_your_subscription_68d61c")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {phase.timedOut
              ? uiText("subscriptions:your_plan_activates_automatically_the_moment_the_804f32")
              : uiText("subscriptions:your_plan_activates_as_soon_as_stripe_b67109")}
          </p>
          {phase.timedOut ? (
            <button
              type="button"
              onClick={() => { void runSync(phase.plan); }}
              className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >{uiText("subscriptions:check_status_07adf9")}</button>
          ) : null}
        </div>
      ) : null}

      {phase.kind === "synced" ? (
        <div className="panel-2 mb-6 flex items-center gap-2 border-success/40 p-4 text-sm text-[color:var(--success)]">
          <Check aria-hidden="true" className="size-4" />
          <p role="status">{uiText("subscriptions:value_plan_is_active_paid_features_are_b01203", { value0: uiValue(plans.plans.find((p) => p.code === phase.plan)?.name ?? "Your") })}</p>
        </div>
      ) : null}

      {phase.kind === "failed" ? (
        <div className="panel-2 mb-6 space-y-1 border-destructive/40 p-4" role="alert">
          <p className="text-sm font-semibold text-destructive">{uiText("subscriptions:payment_failed_b1e8e7")}</p>
          <p className="text-sm text-muted-foreground">{uiText("subscriptions:value_no_charge_was_made_9266b5", { value0: uiValue(phase.message) })}</p>
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
                {current && <Chip color="var(--success)">{uiText("subscriptions:current_plan_ec5cfb")}</Chip>}
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
                  <ShieldCheck aria-hidden="true" className="size-4" />{uiText("subscriptions:current_plan_ec5cfb")}</button>
              ) : (
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => { choosePlan(plan.code); }}
                  className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {switching
                    ? uiText("subscriptions:working_13b7bf")
                    : plan.code === "free"
                      ? uiText("subscriptions:downgrade_to_free_9b6b6b")
                      : plan.code === "operator" && paidSubscription
                        ? uiText("subscriptions:upgrade_to_operator_577877")
                        : uiText("subscriptions:choose_value_59a8b3", { value0: uiValue(plan.name) })}
                </button>
              )}
            </article>
          );
        })}
      </section>

      <section className="mb-6">
        <SectionHeader eyebrow={uiText("subscriptions:detail_7c9a7c")} title={uiText("subscriptions:feature_comparison_d7ca52")} />
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">{uiText("subscriptions:plan_feature_comparison_115e92")}</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="eyebrow p-4">{uiText("subscriptions:feature_ad565d")}</th>
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
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">{uiText("subscriptions:cancel_anytime_no_long_term_contract_2b1caf")}</p>
      </section>

      {/* Downgrade = cancel at period end (§16). The user keeps the
          paid plan until the period actually ends — stated clearly. */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={uiText("subscriptions:downgrade_to_the_free_plan_672563")}
        description={
          subscription?.ends_at
            ? uiText("subscriptions:your_value_plan_stays_active_until_value_0f5116", { value0: uiValue(subscription.plan_name), value1: uiValue(formatDate(subscription.ends_at)) })
            : uiText("subscriptions:your_paid_plan_stays_active_until_the_5318c5")
        }
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            disabled={cancelMutation.isPending}
            onClick={() => { setCancelDialogOpen(false); }}
          >{uiText("subscriptions:keep_my_plan_b160c2")}</Button>
          <Button
            variant="danger"
            loading={cancelMutation.isPending}
            onClick={() => { cancelMutation.mutate(); }}
          >{uiText("subscriptions:cancel_subscription_6d7f05")}</Button>
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
            {uiText(`subscriptions:${billingNote}`)}
          </p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {billingEnabled
          ? uiText("subscriptions:payments_are_processed_by_stripe_e10e6e")
          : uiText("subscriptions:billing_is_not_configured_in_this_environment_937dc1")}
      </p>
    </div>
  );
}
