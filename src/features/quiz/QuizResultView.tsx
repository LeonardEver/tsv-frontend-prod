/**
 * Quiz result (Phase 23: Lovable result-hero visual structure over the
 * production contract) — rendered EXCLUSIVELY from the authoritative
 * backend submission payload. Nothing here is computed client-side: no
 * score, no pass/fail, no XP, no LO performance, no explanations.
 * Correctness information appears only now, after submission, because
 * the server returned it.
 *
 * The Lovable "What You Got Right / What To Review" topic lists have no
 * equivalent real data (the submission payload carries per-question
 * verdicts, not topic labels), so the two honest real-data sections —
 * per-question review and LO performance — render in the Lovable panel
 * style instead.
 */
import { Link } from "react-router";
import { BookOpen, Check, MessageSquare, RotateCcw, Target, Trophy, X } from "lucide-react";
import type { AchievementsResponse, QuizSubmissionResponse } from "@/lib/api/types";
import { formatDate, formatScorePct } from "@/lib/format/format";
import { Eyebrow, ProgressBar, ProgressRing, SectionHeader, XPBadge } from "@/components/sa/primitives";

export function QuizResultView({
  moduleId,
  quizTitle,
  categorySlug,
  result,
  onRetry,
  newAchievements = [],
}: {
  moduleId: string;
  quizTitle: string;
  /** Region link target for "Continue expedition" (module category). */
  categorySlug?: string;
  result: QuizSubmissionResponse;
  onRetry: () => void;
  /** Achievements that appeared in the authoritative list AFTER this
   * attempt (diffed against the pre-submit snapshot in QuizPage) —
   * never computed from client actions. */
  newAchievements?: AchievementsResponse["earned"];
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <section className="rise panel grain relative overflow-hidden p-6 text-center sm:p-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 50% 0%, color-mix(in oklab, var(--ember) 18%, transparent), transparent 70%)",
          }}
        />
        <div className="relative">
          <Eyebrow>Field test complete</Eyebrow>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-wide uppercase">
            {quizTitle}
          </h1>
          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-12">
            <ProgressRing value={result.score} size={150} stroke={10} color="var(--ember)">
              <span className="font-display text-4xl font-semibold">{formatScorePct(result.score)}</span>
              <span className="block font-mono text-[10px] tracking-widest text-muted-foreground">
                {result.correct_count}/{result.total_questions} correct
              </span>
            </ProgressRing>
            <div className="text-left">
              {result.xp_earned > 0 ? (
                <XPBadge xp={result.xp_earned} pulse />
              ) : null}
              <p className="mt-4 eyebrow">Result</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-wide uppercase">
                {result.passed ? "Passed" : "Not passed"}
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {formatDate(result.completed_at)}
              </p>
            </div>
          </div>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#review"
              className="inline-flex min-h-12 items-center rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              Review answers
            </a>
            <Link
              to={categorySlug ? `/categories/${categorySlug}` : "/categories"}
              className="glow-ember inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
            >
              Continue expedition →
            </Link>
            <Link
              to="/community"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              <MessageSquare className="size-4" /> Discuss this field test
            </Link>
          </div>
        </div>
      </section>

      {/* Achievement reveal (server list diff — see QuizPage).
          role="status": the reveal lands asynchronously AFTER the result
          (refetch), so it needs its own live announcement. */}
      {newAchievements.length > 0 ? (
        <section
          aria-labelledby="achievement-heading"
          className="rise mt-10"
          role="status"
        >
          <SectionHeader
            eyebrow="Rewards"
            title={newAchievements.length === 1 ? "New achievement" : "New achievements"}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {newAchievements.map((a) => (
              <div key={a.achievement_key} className="panel-2 flex items-center gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-lg"
                >
                  {a.icon || <Trophy aria-hidden="true" className="size-5 text-primary" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-wide uppercase">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Per-question review (server correctness + explanations) */}
      <section id="review" className="mt-10 scroll-mt-36">
        <SectionHeader eyebrow="Review" title="Field Test Answers" />
        <ul className="grid gap-3">
          {result.results.map((r, i) => (
            <li key={r.question_id}>
              <article className="panel p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                    Question {i + 1}
                  </p>
                  {r.is_correct ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-[color:var(--success)] uppercase">
                      <Check className="size-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-destructive uppercase">
                      <X className="size-3.5" /> Incorrect
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm">
                  Your answer: <strong>{r.user_answer}</strong>
                  {!r.is_correct ? (
                    <span>
                      {" "}· Correct answer: <strong>{r.correct_answer}</strong>
                    </span>
                  ) : null}
                </p>
                {r.explanation ? (
                  <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
                    {r.explanation}
                  </p>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* LO performance (server value only) */}
      {result.lo_performance.length > 0 ? (
        <section className="mt-10">
          <SectionHeader
            eyebrow="Objectives"
            title="Learning Objective Performance"
            description="Scored on the server. This view renders the authoritative result."
          />
          <div className="panel divide-y divide-border">
            {result.lo_performance.map((lo) => (
              <div key={lo.lo_global_id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                <p className="min-w-0 text-sm">{lo.lo_label}</p>
                <div className="flex items-center gap-3">
                  <ProgressBar value={lo.pct} label={lo.lo_label} />
                  <span className="w-10 shrink-0 text-right font-mono text-xs">{lo.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Next actions */}
      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="glow-ember inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
        >
          <RotateCcw className="size-4" /> Retry Quiz
        </button>
        <Link
          to={`/modules/${moduleId}`}
          className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
        >
          <Target className="size-4" /> Back to Module
        </Link>
        <Link
          to={`/modules/${moduleId}/lesson`}
          className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
        >
          <BookOpen className="size-4" /> Review the Lesson
        </Link>
      </div>
    </div>
  );
}
