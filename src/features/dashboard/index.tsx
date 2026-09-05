/**
 * Dashboard — Base Camp (Phase 23). The Lovable reference
 * `src/routes/index.tsx` is the visual source of truth: PageHeader with
 * XP readout, daily-limit tiles, next-mission MissionHero, expedition
 * timeline, Explore Regions, Continue Training, rewards + community
 * columns.
 *
 * ALL values come from authoritative backend state:
 * - next-mission rule: most recent learning event's module (lesson not
 *   done → "Start lesson", lesson done + no attempt → "Take quiz",
 *   attempt exists → "Retake quiz"); new users → first /categories entry;
 *   404 on the module → discovery fallback (documented in Phase 15.5 §3).
 * - progress percentages render verbatim from /modules.
 * - gamification values are never computed client-side.
 * - daily limits come from /usage; the UI is never the authority.
 */
import { Link } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Flame, Lock, Trophy } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { queryKeys } from "@/lib/api/keys";
import { ApiError } from "@/lib/api/errors";
import { formatDifficulty, formatXp } from "@/lib/format/format";
import { catColorForCode, categoryImage, codeFromSlug } from "@/lib/category-visuals";
import {
  CategoryCard,
  CommunityPostCard,
  MissionCard,
  MissionHero,
} from "@/components/sa/cards";
import {
  Chip,
  EmptyState,
  Eyebrow,
  ProgressBar,
  SectionHeader,
  Stat,
} from "@/components/sa/primitives";
import type { MissionCardModel } from "@/components/sa/types";
import { PageHeader } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { fetchGamificationSummary, fetchProgress } from "./dashboard.api";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchAllModules } from "@/features/modules/modules.api";
import { fetchModule } from "@/features/modules/modules.api";
import { fetchUsage, fetchSubscription } from "@/features/plans/plans.api";
import { fetchAchievements } from "@/features/gamification/gamification.api";
import { fetchCommunityPosts, votePost } from "@/features/community/community.api";
import { categoryCardModel } from "@/features/categories/adapters";
import { communityPostModel, missionCardModelFromListRow } from "./adapters";

/** Daily-limit tile — unlimited plans render honestly without a bar. */
function LimitTile({
  label,
  used,
  total,
  barColor,
}: {
  label: string;
  used: number | null;
  total: number | null;
  barColor?: string | undefined;
}) {
  return (
    <div className="panel-2 p-4">
      <Eyebrow>{label}</Eyebrow>
      {total === null ? (
        <>
          <p className="mt-1.5 font-display text-3xl leading-none">Unlimited</p>
          <p className="mt-1 text-xs text-muted-foreground">No daily limit on this plan.</p>
        </>
      ) : (
        <>
          <p className="mt-1.5 font-display text-3xl leading-none">
            {used ?? 0} <span className="text-muted-foreground">/ {total}</span>
          </p>
          <ProgressBar
            className="mt-3"
            value={total > 0 ? ((used ?? 0) / total) * 100 : 0}
            color={barColor}
            label={`${label} used today`}
          />
        </>
      )}
    </div>
  );
}

/** New-user state — no activity is fabricated: the first category in the
 * server's own order is the entry point (Phase 15.5 §3 rule 3). */
