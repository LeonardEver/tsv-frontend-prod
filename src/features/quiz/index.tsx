/**
 * Quiz experience (Phase 13, restyled Phase 23) — server-authoritative
 * learning transaction. The Lovable field-test visual structure sits on
 * top of the UNCHANGED production session machinery (useQuizSession
 * state machine, idempotency keys, draft persistence, 409 recovery).
 *
 * The frontend orchestrates; the backend decides. Correct answers never
 * exist in client state before submission; the result screen renders
 * ONLY the authoritative submission payload.
 *
 * PRODUCT RULE (DEC-022): the Quiz is reachable without completing the
 * Lesson — this route has no lesson guard and never will.
 */
import { useRef } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, LockKeyhole } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { queryKeys } from "@/lib/api/keys";
import { catColorForCode } from "@/lib/category-visuals";
import { formatScorePct, formatDate } from "@/lib/format/format";
import { Chip, Eyebrow, EmptyState, ProgressBar } from "@/components/sa/primitives";
import { ErrorState } from "@/components/shared/ErrorState";
import type { AchievementsResponse, QuizResponse } from "@/lib/api/types";
import { fetchModule } from "@/features/modules/modules.api";
import { fetchAchievements } from "@/features/gamification/gamification.api";
import { fetchModuleProgress } from "@/features/progress/progress.api";
import { fetchSubscription } from "@/features/plans/plans.api";
import { fetchQuiz } from "./quiz.api";
import { useQuizSession } from "./useQuizSession";
import { QuestionCard } from "./QuestionCard";
import { QuizResultView } from "./QuizResultView";

