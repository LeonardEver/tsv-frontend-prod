/**
 * Billing card (Stripe phase §13–§14, §18).
 *
 * Renders the server-provided subscription state — current plan,
 * price, billing status, renewal date — and the management actions
 * (cancel at period end, resume, Stripe Customer Portal). The server
 * is the authority for every fact on this card; the card never
 * computes entitlements.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CreditCard, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { describeError } from "@/lib/api/error-map";
import { queryKeys } from "@/lib/api/keys";
import { formatDate, formatMoney } from "@/lib/format/format";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import {
  cancelSubscription,
  createBillingPortal,
  resumeSubscription,
} from "@/features/plans/plans.api";
import type { SubscriptionResponse } from "@/lib/api/types";

type StatusTone = "success" | "warning" | "danger" | "info";

/** Status copy — server status → presentation. Cancellation pending
 * must be unmistakable: the plan is KEPT until the period ends. */
function statusFor(subscription: SubscriptionResponse): {
  label: string;
  tone: StatusTone;
  detail: string;
} {
  if (subscription.cancel_at_period_end) {
    return {
      get label() { return uiText("subscriptions:cancellation_pending_199752"); },
      tone: "warning",
      detail: uiText("subscriptions:cancelDetail", { plan: subscription.plan_name, date: formatDate(subscription.ends_at) }),
    };
  }
  switch (subscription.status) {
    case "active":
      return {
        get label() { return uiText("subscriptions:active_a733b8"); },
        tone: "success",
        detail: subscription.renews_at
          ? uiText("subscriptions:nextPayment", { date: formatDate(subscription.renews_at) })
          : uiText("subscriptions:activeDetail"),
      };
    case "trialing":
      return {
        get label() { return uiText("subscriptions:trial_5f7537"); },
        tone: "info",
        detail: subscription.renews_at
          ? uiText("subscriptions:trialStarts", { date: formatDate(subscription.renews_at) })
          : uiText("subscriptions:trialDetail"),
      };
    case "past_due":
      return {
        get label() { return uiText("subscriptions:payment_past_due_2de950"); },
        tone: "danger",
        detail: uiText("subscriptions:updatePayment"),
      };
    case "incomplete":
      return {
        get label() { return uiText("subscriptions:payment_incomplete_62caf9"); },
        tone: "warning",
        detail: uiText("subscriptions:incompletePayment"),
      };
    case "unpaid":
      return {
        get label() { return uiText("subscriptions:unpaid_50cc12"); },
        tone: "danger",
        detail: uiText("subscriptions:unpaidDetail"),
      };
    case "canceled":
      return {
        get label() { return uiText("subscriptions:canceled_f840ac"); },
        tone: "info",
        detail: uiText("subscriptions:endedDetail"),
      };
    default:
      return {
        label: uiText("subscriptions:unknownStatus"),
        tone: "info",
        detail: "",
      };
  }
}

export function BillingCard({ subscription }: { subscription: SubscriptionResponse }) {
  useInterfaceLocale();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const status = statusFor(subscription);

  const invalidatePlans = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.plans.plans(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.plans.subscription(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.plans.usage(userId) });
  };

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: invalidatePlans,
  });

  const resumeMutation = useMutation({
    mutationFn: resumeSubscription,
    onSuccess: invalidatePlans,
  });

  const portalMutation = useMutation({
    mutationFn: createBillingPortal,
    onSuccess: (portal) => {
      // The Customer Portal is Stripe-hosted billing management
      // (payment method updates, invoices) — sanctioned redirect.
      window.location.assign(portal.url);
    },
    onError: (err) => {
      const copy = describeError(err);
      console.error(copy.title, err);
    },
  });

  const isPaid = subscription.plan_code !== "free";
  const canCancel = isPaid && !subscription.cancel_at_period_end;
  const canResume = isPaid && subscription.cancel_at_period_end;

  return (
    <Card className="surface-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-lg bg-accent-ember/15 text-accent-ember"
          >
            <CreditCard className="size-5" />
          </span>
          <div>
            <p className="flex items-center gap-2 font-semibold">
              {subscription.plan_name}{" "}{uiText("subscriptions:plan_bed971")}<Badge tone={status.tone}>{status.label}</Badge>
            </p>
            <p className="text-sm text-text-secondary">
              {subscription.price === 0
                ? formatMoney(subscription.price, subscription.currency)
                : uiText("subscriptions:value_month_801a11", { value0: uiValue(formatMoney(subscription.price, subscription.currency)) })}
              {status.detail ? uiText("subscriptions:value_dd094d", { value0: uiValue(status.detail) }) : ""}
            </p>
          </div>
        </div>
      </div>

      {isPaid ? (
        <div className="flex flex-wrap gap-3 border-t border-border-default pt-4">
          {canCancel ? (
            <Button
              variant="secondary"
              loading={cancelMutation.isPending}
              onClick={() => { cancelMutation.mutate(); }}
            >
              <CalendarClock aria-hidden="true" className="size-4" />{uiText("subscriptions:cancel_subscription_6d7f05")}</Button>
          ) : null}
          {canResume ? (
            <Button
              variant="secondary"
              loading={resumeMutation.isPending}
              onClick={() => { resumeMutation.mutate(); }}
            >
              <Undo2 aria-hidden="true" className="size-4" />{uiText("subscriptions:keep_my_subscription_65dd79")}</Button>
          ) : null}
          <Button
            variant="ghost"
            loading={portalMutation.isPending}
            onClick={() => { portalMutation.mutate(); }}
          >{uiText("subscriptions:manage_billing_a8f311")}</Button>
          {cancelMutation.isError || resumeMutation.isError || portalMutation.isError ? (
            <p role="alert" className="w-full text-sm text-danger-blood">
              {describeError(
                cancelMutation.error ?? resumeMutation.error ?? portalMutation.error,
              ).title}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