function DiscoveryHero({
  firstCategory,
}: {
  firstCategory: ReturnType<typeof categoryCardModel> | undefined;
}) {
  if (!firstCategory) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="Content is on its way — check back soon."
      />
    );
  }
  const color = catColorForCode(firstCategory.code);
  return (
    <article
      className="panel relative overflow-hidden"
      style={{ borderColor: `color-mix(in oklab, ${color} 26%, var(--border))` }}
    >
      {firstCategory.image ? (
        <img
          src={firstCategory.image}
          alt=""
          width={1200}
          height={750}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-linear-to-r from-background via-background/90 to-background/30" />
      <div className="relative grid gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0 max-w-xl">
          <Eyebrow>First mission</Eyebrow>
          <h2 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-wide uppercase sm:text-5xl">
            {firstCategory.name} awaits
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Begin your expedition with your first mission. Every quiz is available any time —
            with or without its lesson.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip color={color}>{firstCategory.name}</Chip>
            <Chip>{firstCategory.missions} missions</Chip>
          </div>
        </div>
        <Link
          to={`/categories/${firstCategory.slug}`}
          className="glow-ember inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
        >
          Explore {firstCategory.name} →
        </Link>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const userId = useCurrentUserId();

  const progressQuery = useQuery({
    queryKey: queryKeys.learning.progress,
    queryFn: fetchProgress,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const gamificationQuery = useQuery({
    queryKey: queryKeys.gamification.summary,
    queryFn: fetchGamificationSummary,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const achievementsQuery = useQuery({
    queryKey: queryKeys.gamification.achievements,
    queryFn: fetchAchievements,
    staleTime: 5 * 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const modulesQuery = useQuery({
    queryKey: queryKeys.content.modulesAll,
    queryFn: fetchAllModules,
    staleTime: 30 * 60_000,
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.plans.usage(userId),
    queryFn: fetchUsage,
    enabled: userId > 0,
  });

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(userId),
    queryFn: fetchSubscription,
    enabled: userId > 0,
  });

  const entitledCommunity = subscriptionQuery.data?.entitlements.community ?? false;
  const postsQuery = useQuery({
    queryKey: queryKeys.community.posts(userId, undefined, "latest"),
    queryFn: () => fetchCommunityPosts({ sort: "latest", limit: 2 }),
    enabled: entitledCommunity && userId > 0,
  });

  const voteMutation = useMutation({
    mutationFn: (postId: number) => votePost(postId),
    onSettled: () => {
      if (userId > 0) {
        void postsQuery.refetch();
      }
    },
  });

  const categoriesBySlug = new Map(
    (categoriesQuery.data?.categories ?? []).map((c) => [c.slug, { code: c.code, title: c.title }]),
  );
  const categoriesByCode = new Map(
    (categoriesQuery.data?.categories ?? []).map((c) => [c.code, c.title]),
  );

  // ── Next mission — deterministic rule (Phase 15.5 §3) ──
  const recent = progressQuery.data?.recent_activity.find((a) => a.module_id);
  const recentModuleQuery = useQuery({
    queryKey: queryKeys.content.module(recent?.module_id ?? ""),
    queryFn: () => fetchModule(recent?.module_id ?? ""),
    staleTime: 5 * 60_000,
    enabled: Boolean(recent?.module_id),
  });

  let nextMission: (MissionCardModel & { ctaLabel: string }) | null = null;
  if (recent?.module_id && recentModuleQuery.data) {
    const detail = recentModuleQuery.data;
    const listRow = modulesQuery.data?.modules.find((m) => m.module_id === detail.module_id);
    const code = categoriesBySlug.get(detail.category)?.code ?? codeFromSlug(detail.category) ?? detail.category;
    const lessonDone = detail.lesson?.completed ?? false;
    const quizAttempted = (detail.quiz?.attempt_count ?? 0) > 0;
    nextMission = {
      moduleId: detail.module_id,
      categoryCode: code,
      subcategory: detail.subcategory ?? "",
      title: detail.title,
      description: detail.description ?? "",
      difficulty: formatDifficulty(detail.difficulty),
      minutes: detail.estimated_duration ?? 0,
      progress: listRow?.progress_pct ?? (detail.progress.completed ? 100 : 0),
      status: detail.progress.completed
        ? "complete"
        : (listRow?.progress_pct ?? 0) > 0
          ? "in-progress"
          : "available",
      image: categoryImage(code),
      to: lessonDone
        ? `/modules/${detail.module_id}/quiz`
        : `/modules/${detail.module_id}/lesson`,
      ctaLabel: lessonDone ? (quizAttempted ? "Retake quiz" : "Take quiz") : "Start lesson",
    };
  }

  const recentGone =
    recentModuleQuery.isError &&
    recentModuleQuery.error instanceof ApiError &&
    recentModuleQuery.error.status === 404;
  // The hero query is enabled only when there IS a recent module; a new
  // user's disabled query stays pending forever, so the discovery branch
  // must not wait on it.
  const heroPending = Boolean(recent?.module_id) && recentModuleQuery.isPending;

  // ── Expedition timeline — recent activity, mapped onto the module
  // inventory (authoritative progress_pct), never fabricated. ──
  const timeline: ReturnType<typeof missionCardModelFromListRow>[] = [];
  if (progressQuery.data && modulesQuery.data) {
    const byId = new Map(modulesQuery.data.modules.map((m) => [m.module_id, m]));
    for (const activity of progressQuery.data.recent_activity) {
      if (!activity.module_id || timeline.some((t) => t.moduleId === activity.module_id)) continue;
      const row = byId.get(activity.module_id);
      if (row) timeline.push(missionCardModelFromListRow(row, categoriesBySlug));
      if (timeline.length >= 5) break;
    }
  }

  // ── Continue Training — modules in progress, excluding the hero. ──
  const inProgress = (modulesQuery.data?.modules ?? []).filter(
    (m) => m.progress_pct > 0 && !m.completed && m.module_id !== recent?.module_id,
  );
  const continueTraining = inProgress.slice(0, 4).map((m) => missionCardModelFromListRow(m, categoriesBySlug));

  const firstName = user?.display_name?.split(" ")[0];
  const statusParts: string[] = [];
  if (progressQuery.data) {
    statusParts.push(`${progressQuery.data.modules_completed} missions complete`);
  }
  if (gamificationQuery.data) {
    statusParts.push(`Level ${gamificationQuery.data.level}`, gamificationQuery.data.level_title);
  }

  const summary = gamificationQuery.data;
  const usage = usageQuery.data;
  const achievements = achievementsQuery.data;

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Base Camp"
        title={firstName ? `Welcome back, ${firstName}` : "Welcome"}
        description={statusParts.length > 0 ? statusParts.join(" · ") : undefined}
        aside={
          summary ? (
            <div>
              <p className="font-display text-2xl font-semibold">{formatXp(summary.total_xp)} XP</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {summary.xp_to_next_level === null
                  ? "Max level reached"
                  : `${summary.xp_to_next_level} XP to Level ${summary.level + 1}`}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-primary">
                <Flame className="size-3.5" /> {summary.current_streak} day streak
              </p>
            </div>
          ) : null
        }
      />

      {/* Daily limits — on mobile the next mission dominates, so the
          limits render below the hero (order restored from sm up). */}
      <section className="mb-10 grid gap-4 sm:grid-cols-3 sm:order-none" aria-label="Daily limits">
        {usage ? (
          <>
            <LimitTile
              label="Today · Lessons"
              used={usage.lesson_completions}
              total={usage.limits.daily_lessons}
            />
            <LimitTile
              label="Today · Field tests"
              used={usage.quiz_attempts}
              total={usage.limits.daily_quizzes}
              barColor="var(--cat-water)"
            />
          </>
        ) : (
          <>
            <div className="panel-2 h-24 animate-pulse" aria-hidden="true" />
            <div className="panel-2 h-24 animate-pulse" aria-hidden="true" />
          </>
        )}
        <div className="panel-2 flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <Eyebrow>Current plan</Eyebrow>
            <p className="mt-1.5 font-display text-2xl leading-none tracking-wide uppercase">
              {usage?.plan_name ?? "…"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {usage
                ? usage.limits.daily_lessons === null
                  ? "Unlimited lessons and field tests per day."
                  : `${usage.limits.daily_lessons} lessons and ${usage.limits.daily_quizzes} field tests per day.`
                : " "}
            </p>
          </div>
          <Link
            to="/plans"
            className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
          >
            Compare
          </Link>
        </div>
      </section>

      {/* Next mission — the dominant action (first on mobile) */}
      <section className="order-first mb-12 sm:order-none">
        {progressQuery.isError ? (
          <ErrorState error={progressQuery.error} onRetry={() => void progressQuery.refetch()} />
        ) : heroPending ? (
          <div className="panel h-64 animate-pulse" aria-hidden="true" />
        ) : recentGone || !nextMission ? (
          <DiscoveryHero
            firstCategory={
              categoriesQuery.data?.categories[0]
                ? categoryCardModel(categoriesQuery.data.categories[0])
                : undefined
            }
          />
        ) : (
          <MissionHero mission={nextMission} ctaLabel={nextMission.ctaLabel} />
        )}
      </section>

      {/* Expedition path */}
      <section className="mb-12">
        <SectionHeader
          eyebrow="Progression"
          title="Your Expedition"
          description="The route you're currently walking."
          action={
            <Link
              to="/progress"
              className="text-xs font-semibold tracking-wide text-primary uppercase"
            >
              Full record →
            </Link>
          }
        />
        {timeline.length > 0 ? (
          <ol className="panel relative grid gap-0 p-2 sm:p-4">
            {timeline.map((m, i) => {
              const color = catColorForCode(m.categoryCode);
              return (
                <li key={m.moduleId} className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-4 p-3">
                  <div className="flex flex-col items-center">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-full border font-mono text-xs"
                      style={{
                        borderColor: color,
                        color,
                        background: `color-mix(in oklab, ${color} 14%, transparent)`,
                        boxShadow: m.status === "in-progress" ? `0 0 18px -4px ${color}` : undefined,
                      }}
                    >
                      {i + 1}
                    </span>
                    {i < timeline.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 pb-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Link to={m.to} className="truncate font-semibold">
                        {m.title}
                      </Link>
                      <Chip color={color}>{categoriesByCode.get(m.categoryCode) ?? m.categoryCode}</Chip>
                      <Chip
                        color={
                          m.status === "complete"
                            ? "var(--success)"
                            : m.status === "in-progress"
                              ? "var(--ember)"
                              : undefined
                        }
                      >
                        {m.status.replace("-", " ")}
                      </Chip>
                    </div>
                    <ProgressBar
                      className="mt-2 max-w-md"
                      value={m.progress}
                      color={color}
                      label={`${m.title} progress`}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            title="Your expedition starts here"
            description="Complete a lesson or field test and your route will appear here."
            action={
              <Link
                to="/categories"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Explore regions →
              </Link>
            }
          />
        )}
      </section>

      {/* Regions */}
      <section className="mb-12">
        <SectionHeader
          eyebrow="Learn"
          title="Explore Regions"
          description="Choose a region and begin your expedition."
          action={
            <Link to="/categories" className="text-xs font-semibold tracking-wide text-primary uppercase">
              View all →
            </Link>
          }
        />
        {categoriesQuery.data?.categories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categoriesQuery.data.categories.slice(0, 4).map((c) => (
              <CategoryCard key={c.slug} category={categoryCardModel(c)} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
            <div className="panel h-64 animate-pulse" />
            <div className="panel h-64 animate-pulse" />
            <div className="panel h-64 animate-pulse" />
            <div className="panel h-64 animate-pulse" />
          </div>
        )}
      </section>

      {/* Continue training — only when the backend says modules are in progress */}
      {continueTraining.length > 0 && (
        <section className="mb-12">
          <SectionHeader eyebrow="Recommended" title="Continue Training" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {continueTraining.map((m) => (
              <MissionCard key={m.moduleId} mission={m} compact />
            ))}
          </div>
        </section>
      )}

      {/* Rewards + community */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <SectionHeader eyebrow="Rewards" title="XP & Achievements" />
          {summary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Level" value={summary.level} hint={summary.level_title} />
                <Stat label="XP" value={formatXp(summary.total_xp)} hint="Total XP" color="var(--ember)" />
                <Stat
                  label="Streak"
                  value={`${summary.current_streak}d`}
                  hint={`Personal best: ${summary.longest_streak}d`}
                />
              </div>
              <Link
                to="/gamification"
                className="panel-2 mt-4 flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
              >
                <Trophy className="size-5 text-primary" />
                <span className="text-sm">
                  {achievements
                    ? `${achievements.earned.length} of ${achievements.earned.length + achievements.unearned.length} achievements earned`
                    : `${summary.achievements_earned} achievements earned`}
                </span>
                <span className="ml-auto text-xs text-primary uppercase">Open →</span>
              </Link>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
              <div className="panel-2 h-24 animate-pulse" />
              <div className="panel-2 h-24 animate-pulse" />
              <div className="panel-2 h-24 animate-pulse" />
            </div>
          )}
        </div>
        <div>
          <SectionHeader eyebrow="Community" title="Latest From The Field" />
          {entitledCommunity ? (
            postsQuery.data?.posts.length ? (
              <>
                <div className="grid gap-3">
                  {postsQuery.data.posts.map((p) => (
                    <CommunityPostCard
                      key={p.post_id}
                      post={communityPostModel(p)}
                      onUpvote={() => { voteMutation.mutate(p.post_id); }}
                    />
                  ))}
                </div>
                <Link
                  to="/community"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase"
                >
                  Open community →
                </Link>
              </>
            ) : postsQuery.isPending ? (
              <div className="grid gap-3" aria-hidden="true">
                <div className="panel h-28 animate-pulse" />
                <div className="panel h-28 animate-pulse" />
              </div>
            ) : (
              <EmptyState
                title="No discussions yet"
                description="Be the first to share a field question."
              />
            )
          ) : (
            <Link
              to="/plans"
              className="panel-2 flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
            >
              <Lock className="size-5 text-muted-foreground" />
              <span className="text-sm">Community access requires a paid plan</span>
              <span className="ml-auto text-xs text-primary uppercase">Explore plans →</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
