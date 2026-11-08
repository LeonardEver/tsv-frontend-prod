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
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { ContentLanguageNotice } from "@/i18n/ContentLanguageNotice";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Brain, LockKeyhole, X } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { allLocales, queryKeys } from "@/lib/api/keys";
import { catColorForCode } from "@/lib/category-visuals";
import { formatScorePct, formatDate } from "@/lib/format/format";
import { Chip, Eyebrow, EmptyState } from "@/components/sa/primitives";
import { ErrorState } from "@/components/shared/ErrorState";
import type { AchievementsResponse, QuizResponse } from "@/lib/api/types";
import { fetchModule } from "@/features/modules/modules.api";
import { fetchAchievements } from "@/features/gamification/gamification.api";
import { fetchQuiz } from "./quiz.api";
import { useFieldTestGate } from "./use-field-test-gate";
import { useQuizSession } from "./useQuizSession";
import { QuestionCard } from "./QuestionCard";
import { QuizResultView } from "./QuizResultView";
import styles from "./quiz.module.css";

export default function QuizPage() {
  useInterfaceLocale();
  const { moduleId = "" } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const moduleQuery = useQuery({
    queryKey: queryKeys.content.module(moduleId),
    queryFn: () => fetchModule(moduleId),
    placeholderData: (previous) => previous?.module_id === moduleId ? previous : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const quizId = moduleQuery.data?.quiz?.quiz_id;

  const quizQuery = useQuery({
    queryKey: quizId ? queryKeys.content.quiz(quizId) : ["quizzes", "pending"],
    queryFn: () => fetchQuiz(quizId as string),
    placeholderData: (previous) => previous?.quiz_id === quizId ? previous : undefined,
    enabled: Boolean(quizId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  // ── Phase 21 §5 — quiz-before-lesson gate (presentation only; the
  // backend refuses attempt creation regardless). The rule is shared with
  // the lesson page's CTA so the two cannot disagree.
  // The route's own module id — the gate asks about the module being
  // viewed, not about whatever the detail response happens to contain.
  const gate = useFieldTestGate(moduleId);
  const quizBeforeLesson = gate !== "locked";

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
  // Module failure outranks the gate: with no module resolved the gate can
  // only ever say "checking", and "checking" is not an error state.
  if (moduleQuery.isError) {
    return <ErrorState error={moduleQuery.error} onRetry={() => void moduleQuery.refetch()} />;
  }
  if (moduleQuery.isPending || (quizId && quizQuery.isPending) || gate === "checking") {
    return (
      <div role="status" aria-label={uiText("learning:loading_quiz_b255cc")} className="space-y-6">
        <div className="panel h-16 animate-pulse" aria-hidden="true" />
        <div className="panel h-96 animate-pulse" aria-hidden="true" />
      </div>
    );
  }
  if (!quizId) {
    return (
      <EmptyState
        title={uiText("learning:this_quiz_isn_t_available_c52f93")}
        description={uiText("learning:this_module_has_no_quiz_content_yet_c36415")}
        action={
          <Link
            to={`/modules/${moduleId}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >{uiText("learning:back_to_module_e2d3bf")}</Link>
        }
      />
    );
  }
  if (quizQuery.isError) {
    return <ErrorState error={quizQuery.error} onRetry={() => void quizQuery.refetch()} />;
  }
  // Non-null by construction: the pending branch above covers the only
  // state in which the payload is absent, and an errored query returned
  // earlier.
  const quiz = quizQuery.data;
  if (!quiz) return <div role="status" aria-label={uiText("learning:loading_quiz_b255cc")}>{uiText("learning:preparing_your_questions_11c71c")}</div>;

  if (gate === "locked") {
    return <QuizLocked moduleId={moduleId} quizTitle={quiz.title} />;
  }

  return (
    <>
    <ContentLanguageNotice data={quiz} />
    <QuizSessionScreen
      moduleId={moduleId}
      quiz={quiz}
      userId={user?.user_id ?? 0}
      autoStart={Boolean((location.state as { startQuiz?: boolean } | null)?.startQuiz)}
      quizBeforeLesson={quizBeforeLesson}
      categorySlug={moduleQuery.data.category}
      onSubmitted={() => {
        // Targeted invalidation: quiz (attempt history), module detail,
        // progress, gamification summary + achievements (the reveal
        // diff) — nothing else.
        void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.quiz(quiz.quiz_id)) });
        void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.module(moduleId)) });
        void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.modulesAll) });
        void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.categories) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.learning.progress });
        void queryClient.invalidateQueries({ queryKey: queryKeys.gamification.summary });
        void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.gamification.achievements) });
      }}
      newAchievements={
        achievementsQuery.data && earnedBeforeRef.current
          ? achievementsQuery.data.earned.filter(
              (a) => !earnedBeforeRef.current?.has(a.achievement_key),
            )
          : []
      }
    />
    </>
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
  autoStart,
}: {
  moduleId: string;
  quiz: QuizResponse;
  userId: number;
  /** False = Free plan: the intro explains the lesson-first rule. */
  quizBeforeLesson: boolean;
  categorySlug?: string;
  onSubmitted: () => void;
  newAchievements: QuizResultViewNewAchievements;
  autoStart: boolean;
}) {
  useInterfaceLocale();
  const session = useQuizSession(quiz, userId, onSubmitted);
  const navigate = useNavigate();
  const location = useLocation();
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    if (session.state.name !== "ready" && session.state.name !== "recover") return;
    autoStarted.current = true;
    // Consume the navigation intent once. Keeping it in history would
    // create an unintended new attempt on refresh after a completed test.
    void navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null });
    if (session.state.name === "ready") session.startAttempt();
  }, [autoStart, session, navigate, location.pathname, location.search, location.hash]);
  const color = catColorForCode(categorySlug);
  const title = quiz.title;

  // ── Route-level states ──
  if (session.state.name === "loading") {
    return (
      <div role="status" aria-label={uiText("learning:loading_quiz_b255cc")} className="space-y-6">
        <div className="panel h-96 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  if (session.state.name === "error") {
    const err = session.state.error;
    return <ErrorState error={err} onRetry={session.retryCreation} />;
  }

  if (session.state.name === "ready" || session.state.name === "creating") {
    if ((autoStart && !autoStarted.current) || (autoStarted.current && session.state.name === "creating")) {
      return <div className={styles.preparing} role="status">{uiText("learning:preparing_your_field_test_d999d7")}</div>;
    }
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
          <Eyebrow>{uiText("learning:field_test_c7b676")}</Eyebrow>
          <h2 className="text-xl font-semibold tracking-wide uppercase">{uiText("learning:continue_previous_attempt_d686e8")}</h2>
          <p className="text-sm text-muted-foreground">{uiText("learning:you_have_saved_answers_from_a_previous_0d771b")}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={session.continueDraft}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >{uiText("learning:continue_2e0262")}</button>
            <button
              type="button"
              onClick={session.discardDraft}
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold uppercase transition-colors hover:bg-accent"
            >{uiText("learning:start_over_dc3c6d")}</button>
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
    <div className={styles.session}>
      <header className={styles.header}>
        <div className={styles.utilities}>
          <Link to={`/modules/${moduleId}/lesson`} aria-label={uiText("learning:back_to_lesson_656011")}><ArrowLeft size={22} /></Link>
          <span>{uiText("learning:field_test_d43f99")}</span>
          <Link to="/dashboard" aria-label={uiText("learning:exit_field_test_49e5c5")}><X size={23} /></Link>
        </div>
        <div className={styles.segments} role="progressbar" aria-label={uiText("learning:field_test_progress_7e95cf")} aria-valuenow={session.currentQuestionIndex + 1} aria-valuemin={0} aria-valuemax={total}>
          {questions.map((q, index) => <span key={q.question_id} data-filled={index <= session.currentQuestionIndex} />)}
        </div>
        <div className={styles.questionMeta}><span>{uiText("learning:question_value_of_value_55b16a", { value0: uiValue(session.currentQuestionIndex + 1), value1: uiValue(total) })}</span><span>{uiText("learning:value_answered_da643d", { value0: uiValue(session.answeredCount) })}</span></div>
        <h1 className="sr-only">{title}</h1>
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
  useInterfaceLocale();
  const attempts = quiz.previous_attempts;
  const best = attempts.reduce<number | null>(
    (acc, a) => (a.score !== null && (acc === null || a.score > acc) ? a.score : acc),
    null,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label={uiText("learning:breadcrumb_c766e6")} className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to={`/modules/${moduleId}`} className="text-muted-foreground hover:text-foreground">{uiText("learning:back_to_module_c75c75")}</Link>
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
            <Eyebrow>{uiText("learning:field_test_c7b676")}</Eyebrow>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-wide uppercase">
              {quiz.title}
            </h1>
          </div>
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{uiText("learning:noTimeQuestions", { questions: uiText("common:questions", { count: quiz.question_count }) })}</p>
      </header>

      {attempts.length > 0 ? (
        <section aria-labelledby="history-heading" className="mb-6">
          <h2 id="history-heading" className="mb-3 text-xl font-semibold tracking-wide uppercase">{uiText("learning:previous_attempts_ee1b33")}</h2>
          <div className="panel divide-y divide-border">
            <p className="flex items-center justify-between p-4 text-sm">
              <span className="text-muted-foreground">{uiText("learning:best_score_613d6f")}</span>
              <span className="font-mono">{best !== null ? formatScorePct(best) : "—"}</span>
            </p>
            {attempts.slice(0, 3).map((a) => (
              <div key={a.attempt_id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-muted-foreground">{formatDate(a.attempted_at)}</span>
                <span className="inline-flex items-center gap-3">
                  <span className="font-mono">{a.score !== null ? formatScorePct(a.score) : "—"}</span>
                  {a.passed === true ? (
                    <Chip color="var(--success)">{uiText("learning:passed_271d60")}</Chip>
                  ) : a.passed === false ? (
                    <Chip color="var(--destructive)">{uiText("learning:failed_09fef5")}</Chip>
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
            ? uiText("learning:test_yourself_now_a_fresh_attempt_starts_168746")
            : uiText("learning:field_test_unlocked_test_yourself_with_the_0a6550")}
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={creating}
          className="glow-ember inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {creating ? uiText("learning:starting_e5f580") : uiText("learning:start_field_test_e3daa1")}
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
  useInterfaceLocale();
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label={uiText("learning:breadcrumb_c766e6")} className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to={`/modules/${moduleId}`} className="text-muted-foreground hover:text-foreground">{uiText("learning:back_to_module_c75c75")}</Link>
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
          <Eyebrow className="mt-4">{uiText("learning:field_test_value_fe7251", { value0: uiValue(quizTitle) })}</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold tracking-wide uppercase">{uiText("learning:complete_the_lesson_to_unlock_this_field_deebc6")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{uiText("learning:on_the_free_plan_lessons_come_first_38c0b7")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to={`/modules/${moduleId}/lesson`}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >{uiText("learning:go_to_the_lesson_40a017")}</Link>
            <Link
              to="/plans"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold uppercase transition-colors hover:bg-accent"
            >{uiText("learning:see_plans_5942a8")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

type QuizResultViewNewAchievements = AchievementsResponse["earned"];