export default function QuizPage() {
  const { moduleId = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const moduleQuery = useQuery({
    queryKey: queryKeys.content.module(moduleId),
    queryFn: () => fetchModule(moduleId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const quizId = moduleQuery.data?.quiz?.quiz_id;

  const quizQuery = useQuery({
    queryKey: quizId ? queryKeys.content.quiz(quizId) : ["quizzes", "pending"],
    queryFn: () => fetchQuiz(quizId as string),
    staleTime: 5 * 60_000,
    retry: false,
  });

  // ── Phase 21 §5 — quiz-before-lesson entitlement (presentation only;
  // the backend refuses attempt creation regardless). Free plan: the
  // module's lesson must be completed before the field test unlocks.
  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(user?.user_id ?? 0),
    queryFn: fetchSubscription,
    staleTime: 60_000,
  });
  const moduleProgressQuery = useQuery({
    queryKey: queryKeys.learning.moduleProgress(moduleId),
    queryFn: () => fetchModuleProgress(moduleId),
    staleTime: 30_000,
  });
  const quizBeforeLesson =
    subscriptionQuery.data?.entitlements.quiz_before_lesson !== false;
  const lessonCompleted = moduleProgressQuery.data?.lesson_completed === true;
  const quizLocked =
    subscriptionQuery.data !== undefined &&
    !quizBeforeLesson &&
    moduleProgressQuery.data !== undefined &&
    !lessonCompleted;

  // ── Achievement reveal support ──
  // Snapshot the authoritative earned list BEFORE the attempt; after
  // submission the invalidated refetch may contain new achievements and
  // the difference is what the result screen reveals. If the snapshot
  // never materialized (slow/errored query), no reveal is attempted —
  // nothing is fabricated.
  const achievementsQuery = useQuery({
    queryKey: queryKeys.gamification.achievements,
    queryFn: fetchAchievements,
    staleTime: 30_000,
  });
  const earnedBeforeRef = useRef<Set<string> | null>(null);
  if (earnedBeforeRef.current === null && achievementsQuery.data) {
    earnedBeforeRef.current = new Set(
      achievementsQuery.data.earned.map((a) => a.achievement_key),
    );
  }

  // Loading gate: a query is only "pending" when it has NO data yet.
  // After a submission the page invalidates several queries — a refetch
  // must never unmount the session (which would lose the authoritative
  // result), so queries that already resolved keep rendering while
  // they refetch.
  if (
    moduleQuery.isPending ||
    (moduleQuery.data && quizQuery.isPending) ||
    (subscriptionQuery.data === undefined && subscriptionQuery.isPending && !quizLocked) ||
    (moduleProgressQuery.data === undefined && moduleProgressQuery.isPending && !quizLocked)
  ) {
    return (
      <div role="status" aria-label="Loading quiz" className="space-y-6">
        <div className="panel h-16 animate-pulse" aria-hidden="true" />
        <div className="panel h-96 animate-pulse" aria-hidden="true" />
      </div>
    );
  }
  if (moduleQuery.isError) {
    return <ErrorState error={moduleQuery.error} onRetry={() => void moduleQuery.refetch()} />;
  }
  if (!quizId) {
    return (
      <EmptyState
        title="This quiz isn't available"
        description="This module has no quiz content yet."
        action={
          <Link
            to={`/modules/${moduleId}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to module
          </Link>
        }
      />
    );
  }
  if (quizQuery.isError) {
    return <ErrorState error={quizQuery.error} onRetry={() => void quizQuery.refetch()} />;
  }
  const quiz = quizQuery.data;
  if (!quiz) {
    return (
      <div role="status" aria-label="Loading quiz" className="space-y-6">
        <div className="panel h-96 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  if (quizLocked) {
    return <QuizLocked moduleId={moduleId} quizTitle={quiz.title} />;
  }

  return (
    <QuizSessionScreen
      moduleId={moduleId}
      quiz={quiz}
      userId={user?.user_id ?? 0}
      quizBeforeLesson={quizBeforeLesson}
      categorySlug={moduleQuery.data.category}
      onSubmitted={() => {
        // Targeted invalidation: quiz (attempt history), module detail,
        // progress, gamification summary + achievements (the reveal
        // diff) — nothing else.
        void queryClient.invalidateQueries({ queryKey: queryKeys.content.quiz(quiz.quiz_id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.content.module(moduleId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.learning.progress });
        void queryClient.invalidateQueries({ queryKey: queryKeys.gamification.summary });
        void queryClient.invalidateQueries({ queryKey: queryKeys.gamification.achievements });
      }}
      newAchievements={
        achievementsQuery.data && earnedBeforeRef.current
          ? achievementsQuery.data.earned.filter(
              (a) => !earnedBeforeRef.current?.has(a.achievement_key),
            )
          : []
      }
    />
  );
}

function QuizSessionScreen({
  moduleId,
  quiz,
  userId,
  quizBeforeLesson,
  categorySlug,
  onSubmitted,
  newAchievements,
}: {
  moduleId: string;
  quiz: QuizResponse;
  userId: number;
  /** False = Free plan: the intro explains the lesson-first rule. */
  quizBeforeLesson: boolean;
  categorySlug?: string;
  onSubmitted: () => void;
  newAchievements: QuizResultViewNewAchievements;
}) {
  const session = useQuizSession(quiz, userId, onSubmitted);
  const color = catColorForCode(categorySlug);
  const title = quiz.title;

  // ── Route-level states ──
  if (session.state.name === "loading") {
    return (
      <div role="status" aria-label="Loading quiz" className="space-y-6">
        <div className="panel h-96 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  if (session.state.name === "error") {
    const err = session.state.error;
    return <ErrorState error={err} onRetry={session.retryCreation} />;
  }

  if (session.state.name === "ready" || session.state.name === "creating") {
    return (
      <QuizIntro
        moduleId={moduleId}
        quiz={quiz}
        color={color}
        creating={session.state.name === "creating"}
        quizBeforeLesson={quizBeforeLesson}
        onStart={session.startAttempt}
      />
    );
  }

  if (session.state.name === "recover") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="panel space-y-4 p-6">
          <Eyebrow>Field test</Eyebrow>
          <h2 className="text-xl font-semibold tracking-wide uppercase">
            Continue previous attempt?
          </h2>
          <p className="text-sm text-muted-foreground">
            You have saved answers from a previous session. Continue where you
            left off, or start a new attempt.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={session.continueDraft}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={session.discardDraft}
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold uppercase transition-colors hover:bg-accent"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (session.state.name === "result") {
    const previous = session.state.result;
    return (
      <QuizResultView
        moduleId={moduleId}
        quizTitle={title}
        categorySlug={categorySlug}
        result={previous}
        onRetry={session.reset}
        newAchievements={newAchievements}
      />
    );
  }

  // active / submitting
  const questions = quiz.questions;
  const current = questions[session.currentQuestionIndex];
  const total = questions.length;

  return (
    <div className="mx-auto max-w-3xl pb-24 lg:pb-0">
      <header className="rise mb-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <Eyebrow>Field Test</Eyebrow>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-wide uppercase">
              {title}
            </h1>
          </div>
          <Chip color={color}>
            Question {session.currentQuestionIndex + 1} of {total}
          </Chip>
        </div>
        <ProgressBar
          className="mt-5"
          value={((session.currentQuestionIndex + 1) / total) * 100}
          color={color}
          label="Field test progress"
        />
      </header>

      {current ? (
        <QuestionCard
          question={current}
          selected={session.answers[current.question_id]}
          onSelect={session.selectAnswer}
          index={session.currentQuestionIndex}
          total={total}
          questionIds={questions.map((q) => q.question_id)}
          answeredQuestionIds={new Set(Object.keys(session.answers))}
          onPrevious={session.previousQuestion}
          onNext={session.nextQuestion}
          onGoTo={session.goToQuestion}
          canGoPrevious={session.currentQuestionIndex > 0}
          canGoNext={session.currentQuestionIndex < total - 1}
          submitting={session.state.name === "submitting"}
          onSubmit={session.submit}
          submissionError={session.submissionError}
          onRetrySubmission={session.retrySubmission}
          color={color}
        />
      ) : null}
    </div>
  );
}

function QuizIntro({
  moduleId,
  quiz,
  color,
  creating,
  quizBeforeLesson,
  onStart,
}: {
  moduleId: string;
  quiz: QuizResponse;
  color: string;
  creating: boolean;
  quizBeforeLesson: boolean;
  onStart: () => void;
}) {
  const attempts = quiz.previous_attempts;
  const best = attempts.reduce<number | null>(
    (acc, a) => (a.score !== null && (acc === null || a.score > acc) ? a.score : acc),
    null,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to={`/modules/${moduleId}`} className="text-muted-foreground hover:text-foreground">
          ← Back to module
        </Link>
      </nav>

      <header className="rise mb-8">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
          >
            <Brain className="size-6" />
          </span>
          <div>
            <Eyebrow>Field test</Eyebrow>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-wide uppercase">
              {quiz.title}
            </h1>
          </div>
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {quiz.question_count} question{quiz.question_count === 1 ? "" : "s"} · no time limit
        </p>
      </header>

      {attempts.length > 0 ? (
        <section aria-labelledby="history-heading" className="mb-6">
          <h2 id="history-heading" className="mb-3 text-xl font-semibold tracking-wide uppercase">
            Previous attempts
          </h2>
          <div className="panel divide-y divide-border">
            <p className="flex items-center justify-between p-4 text-sm">
              <span className="text-muted-foreground">Best score</span>
              <span className="font-mono">{best !== null ? formatScorePct(best) : "—"}</span>
            </p>
            {attempts.slice(0, 3).map((a) => (
              <div key={a.attempt_id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-muted-foreground">{formatDate(a.attempted_at)}</span>
                <span className="inline-flex items-center gap-3">
                  <span className="font-mono">{a.score !== null ? formatScorePct(a.score) : "—"}</span>
                  {a.passed === true ? (
                    <Chip color="var(--success)">Passed</Chip>
                  ) : a.passed === false ? (
                    <Chip color="var(--destructive)">Failed</Chip>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="panel space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          {quizBeforeLesson
            ? "Test yourself now — a fresh attempt starts when you begin."
            : "Field test unlocked — test yourself with the quiz to earn XP."}
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={creating}
          className="glow-ember inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {creating ? "Starting…" : "Start Field Test →"}
        </button>
      </div>
    </div>
  );
}

/**
 * QuizLocked (Phase 21 §5) — the Free-plan gate. The backend refuses the
 * attempt too; this communicates the rule clearly and offers the two
 * honest paths: complete the lesson, or upgrade.
 */
function QuizLocked({
  moduleId,
  quizTitle,
}: {
  moduleId: string;
  quizTitle: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to={`/modules/${moduleId}`} className="text-muted-foreground hover:text-foreground">
          ← Back to module
        </Link>
      </nav>

      <div className="panel grain relative overflow-hidden px-6 py-16 text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 320px at 50% 0%, color-mix(in oklab, var(--ember) 14%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-md">
          <span
            aria-hidden="true"
            className="mx-auto grid size-14 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary"
          >
            <LockKeyhole className="size-6" />
          </span>
          <Eyebrow className="mt-4">Field test · {quizTitle}</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold tracking-wide uppercase">
            Complete the lesson to unlock this field test
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            On the Free plan, lessons come first — finish this module&apos;s
            lesson and the quiz opens. Survivor and Operator members can test
            themselves any time.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to={`/modules/${moduleId}/lesson`}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to the lesson
            </Link>
            <Link
              to="/plans"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold uppercase transition-colors hover:bg-accent"
            >
              See plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

type QuizResultViewNewAchievements = AchievementsResponse["earned"];
