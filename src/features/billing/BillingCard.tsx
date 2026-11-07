/**
 * Billing card (Stripe phase §13–§14, §18).
 *
 * Renders the server-provided subscription state — current plan,
 * price, billing status, renewal date — and the management actions
 * (cancel at period end, resume, Stripe Customer Portal). The server
 * is the authority for every fact on this card; the card never
 * computes entitlements.
 */
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
      label: "Cancellation pending",
      tone: "warning",
      detail: `${subscription.plan_name} stays active until ${formatDate(subscription.ends_at)}. You won't be charged again.`,
    };
  }
  switch (subscription.status) {
    case "active":
      return {
        label: "Active",
        tone: "success",
        detail: subscription.renews_at
          ? `Next payment on ${formatDate(subscription.renews_at)}.`
          : "Subscription is active.",
      };
    case "trialing":
      return {
        label: "Trial",
        tone: "info",
        detail: subscription.renews_at
          ? `Paid period starts ${formatDate(subscription.renews_at)}.`
          : "Trial active.",
      };
    case "past_due":
      return {
        label: "Payment past due",
        tone: "danger",
        detail: "Your payment method needs attention. Update it to keep full access.",
      };
    case "incomplete":
      return {
        label: "Payment incomplete",
        tone: "warning",
        detail: "Your payment hasn't been completed yet.",
      };
    case "unpaid":
      return {
        label: "Unpaid",
        tone: "danger",
        detail: "Payment failed after retries — paid features are paused.",
      };
    case "canceled":
      return {
        label: "Canceled",
        tone: "info",
        detail: "The subscription has ended. Choose a plan to come back.",
      };
    default:
      return {
        label: subscription.status,
        tone: "info",
        detail: "",
      };
  }
}

export function BillingCard({ subscription }: { subscription: SubscriptionResponse }) {
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
              {subscription.plan_name} plan
              <Badge tone={status.tone}>{status.label}</Badge>
            </p>
            <p className="text-sm text-text-secondary">
              {subscription.price === 0
                ? formatMoney(subscription.price, subscription.currency)
                : `${formatMoney(subscription.price, subscription.currency)} /month`}
              {status.detail ? ` — ${status.detail}` : ""}
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
              <CalendarClock aria-hidden="true" className="size-4" />
              Cancel subscription
            </Button>
          ) : null}
          {canResume ? (
            <Button
              variant="secondary"
              loading={resumeMutation.isPending}
              onClick={() => { resumeMutation.mutate(); }}
            >
              <Undo2 aria-hidden="true" className="size-4" />
              Keep my subscription
            </Button>
          ) : null}
          <Button
            variant="ghost"
            loading={portalMutation.isPending}
            onClick={() => { portalMutation.mutate(); }}
          >
            Manage billing
          </Button>
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
