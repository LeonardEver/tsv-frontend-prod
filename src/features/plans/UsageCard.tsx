/**
 * UsageCard (Phase 21 §15) — today's allowance at a glance.
 *
 * Copy rules: never punitive. At the limit, state it plainly plus when
 * the reset lands and (for Free) the upgrade path.
 */
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
  const lessonsAtLimit = atLimit(
    usage.lesson_completions,
    usage.limits.daily_lessons,
  );
  const quizzesAtLimit = atLimit(usage.quiz_attempts, usage.limits.daily_quizzes);

  return (
    <Card className="surface-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Today&apos;s learning</h2>
        <span className="text-sm text-text-secondary">
          {usage.limits.daily_lessons === null
            ? "Unlimited"
            : `${usage.plan_name} plan`}
        </span>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-bg-elevated p-3">
          <dt className="text-text-secondary">Lessons</dt>
          <dd className="num-display mt-1 text-lg font-semibold">
            {quotaLabel(usage.lesson_completions, usage.limits.daily_lessons)}
          </dd>
        </div>
        <div className="rounded-lg bg-bg-elevated p-3">
          <dt className="text-text-secondary">Quizzes</dt>
          <dd className="num-display mt-1 text-lg font-semibold">
            {quotaLabel(usage.quiz_attempts, usage.limits.daily_quizzes)}
          </dd>
        </div>
      </dl>

      {lessonsAtLimit && !quizzesAtLimit ? (
        <Alert tone="info" title="Daily lesson limit reached">
          <span>
            Your limit resets tomorrow.
            {usage.plan_code === "free" ? (
              <span>
                {" "}
                <Link to="/plans" className="underline">
                  Upgrade to Survivor for 10 lessons and quizzes per day.
                </Link>
              </span>
            ) : null}
          </span>
        </Alert>
      ) : null}

      {quizzesAtLimit ? (
        <Alert tone="info" title="Daily quiz limit reached">
          <span>
            Your limit resets tomorrow.
            {usage.plan_code === "free" ? (
              <span>
                {" "}
                <Link to="/plans" className="underline">
                  Upgrade to Survivor for 10 lessons and quizzes per day.
                </Link>
              </span>
            ) : null}
          </span>
        </Alert>
      ) : null}

      {usage.plan_code === "free" ? (
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/plans">Upgrade plan</Link>
        </Button>
      ) : null}
    </Card>
  );
}
