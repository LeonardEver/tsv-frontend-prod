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
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { ErrorState } from "@/components/shared/ErrorState";
import { ContentLanguageNotice } from "@/i18n/ContentLanguageNotice";
import { fetchAttemptResult } from "./quiz.api";
import { Link } from "react-router";
import { BookOpen, Check, MessageSquare, RotateCcw, Target, Trophy, X } from "lucide-react";
import type { AchievementsResponse, QuizSubmissionResponse } from "@/lib/api/types";
import { formatDate, formatScorePct } from "@/lib/format/format";
import { Eyebrow, ProgressBar, ProgressRing, SectionHeader, XPBadge } from "@/components/sa/primitives";
import { moduleImage } from "@/lib/module-visuals";
import styles from "./quiz.module.css";

export function QuizResultView({
  moduleId,
  quizTitle,
  quizId,
  result: suppliedResult,
  onRetry,
  newAchievements = [],
  simplifiedActions,
}: {
  moduleId: string;
  quizTitle: string;
  quizId?: string;
  /** Region link target for "Continue expedition" (module category). */
  categorySlug?: string;
  result: QuizSubmissionResponse;
  onRetry: () => void;
  /** Achievements that appeared in the authoritative list AFTER this
   * attempt (diffed against the pre-submit snapshot in QuizPage) —
   * never computed from client actions. */
  newAchievements?: AchievementsResponse["earned"];
  /**
   * Present ONLY when the attempt was taken inside the Simplified guided
   * experience. The learner must not be dropped into PRO navigation at the
   * end of a guided mission, so this replaces the PRO action set — region
   * page, module page, lesson page, community — with Simplified targets and
   * hides the community link, which is a PRO surface.
   *
   * The caller resolves `next.to` (the Simplified feature owns the
   * progression rule); this view stays presentational. Omitted — as it is for
   * every PRO caller — the render is exactly what it was before.
   */
  simplifiedActions?: {
    /** Primary "what's next" target, already resolved by the caller. */
    next: { to: string; label: string };
    /** The mission just tested. */
    missionId: string;
  };
}) {
  const locale = useInterfaceLocale();
  const resultLocale = suppliedResult.localization?.content_locale ?? "en";
  const matching = resultLocale === locale;
  const localized = useQuery({
    queryKey: quizId ? queryKeys.learning.attempt(quizId, suppliedResult.attempt_id) : ["result", "no-quiz"],
    queryFn: () => fetchAttemptResult(quizId as string, suppliedResult.attempt_id),
    initialData: matching ? suppliedResult : undefined,
    enabled: Boolean(quizId) && !matching,
    staleTime: Infinity,
    retry: false,
  });
  if (quizId && !matching && localized.isError) return <ErrorState error={localized.error} onRetry={() => void localized.refetch()} />;
  if (quizId && !matching && !localized.data) return <div role="status" aria-label={uiText("learning:loading_result_9b5f36")} />;
  // GET replay reports zero newly awarded XP. Changing language only replaces
  // explanations; preserve the original submission receipt and grading values.
  const explanations = new Map(localized.data?.results.map((row) => [row.question_id, row.explanation]));
  const result = localized.data ? { ...suppliedResult, localization: localized.data.localization, results: suppliedResult.results.map((row) => ({ ...row, explanation: explanations.get(row.question_id) ?? null })) } : suppliedResult;
  return (
    <div className="mx-auto max-w-4xl">
      <ContentLanguageNotice data={result} />
      <section className={`rise panel grain relative overflow-hidden p-6 text-center sm:p-12 ${styles.resultHero} ${moduleImage(moduleId) ? styles.withArtwork : ""}`}>
        {moduleImage(moduleId) ? <img className={styles.resultImage} src={moduleImage(moduleId) ?? undefined} alt="" /> : null}
        <div className={styles.resultShade} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 50% 0%, color-mix(in oklab, var(--ember) 18%, transparent), transparent 70%)",
          }}
        />
        <div className="relative">
          <span className={styles.resultMark} data-passed={result.passed} aria-hidden="true">{result.passed ? <Check /> : <Target />}</span>
          <Eyebrow>{uiText("learning:field_test_complete_f6ccae")}</Eyebrow>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-wide uppercase">
            {quizTitle}
          </h1>
          <div className={`mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-12 ${styles.resultData}`}>
            <ProgressRing value={result.score} size={120} stroke={8} color={result.passed ? "var(--success)" : "var(--ember)"}>
              <span className="font-display text-4xl font-semibold">{formatScorePct(result.score)}</span>
              <span className="block font-mono text-[10px] tracking-widest text-muted-foreground">{uiText("learning:value_value_correct_9fb96b", { value0: uiValue(result.correct_count), value1: uiValue(result.total_questions) })}</span>
            </ProgressRing>
            <div className="text-left">
              {result.xp_earned > 0 ? (
                <XPBadge xp={result.xp_earned} pulse />
              ) : null}
              <p className="mt-4 eyebrow">{uiText("learning:result_5faa59")}</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-wide uppercase">
                {result.passed ? uiText("learning:passed_271d60") : uiText("learning:not_passed_e4a3af")}
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {formatDate(result.completed_at)}
              </p>
            </div>
          </div>
          <div className={`mt-9 flex flex-wrap justify-center gap-3 ${styles.resultActions}`}>
            <a
              href="#review"
              className="inline-flex min-h-12 items-center rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >{uiText("learning:review_answers_600174")}</a>
            {simplifiedActions ? (
              <Link
                to={simplifiedActions.next.to}
                className="glow-ember inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
              >
                {simplifiedActions.next.label} →
              </Link>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="glow-ember inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
                >{uiText("learning:continue_expedition_d75bc1")}</Link>
                <Link
                  to="/community"
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
                >
                  <MessageSquare className="size-4" />{" "}{uiText("learning:discuss_this_field_test_69ab70")}</Link>
              </>
            )}
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
            eyebrow={uiText("learning:rewards_2f4f4b")}
            title={newAchievements.length === 1 ? uiText("learning:new_achievement_bf3e73") : uiText("learning:new_achievements_6489a6")}
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
        <SectionHeader eyebrow={uiText("learning:review_e29a79")} title={uiText("learning:field_test_answers_e37960")} />
        <ul className="grid gap-3">
          {result.results.map((r, i) => (
            <li key={r.question_id}>
              <article className="panel p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{uiText("learning:question_value_959992", { value0: uiValue(i + 1) })}</p>
                  {r.is_correct ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-[color:var(--success)] uppercase">
                      <Check className="size-3.5" />{" "}{uiText("learning:correct_48e09e")}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-destructive uppercase">
                      <X className="size-3.5" />{" "}{uiText("learning:incorrect_78318e")}</span>
                  )}
                </div>
                <p className="mt-2 text-sm">{uiText("learning:your_answer_564615")}{" "}<strong>{r.user_answer}</strong>
                  {!r.is_correct ? (
                    <span>
                      {" "}{uiText("learning:correct_answer_90ef90")}{" "}<strong>{r.correct_answer}</strong>
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
            eyebrow={uiText("learning:objectives_24d505")}
            title={uiText("learning:learning_objective_performance_bde6ff")}
            description={uiText("learning:see_the_skills_you_ve_mastered_and_13a2a6")}
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
          <RotateCcw className="size-4" />{" "}{uiText("learning:retry_quiz_1a071c")}</button>
        {simplifiedActions ? (
          <>
            <Link
              to={`/simplified/missions/${simplifiedActions.missionId}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              <Target className="size-4" />{" "}{uiText("learning:back_to_mission_fe992a")}</Link>
            <Link
              to="/simplified"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              <BookOpen className="size-4" />{" "}{uiText("learning:expedition_path_abbfe2")}</Link>
          </>
        ) : (
          <>
            <Link
              to={`/modules/${moduleId}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              <Target className="size-4" />{" "}{uiText("learning:back_to_module_2ad80b")}</Link>
            <Link
              to={`/modules/${moduleId}/lesson`}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              <BookOpen className="size-4" />{" "}{uiText("learning:review_the_lesson_58ca2d")}</Link>
          </>
        )}
      </div>
    </div>
  );
}
