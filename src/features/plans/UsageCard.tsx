/**
 * UsageCard (Phase 21 §15) — today's allowance at a glance.
 *
 * Copy rules: never punitive. At the limit, state it plainly plus when
 * the reset lands and (for Free) the upgrade path.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { Link } from "react-router";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { UsageResponse } from "@/lib/api/types";

function quotaLabel(used: number, limit: number | null): string {
  return limit === null ? "Unlimited" : `${used} / ${limit}`;
}

function atLimit(used: number, limit: number | null): boolean {
  return limit !== null && used >= limit;
}

export function UsageCard({ usage }: { usage: UsageResponse }) {
  useInterfaceLocale();
  const lessonsAtLimit = atLimit(
    usage.lesson_completions,
    usage.limits.daily_lessons,
  );
  const quizzesAtLimit = atLimit(usage.quiz_attempts, usage.limits.daily_quizzes);

  return (
    <Card className="surface-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{uiText("subscriptions:today_s_learning_7c79b7")}</h2>
        <span className="text-sm text-text-secondary">
          {usage.limits.daily_lessons === null
            ? uiText("subscriptions:unlimited_b8bef3")
            : uiText("subscriptions:value_plan_0f949f", { value0: uiValue(usage.plan_name) })}
        </span>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-bg-elevated p-3">
          <dt className="text-text-secondary">{uiText("subscriptions:lessons_cb9ce9")}</dt>
          <dd className="num-display mt-1 text-lg font-semibold">
            {quotaLabel(usage.lesson_completions, usage.limits.daily_lessons)}
          </dd>
        </div>
        <div className="rounded-lg bg-bg-elevated p-3">
          <dt className="text-text-secondary">{uiText("subscriptions:quizzes_63b3fe")}</dt>
          <dd className="num-display mt-1 text-lg font-semibold">
            {quotaLabel(usage.quiz_attempts, usage.limits.daily_quizzes)}
          </dd>
        </div>
      </dl>

      {lessonsAtLimit && !quizzesAtLimit ? (
        <Alert tone="info" title={uiText("subscriptions:daily_lesson_limit_reached_f7a955")}>
          <span>{uiText("subscriptions:your_limit_resets_tomorrow_6eeb2a")}{usage.plan_code === "free" ? (
              <span>
                {" "}
                <Link to="/plans" className="underline">{uiText("subscriptions:upgrade_to_survivor_for_10_lessons_and_ab0431")}</Link>
              </span>
            ) : null}
          </span>
        </Alert>
      ) : null}

      {quizzesAtLimit ? (
        <Alert tone="info" title={uiText("subscriptions:daily_quiz_limit_reached_c5d7b8")}>
          <span>{uiText("subscriptions:your_limit_resets_tomorrow_6eeb2a")}{usage.plan_code === "free" ? (
              <span>
                {" "}
                <Link to="/plans" className="underline">{uiText("subscriptions:upgrade_to_survivor_for_10_lessons_and_ab0431")}</Link>
              </span>
            ) : null}
          </span>
        </Alert>
      ) : null}

      {usage.plan_code === "free" ? (
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/plans">{uiText("subscriptions:upgrade_plan_e80fe7")}</Link>
        </Button>
      ) : null}
    </Card>
  );
}
