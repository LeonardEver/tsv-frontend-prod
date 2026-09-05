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
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { clsx } from "clsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, FileText } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import { ApiError } from "@/lib/api/errors";
import { describeError } from "@/lib/api/error-map";
import { catColorForCode, categoryImage, codeFromSlug } from "@/lib/category-visuals";
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
import { fetchSubscription, fetchUsage } from "@/features/plans/plans.api";
import { communityTopicForCategory } from "@/features/community/topic-map";
import { completeLesson, fetchLesson } from "./lesson.api";

export default function LessonPage() {
  const { moduleId = "" } = useParams();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  // Module context (cached from ModuleDetail navigation; provides the
  // lesson_id the lesson endpoint is keyed by).
  const moduleQuery = useQuery<ModuleDetailResponse | undefined>({
    queryKey: queryKeys.content.module(moduleId),
    queryFn: () => fetchModule(moduleId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const lessonId = moduleQuery.data?.lesson?.lesson_id;

  const lessonQuery = useQuery<LessonResponse | undefined>({
    queryKey: lessonId ? queryKeys.content.lesson(lessonId) : ["lessons", "pending"],
    queryFn: () => fetchLesson(lessonId as string),
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
  const categoryTitle = categoryRow?.title ?? "Region";
  const categoryCode = categoryRow?.code ?? codeFromSlug(moduleQuery.data?.category) ?? "";
  const color = catColorForCode(categoryCode);

  // Phase 21 §5 — the quiz CTA copy varies with the plan; the backend
  // enforces the rule regardless of what renders here.
  const userId = useCurrentUserId();
  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(userId),
    queryFn: fetchSubscription,
    staleTime: 60_000,
    enabled: userId > 0,
  });
  const quizBeforeLesson =
    subscriptionQuery.data?.entitlements.quiz_before_lesson !== false;

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.content.module(moduleId) });
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
          title: "Daily lesson limit reached",
          description: "Your limit resets tomorrow. Upgrade to Survivor for 10 lessons and quizzes per day.",
        });
        return;
      }
      pushToast({
        tone: "error",
        title: "Couldn't save your completion",
        description: "Please try again.",
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
      <div role="status" aria-label="Loading lesson" className="space-y-6">
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
        title="This lesson isn't available"
        description="This module has no lesson content yet."
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
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 font-mono text-[11px] tracking-widest uppercase">
        <Link to={`/modules/${mod.module_id}`} className="text-muted-foreground hover:text-foreground">
          ← {mod.title}
        </Link>
      </nav>

      <div className="grid gap-8 xl:grid-cols-[200px_minmax(0,1fr)_240px]">
        {/* Section navigator (desktop) */}
        <nav aria-label="Lesson sections" className="hidden xl:block">
          <div className="sticky top-28">
            <Eyebrow>Sections</Eyebrow>
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
                  >
                    Learning Objectives
                  </a>
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

        {/* Mobile section rail */}
        <nav
          aria-label="Lesson sections"
          className="sticky top-28 z-30 -mx-4 overflow-x-auto border-y border-border bg-background/95 px-4 py-2 backdrop-blur-md xl:hidden"
        >
          <ul className="flex gap-2">
            {learningObjectives.length > 0 && (
              <li>
                <a
                  href={`#${objectivesAnchor}`}
                  onClick={() => { setActiveSection(0); }}
                  className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Learning Objectives
                </a>
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

        {/* Content */}
        <article className="min-w-0 max-w-[68ch]">
          <Eyebrow>Field Manual · {categoryTitle}</Eyebrow>
          <h1 className="page-title mt-2 font-display text-4xl leading-none font-semibold tracking-wide uppercase sm:text-5xl">
            {lesson.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip color={color}>{formatDifficulty(mod.difficulty)}</Chip>
            {lesson.estimated_minutes ? (
              <Chip>
                <Clock className="size-3" /> {lesson.estimated_minutes} min
              </Chip>
            ) : null}
          </div>

          {categoryImage(categoryCode) ? (
            <img
              src={categoryImage(categoryCode) ?? undefined}
              alt=""
              width={1200}
              height={750}
              className="mt-6 aspect-[16/9] w-full rounded-xl object-cover"
            />
          ) : null}

          {/* Learning Objectives (informational only) */}
          {learningObjectives.length > 0 ? (
            <section
              id={objectivesAnchor}
              aria-labelledby="lo-heading"
              className="panel-2 mt-6 scroll-mt-36 p-5"
            >
              <h2 id="lo-heading" className="eyebrow">
                Learning objectives
              </h2>
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

          {/* Progression */}
          <section className="panel mt-12 p-6 text-center">
            {!completed ? (
              <>
                <Eyebrow>Mission complete</Eyebrow>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mark this field manual as read to record your progress.
                </p>
                <button
                  type="button"
                  disabled={completionMutation.isPending}
                  aria-busy={completionMutation.isPending}
                  onClick={() => { completionMutation.mutate(); }}
                  className="glow-ember mt-5 inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {completionMutation.isPending ? "Saving…" : "Complete lesson"}
                </button>
                {completionMutation.isError ? (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {describeError(completionMutation.error).title}
                    {describeError(completionMutation.error).description
                      ? ` ${describeError(completionMutation.error).description}`
                      : ""}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="rise">
                <p className="inline-flex items-center gap-2 text-lg font-semibold text-[color:var(--success)]">
                  <Check className="size-5" /> Lesson complete
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  XP was added to your expedition —{" "}
                  <Link to="/gamification" className="text-primary hover:underline">
                    see your rewards
                  </Link>
                  .
                </p>
                <Link
                  to={`/modules/${mod.module_id}/quiz`}
                  className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
                >
                  Take field test →
                </Link>
              </div>
            )}
          </section>

          {/* Next actions */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to={`/modules/${mod.module_id}/quiz`}
              className="text-xs font-semibold tracking-wide text-primary uppercase"
            >
              {quizBeforeLesson
                ? "Field tests are always open on your plan →"
                : "Field test unlocked — earn XP →"}
            </Link>
            <Link
              to={`/community?category=${communityTopicForCategory(mod.category)}`}
              className="text-xs font-semibold tracking-wide text-primary uppercase"
            >
              Discuss this lesson →
            </Link>
          </div>
        </article>

        {/* Meta rail (desktop) */}
        <aside className="hidden xl:block">
          <div className="sticky top-28 grid gap-4">
            <div className="panel-2 p-4">
              <Eyebrow>Reading progress</Eyebrow>
              <ProgressBar
                className="mt-3"
                value={completed ? 100 : readingPct}
                color={color}
                label="Reading progress"
              />
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {completed
                  ? "100% · position saved"
                  : `${readingPct}% · of ${contentSections.length} sections`}
              </p>
            </div>
            {usageQuery.data ? (
              <div className="panel-2 p-4">
                <Eyebrow>Today</Eyebrow>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  Lessons {usageQuery.data.lesson_completions}/
                  {usageQuery.data.limits.daily_lessons === null
                    ? "∞"
                    : usageQuery.data.limits.daily_lessons}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Field tests {usageQuery.data.quiz_attempts}/
                  {usageQuery.data.limits.daily_quizzes === null
                    ? "∞"
                    : usageQuery.data.limits.daily_quizzes}
                </p>
              </div>
            ) : null}
            {mod.resources.length > 0 ? (
              <div className="panel-2 p-4">
                <Eyebrow>Resources</Eyebrow>
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
