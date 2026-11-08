/**
 * Lesson experience — Field Manual (Phase 23). The Lovable reference
 * `src/routes/learn.$category.$module.lesson.tsx` is the visual source of
 * truth: three-column layout (section navigator / editorial article /
 * meta rail), category-colored accents, completion card with the reward
 * moment, mobile section rail.
 *
 * Every production behavior is preserved:
 * - Content renders exclusively through the MarkdownContent security
 *   boundary (no rehype-raw, scheme allowlist, rel enforcement).
 * - Learning Objectives are INFORMATIONAL (no LO completion invented).
 * - `last_position` is server-persisted (sent at completion, restored
 *   once on load) — the frontend only presents it.
 * - Daily lesson quota is SERVER-authoritative: the
 *   DAILY_LESSON_LIMIT_REACHED error renders with reset/upgrade copy.
 * - Quiz CTA copy varies with the plan; the backend enforces regardless.
 * - "Discuss this lesson" links to the matching Community topic.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { ContentLanguageNotice } from "@/i18n/ContentLanguageNotice";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { clsx } from "clsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, FileText, LockKeyhole } from "lucide-react";
import { allLocales, queryKeys } from "@/lib/api/keys";
import { ApiError } from "@/lib/api/errors";
import { describeError } from "@/lib/api/error-map";
import { catColorForCode, codeFromSlug } from "@/lib/category-visuals";
import { moduleImage } from "@/lib/module-visuals";
import { formatDifficulty } from "@/lib/format/format";
import { Chip, Eyebrow, ProgressBar } from "@/components/sa/primitives";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { useUiStore } from "@/stores/ui-store";
import { analytics } from "@/lib/analytics/events";
import type { LessonResponse, ModuleDetailResponse } from "@/lib/api/types";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { fetchModule } from "@/features/modules/modules.api";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchUsage } from "@/features/plans/plans.api";
import { communityTopicForCategory } from "@/features/community/topic-map";
import { useFieldTestGate } from "@/features/quiz/use-field-test-gate";
import { completeLesson, fetchLesson } from "./lesson.api";
import styles from "./lesson.module.css";

export default function LessonPage() {
  useInterfaceLocale();
  const { moduleId = "" } = useParams();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  // Module context (cached from ModuleDetail navigation; provides the
  // lesson_id the lesson endpoint is keyed by).
  const moduleQuery = useQuery<ModuleDetailResponse | undefined>({
    queryKey: queryKeys.content.module(moduleId),
    queryFn: () => fetchModule(moduleId),
    placeholderData: (previous) => previous?.module_id === moduleId ? previous : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const lessonId = moduleQuery.data?.lesson?.lesson_id;

  const lessonQuery = useQuery<LessonResponse | undefined>({
    queryKey: lessonId ? queryKeys.content.lesson(lessonId) : ["lessons", "pending"],
    queryFn: () => fetchLesson(lessonId as string),
    placeholderData: (previous) => previous?.lesson_id === lessonId ? previous : undefined,
    enabled: Boolean(lessonId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });
  const categoryRow = categoriesQuery.data?.categories.find(
    (c) => c.slug === moduleQuery.data?.category,
  );
  const categoryTitle = categoryRow?.title ?? uiText("learning:region_0f2171");
  const categoryCode = categoryRow?.code ?? codeFromSlug(moduleQuery.data?.category) ?? "";
  const color = catColorForCode(categoryCode);

  // Phase 21 §5 — the quiz CTA copy varies with the plan; the backend
  // enforces the rule regardless of what renders here.
  const userId = useCurrentUserId();
  // Phase 21 §5 — the SAME gate the quiz page enforces, so this CTA can
  // never offer an attempt the quiz page would refuse: paid plans open the
  // field test any time, the Free plan requires this module's lesson.
  const gate = useFieldTestGate(moduleId);

  const usageQuery = useQuery({
    queryKey: queryKeys.plans.usage(userId),
    queryFn: fetchUsage,
    enabled: userId > 0,
  });

  const completionMutation = useMutation({
    mutationFn: () =>
      completeLesson({
        lessonId: lessonId as string,
        lastPosition: Math.round(window.scrollY),
      }),
    onSuccess: () => {
      // Targeted invalidation (spec §16): lesson + module + progress +
      // gamification summary (completion awards XP backend-side) + the
      // quiz gate's module progress + today's usage. NOT categories.
      void queryClient.invalidateQueries({ queryKey: ["lessons", lessonId] });
      void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.module(moduleId)) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.learning.progress });
      void queryClient.invalidateQueries({ queryKey: queryKeys.learning.moduleProgress(moduleId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.gamification.summary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.usage(userId) });
    },
    onError: (err) => {
      // Phase 21 §4/§15: quota denial carries the honest reset/upgrade
      // copy; everything else keeps the generic retry message.
      if (err instanceof ApiError && err.code === "DAILY_LESSON_LIMIT_REACHED") {
        pushToast({
          tone: "error",
          get title() { return uiText("learning:daily_lesson_limit_reached_f7a955"); },
          get description() { return uiText("learning:your_limit_resets_tomorrow_upgrade_to_survivor_514a6d"); },
        });
        return;
      }
      pushToast({
        tone: "error",
        get title() { return uiText("learning:couldn_t_save_your_completion_7c723c"); },
        get description() { return uiText("learning:please_try_again_83a6fd"); },
      });
    },
  });

  const sections = useMemo(() => lessonQuery.data?.sections ?? [], [lessonQuery.data]);
  const completed = lessonQuery.data?.progress.completed === true;
  const [activeSection, setActiveSection] = useState(0);

  // Product analytics only (learning events remain backend-owned).
  useEffect(() => {
    const lesson = lessonQuery.data;
    if (lesson) {
      analytics.track({
        name: "lesson_viewed",
        properties: { lesson_id: lesson.lesson_id, module_id: lesson.module_id },
      });
    }
  }, [lessonQuery.data]);

  // Server-persisted last position restore (pixels; restored once when
  // the lesson first arrives). No local persistence is invented.
  const restoredRef = useRef(false);
  useEffect(() => {
    const lesson = lessonQuery.data;
    if (lesson && !restoredRef.current) {
      restoredRef.current = true;
      const pos = lesson.progress.last_position;
      if (typeof pos === "number" && pos > 0) {
        requestAnimationFrame(() => { window.scrollTo({ top: pos }); });
      }
    }
  }, [lessonQuery.data]);

  const learningObjectives = useMemo(
    () => sections.find((s) => s.type === "learning_objectives")?.items ?? [],
    [sections],
  );
  const contentSections = useMemo(
    () => sections.filter((s) => s.type !== "learning_objectives"),
    [sections],
  );
  // Index-derived anchors, stable per content version. The objectives
  // panel (when present) anchors at 0; content sections follow — never
  // assume the objectives section exists first.
  const objectivesAnchor = "lesson-objectives";
  const contentAnchors = useMemo(
    () => contentSections.map((_, i) => `lesson-section-${i}`),
    [contentSections],
  );

  if (moduleQuery.isPending || (moduleQuery.data && lessonQuery.isPending)) {
    return (
      <div role="status" aria-label={uiText("learning:loading_lesson_d81134")} className="space-y-6">
        <div className="panel h-64 animate-pulse" aria-hidden="true" />
        <div className="panel h-96 animate-pulse" aria-hidden="true" />
      </div>
    );
  }
  if (moduleQuery.isError) {
    return (
      <ErrorState error={moduleQuery.error} onRetry={() => void moduleQuery.refetch()} />
    );
  }
  if (!lessonId) {
    return (
      <EmptyState
        title={uiText("learning:this_lesson_isn_t_available_caeeb1")}
        description={uiText("learning:this_module_has_no_lesson_content_yet_2a6554")}
        action={
          <Link
            to={`/modules/${moduleId}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >{uiText("learning:back_to_module_e2d3bf")}</Link>
        }
      />
    );
  }
  if (lessonQuery.isError) {
    return <ErrorState error={lessonQuery.error} onRetry={() => void lessonQuery.refetch()} />;
  }

  const lesson = lessonQuery.data;
  const mod = moduleQuery.data;
  if (!lesson || !mod) return null;

  const readingPct =
    contentSections.length > 0
      ? Math.round(((activeSection + 1) / contentSections.length) * 100)
      : 0;

  return (
    <div className={styles.lesson}>
      <ContentLanguageNotice data={lesson} />
      <nav aria-label={uiText("learning:breadcrumb_c766e6")} className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to={`/modules/${mod.module_id}`} className="text-muted-foreground hover:text-foreground">
          ← {mod.title}
        </Link>
      </nav>

      <div className="grid gap-8 xl:grid-cols-[200px_minmax(0,1fr)_240px]">
        {/* Section navigator (desktop) */}
        <nav aria-label={uiText("learning:lesson_sections_d4357c")} className="hidden xl:block">
          <div className="sticky top-28">
            <Eyebrow>{uiText("learning:sections_7ff5a6")}</Eyebrow>
            <ul className="mt-3 grid gap-1 border-l border-border">
              {learningObjectives.length > 0 && (
                <li>
                  <a
                    href={`#${objectivesAnchor}`}
                    onClick={() => { setActiveSection(0); }}
                    className={clsx(
                      "-ml-px block border-l-2 py-1.5 pl-3 text-sm",
                      activeSection === 0
                        ? "border-current font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                    style={activeSection === 0 ? { borderColor: color, color } : undefined}
                  >{uiText("learning:learning_objectives_1394be")}</a>
                </li>
              )}
              {contentSections.map((section, i) => {
                const active = activeSection === (learningObjectives.length > 0 ? i + 1 : i);
                return (
                  <li key={contentAnchors[i]}>
                    <a
                      href={`#${contentAnchors[i]}`}
                      onClick={() => { setActiveSection(learningObjectives.length > 0 ? i + 1 : i); }}
                      className={clsx(
                        "-ml-px block border-l-2 py-1.5 pl-3 text-sm",
                        active
                          ? "border-current font-medium"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                      style={active ? { borderColor: color, color } : undefined}
                    >
                      {section.heading}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Content */}
        <article className="min-w-0 max-w-[68ch]">
          <Eyebrow>{uiText("learning:field_manual_value_e158ce", { value0: uiValue(categoryTitle) })}</Eyebrow>
          <h1 className="page-title mt-2 font-display text-4xl leading-none font-semibold tracking-wide uppercase sm:text-5xl">
            {lesson.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip color={color}>{formatDifficulty(mod.difficulty)}</Chip>
            {lesson.estimated_minutes ? (
              <Chip>
                <Clock className="size-3" /> {lesson.estimated_minutes}{" "}{uiText("learning:min_b6c935")}</Chip>
            ) : null}
          </div>

          {moduleImage(mod.module_id) ? (
            <img
              src={moduleImage(mod.module_id) ?? undefined}
              alt=""
              width={1200}
              height={750}
              className="mt-6 aspect-[16/9] w-full rounded-xl object-cover"
            />
          ) : null}

        {/* Mobile section rail */}
        <nav
          aria-label={uiText("learning:lesson_sections_d4357c")}
          className={styles.mobileSections}
        >
          <ul className="flex gap-2">
            {learningObjectives.length > 0 && (
              <li>
                <a
                  href={`#${objectivesAnchor}`}
                  onClick={() => { setActiveSection(0); }}
                  className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                >{uiText("learning:learning_objectives_1394be")}</a>
              </li>
            )}
            {contentSections.map((section, i) => (
              <li key={contentAnchors[i]}>
                <a
                  href={`#${contentAnchors[i]}`}
                  onClick={() => { setActiveSection(learningObjectives.length > 0 ? i + 1 : i); }}
                  className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

          {/* Learning Objectives (informational only) */}
          {learningObjectives.length > 0 ? (
            <section
              id={objectivesAnchor}
              aria-labelledby="lo-heading"
              className="panel-2 mt-6 scroll-mt-36 p-5"
            >
              <h2 id="lo-heading" className="eyebrow">{uiText("learning:learning_objectives_554699")}</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {learningObjectives.map((lo) => (
                  <li key={lo.lo_global_id} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color }} />
                    <span>{lo.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Sections — content renders exclusively through the
              MarkdownContent security boundary. */}
          {contentSections.map((section, i) => (
            <section
              key={contentAnchors[i]}
              id={contentAnchors[i]}
              aria-labelledby={`${contentAnchors[i]}-heading`}
              className="scroll-mt-36"
            >
              <h2
                id={`${contentAnchors[i]}-heading`}
                className="mt-10 text-2xl font-semibold tracking-wide uppercase"
              >
                {section.heading}
              </h2>
              <div className="mt-3 text-[16.5px] leading-[1.75] text-foreground/90">
                <MarkdownContent content={section.content} />
              </div>
            </section>
          ))}

          {/* Progression — the lesson step, then the field test, in the
              order they are meant to be taken. */}
          <section className="panel mt-12 p-6 text-center">
            {!completed ? (
              <>
                <Eyebrow>{uiText("learning:put_your_knowledge_to_work_f23545")}</Eyebrow>
                <p className="mt-2 text-sm text-muted-foreground">{uiText("learning:mark_this_field_manual_as_read_to_a1e41a")}</p>
                <button
                  type="button"
                  disabled={completionMutation.isPending}
                  aria-busy={completionMutation.isPending}
                  onClick={() => { completionMutation.mutate(); }}
                  className="glow-ember mt-5 inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {completionMutation.isPending ? uiText("learning:saving_56a228") : uiText("learning:complete_lesson_71b3f8")}
                </button>
                {completionMutation.isError ? (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {describeError(completionMutation.error).title}
                    {describeError(completionMutation.error).description
                      ? uiText("learning:value_bb624c", { value0: uiValue(describeError(completionMutation.error).description) })
                      : ""}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="rise">
                <p className="inline-flex items-center gap-2 text-lg font-semibold text-[color:var(--success)]">
                  <Check className="size-5" />{" "}{uiText("learning:lesson_complete_362b59")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{uiText("learning:xp_was_added_to_your_expedition_8ef6d1")}{" "}
                  <Link to="/gamification" className="text-primary hover:underline">{uiText("learning:see_your_rewards_6aa72c")}</Link>
                  .
                </p>
              </div>
            )}

            {/* The field test sits directly below the completion action:
                locked and non-clickable until the backend says this
                module's lesson is done (Free plan), open from the start on
                plans that carry the entitlement. */}
            <div className="mt-6 border-t border-border pt-6">
              {gate === "open" ? (
                <Link
                  to={`/modules/${mod.module_id}/quiz`}
                  state={{ startQuiz: true }}
                  className="glow-ember inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
                >{uiText("learning:take_field_test_11b61e")}</Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-surface-2 px-6 text-sm font-semibold tracking-wide text-muted-foreground uppercase opacity-60"
                  >
                    <LockKeyhole className="size-4" aria-hidden="true" />{" "}{uiText("learning:take_field_test_1e927f")}</button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {gate === "checking"
                      ? uiText("learning:checking_your_progress_d99001")
                      : uiText("learning:complete_the_lesson_above_to_unlock_the_45b26c")}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Next actions */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to={`/community?category=${communityTopicForCategory(mod.category)}`}
              className="text-xs font-semibold tracking-wide text-primary uppercase"
            >{uiText("learning:discuss_this_lesson_d3c612")}</Link>
          </div>
        </article>

        {/* Meta rail (desktop) */}
        <aside className="hidden xl:block">
          <div className="sticky top-28 grid gap-4">
            <div className="panel-2 p-4">
              <Eyebrow>{uiText("learning:reading_progress_fafcbb")}</Eyebrow>
              <ProgressBar
                className="mt-3"
                value={completed ? 100 : readingPct}
                color={color}
                label={uiText("learning:reading_progress_fafcbb")}
              />
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {completed
                  ? uiText("learning:100_position_saved_b06e35")
                  : uiText("learning:value_of_value_sections_c39112", { value0: uiValue(readingPct), value1: uiValue(contentSections.length) })}
              </p>
            </div>
            {usageQuery.data ? (
              <div className="panel-2 p-4">
                <Eyebrow>{uiText("learning:today_24345a")}</Eyebrow>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{uiText("learning:lessons_value_value_19e6ab", { value0: uiValue(usageQuery.data.lesson_completions), value1: uiValue(usageQuery.data.limits.daily_lessons === null
                    ? "∞"
                    : usageQuery.data.limits.daily_lessons) })}</p>
                <p className="font-mono text-xs text-muted-foreground">{uiText("learning:field_tests_value_value_a74b1f", { value0: uiValue(usageQuery.data.quiz_attempts), value1: uiValue(usageQuery.data.limits.daily_quizzes === null
                    ? "∞"
                    : usageQuery.data.limits.daily_quizzes) })}</p>
              </div>
            ) : null}
            {mod.resources.length > 0 ? (
              <div className="panel-2 p-4">
                <Eyebrow>{uiText("learning:resources_87df60")}</Eyebrow>
                <ul className="mt-3 grid gap-3">
                  {mod.resources.map((r) => (
                    <li key={r.resource_id} className="text-sm">
                      <Link
                        to={`/resources/${r.resource_id}`}
                        className="flex items-start gap-2 hover:text-primary"
                      >
                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">{r.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
