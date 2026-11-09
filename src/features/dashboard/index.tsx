import { rankTitle } from "@/features/gamification/rewards-presenter";
/**
 * Dashboard — Base Camp (Phase 23). The Lovable reference
 * `src/routes/index.tsx` is the visual source of truth: PageHeader with
 * XP readout, daily-limit tiles, next-mission MissionHero, expedition
 * timeline, Explore Regions, Continue Training, rewards + community
 * columns.
 *
 * ALL values come from authoritative backend state:
 * - next-mission rule: the first module in CURRICULUM order (the teaching
 *   sequence in lib/curriculum.ts, derived from /categories) whose backend
 *   `completed` flag is still false — never "the first mission", never the
 *   last thing touched, and never the alphabetically-first module that
 *   /modules happens to return. The CTA goes straight into
 *   that mission's lesson (lesson not done → "Take lesson", lesson done →
 *   "Take quiz" / "Retake quiz"), so Home → Lesson needs no module page
 *   in between. All complete → the end-of-curriculum state; 404 on the
 *   recommended module → discovery fallback (Phase 15.5 §3).
 * - progress percentages render verbatim from /modules.
 * - gamification values are never computed client-side.
 * - daily limits come from /usage; the UI is never the authority.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { Link } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Check, Crosshair, Flame, Layers3, Lock, Mountain, Trophy, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { queryKeys } from "@/lib/api/keys";
import { ApiError } from "@/lib/api/errors";
import { formatDifficulty, formatXp } from "@/lib/format/format";
import { catColorForCode, codeFromSlug } from "@/lib/category-visuals";
import { moduleImage } from "@/lib/module-visuals";
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
import { MobileExpedition } from "./MobileExpedition";
import welcomeArt from "@/assets/base-camp-welcome.jpg";
import campArt from "@/assets/base-camp-expedition.jpg";
import styles from "./dashboard.module.css";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchAllModules } from "@/features/modules/modules.api";
import { fetchModule } from "@/features/modules/modules.api";
import { fetchUsage, fetchSubscription } from "@/features/plans/plans.api";
import { fetchAchievements } from "@/features/gamification/gamification.api";
import { fetchCommunityPosts, votePost } from "@/features/community/community.api";
import { categoryCardModel } from "@/features/categories/adapters";
import {
  communityPostModel,
  missionCardModelFromListRow,
  nextIncompleteModule,
  nextMissionAction,
} from "./adapters";

/** Daily-limit tile — unlimited plans render honestly without a bar. */
function LimitTile({
  label,
  used,
  total,
  barColor,
  icon: Icon,
}: {
  label: string;
  used: number | null;
  total: number | null;
  barColor?: string | undefined;
  icon: LucideIcon;
}) {
  useInterfaceLocale();
  return (
    <div className={styles.limitTile}>
      <Icon className={styles.tileGlyph} aria-hidden="true" />
      <div className={styles.tileBody}>
      <Eyebrow>{label}</Eyebrow>
      {total === null ? (
        <>
          <p className={`font-display leading-none ${styles.usageValue}`}>{uiText("dashboard:unlimited_b8bef3")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{uiText("dashboard:no_daily_limit_on_this_plan_23c812")}</p>
        </>
      ) : (
        <>
          <p className={`font-display leading-none ${styles.usageValue}`}>
            {used ?? 0} <span className="text-muted-foreground">/ {total}</span>
          </p>
          <ProgressBar
            className={styles.dailyProgress}
            value={total > 0 ? ((used ?? 0) / total) * 100 : 0}
            color={barColor}
            label={uiText("dashboard:value_used_today_728cbc", { value0: uiValue(label) })}
          />
        </>
      )}
      {total !== null && total > 0 && (used ?? 0) >= total ? <span className={styles.limitCheck} aria-label={uiText("dashboard:daily_allowance_used_7219f2")}><Check className="size-3.5" /></span> : null}
      </div>
    </div>
  );
}

/** The curriculum is complete — the honest end state, with the record as
 * the next place to go. No next mission is invented to fill the slot. */
function CurriculumCompleteHero() {
  useInterfaceLocale();
  return (
    <EmptyState
      title={uiText("dashboard:every_mission_complete_519fc4")}
      description={uiText("dashboard:you_have_worked_through_the_whole_curriculum_4a815f")}
      action={
        <Link
          to="/progress"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >{uiText("dashboard:review_your_record_a295ee")}</Link>
      }
    />
  );
}

/** No published content to recommend — the first category in the server's
 * own order is the entry point (Phase 15.5 §3 rule 3). */
function DiscoveryHero({
  firstCategory,
}: {
  firstCategory: ReturnType<typeof categoryCardModel> | undefined;
}) {
  useInterfaceLocale();
  if (!firstCategory) {
    return (
      <EmptyState
        title={uiText("dashboard:nothing_here_yet_e89225")}
        description={uiText("dashboard:content_is_on_its_way_check_back_9ece20")}
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
          <Eyebrow>{uiText("dashboard:first_mission_6416fd")}</Eyebrow>
          <h2 className="mt-2 font-display text-4xl leading-[1.05] font-semibold tracking-wide uppercase sm:text-5xl">{uiText("dashboard:value_awaits_9e2f64", { value0: uiValue(firstCategory.name) })}</h2>
          <p className="mt-3 text-base text-muted-foreground">{uiText("dashboard:begin_your_expedition_with_your_first_mission_1d8d1e")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip color={color}>{firstCategory.name}</Chip>
            <Chip>{uiText("dashboard:value_missions_d4bb5e", { value0: uiValue(firstCategory.missions) })}</Chip>
          </div>
        </div>
        <Link
          to={`/categories/${firstCategory.slug}`}
          className="glow-ember inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
        >{uiText("dashboard:explore_value_6d566c", { value0: uiValue(firstCategory.name) })}</Link>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  useInterfaceLocale();
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
    queryKey: queryKeys.community.preview(userId),
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

  // ── Next mission — the first INCOMPLETE mission in CURRICULUM order,
  // never the first mission outright and never driven by what the learner
  // happened to touch last. `/modules` is alphabetical by `module_id`, so
  // the teaching order is applied here from `/categories` — see
  // lib/curriculum.ts. Without it the hero recommends whichever module
  // happens to sort first alphabetically (AGR-composting). ──
  const recommendedRow = nextIncompleteModule(modulesQuery.data?.modules, (slug) =>
    categoriesBySlug.get(slug)?.code ?? codeFromSlug(slug) ?? undefined,
  );
  const recommendedId = recommendedRow?.module_id;

  // The module detail supplies the lesson/quiz step the CTA targets; the
  // recommendation itself is already decided above.
  const recommendedModuleQuery = useQuery({
    queryKey: queryKeys.content.module(recommendedId ?? ""),
    queryFn: () => fetchModule(recommendedId ?? ""),
    staleTime: 5 * 60_000,
    enabled: Boolean(recommendedId),
  });

  let nextMission: (MissionCardModel & { ctaLabel: string }) | null = null;
  if (recommendedRow && recommendedModuleQuery.data) {
    const detail = recommendedModuleQuery.data;
    const code =
      categoriesBySlug.get(detail.category)?.code ??
      codeFromSlug(detail.category) ??
      detail.category;
    const lessonDone = detail.lesson?.completed ?? false;
    const quizAttempted = (detail.quiz?.attempt_count ?? 0) > 0;
    const action = nextMissionAction(lessonDone, quizAttempted, detail.module_id);
    nextMission = {
      moduleId: detail.module_id,
      categoryCode: code,
      subcategory: detail.subcategory ?? "",
      title: detail.title,
      description: detail.description ?? "",
      difficulty: formatDifficulty(detail.difficulty),
      minutes: detail.estimated_duration ?? 0,
      progress: recommendedRow.progress_pct,
      status: recommendedRow.completed
        ? "complete"
        : recommendedRow.progress_pct > 0
          ? "in-progress"
          : "available",
      image: moduleImage(detail.module_id),
      to: action.to,
      ctaLabel: action.ctaLabel,
    };
  }

  const recommendedGone =
    recommendedModuleQuery.isError &&
    recommendedModuleQuery.error instanceof ApiError &&
    recommendedModuleQuery.error.status === 404;
  // The detail query is enabled only when there IS a recommendation; with
  // no incomplete mission left it stays disabled, so this branch must not
  // wait on it.
  const heroPending = Boolean(recommendedId) && recommendedModuleQuery.isPending;

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
    (m) => m.progress_pct > 0 && !m.completed && m.module_id !== recommendedId,
  );
  const continueTraining = inProgress.slice(0, 4).map((m) => missionCardModelFromListRow(m, categoriesBySlug));

  const firstName = user?.display_name?.split(" ")[0];
  const statusParts: string[] = [];
  if (progressQuery.data) {
    statusParts.push(uiText("common:completedMissions", { count: progressQuery.data.modules_completed }));
  }
  if (gamificationQuery.data) {
    statusParts.push(uiText("settings:level_value_c5bf02", { value0: gamificationQuery.data.level }), rankTitle(gamificationQuery.data.level, gamificationQuery.data.level_title));
  }

  const summary = gamificationQuery.data;
  const usage = usageQuery.data;
  const achievements = achievementsQuery.data;

  return (
    <>
    {recommendedRow && modulesQuery.data && categoriesQuery.data && !recommendedGone ? (
      <MobileExpedition modules={modulesQuery.data.modules} categories={categoriesQuery.data.categories} current={recommendedRow} action={nextMission} streak={summary?.current_streak} usage={usage} />
    ) : null}
    <div className={`${styles.home} ${recommendedRow && modulesQuery.data && categoriesQuery.data && !recommendedGone ? "hidden flex-col md:flex" : "flex flex-col"}`}>
      <section className={styles.welcome} aria-label={uiText("dashboard:base_camp_overview_100bea")}>
      <img src={welcomeArt} alt="" width={1920} height={640} fetchPriority="high" className={styles.welcomeArt} />
      <div className={styles.greeting}>
      <PageHeader
        eyebrow={uiText("dashboard:base_camp_8e2aa8")}
        title={firstName ? uiText("dashboard:welcome_back_value_7566d9", { value0: uiValue(firstName) }) : uiText("dashboard:welcome_ca4f9d")}
        description={statusParts.length > 0 ? statusParts.join(" · ") : undefined}
        aside={
          summary ? (
            <div className={styles.welcomeStats}>
              <p className="font-display text-2xl font-semibold">{uiText("dashboard:value_xp_621cd3", { value0: uiValue(formatXp(summary.total_xp)) })}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {summary.xp_to_next_level === null
                  ? uiText("dashboard:max_level_reached_c28dc6")
                  : uiText("dashboard:value_xp_to_level_value_1d7549", { value0: uiValue(summary.xp_to_next_level), value1: uiValue(summary.level + 1) })}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-primary">
                <Flame className="size-3.5" /> {summary.current_streak}{" "}{uiText("dashboard:day_streak_ca360c")}</p>
            </div>
          ) : null
        }
      />
      </div>

      {/* Daily limits — on mobile the next mission dominates, so the
          limits render below the hero (order restored from sm up). */}
      <section className={styles.dailyLimits} aria-label={uiText("dashboard:daily_limits_c1f489")}>
        {usage ? (
          <>
            <LimitTile
              label={uiText("dashboard:today_lessons_76d6a9")}
              icon={BookOpen}
              used={usage.lesson_completions}
              total={usage.limits.daily_lessons}
            />
            <LimitTile
              label={uiText("dashboard:today_field_tests_757feb")}
              icon={Crosshair}
              used={usage.quiz_attempts}
              total={usage.limits.daily_quizzes}
              barColor="var(--primary)"
            />
          </>
        ) : (
          <>
            <div className="panel-2 h-24 animate-pulse" aria-hidden="true" />
            <div className="panel-2 h-24 animate-pulse" aria-hidden="true" />
          </>
        )}
        <div className={styles.planTile}>
          <Layers3 className={styles.tileGlyph} aria-hidden="true" />
          <div className="min-w-0">
            <Eyebrow>{uiText("dashboard:current_plan_ec5cfb")}</Eyebrow>
            <p className="mt-1.5 font-display text-2xl leading-none tracking-wide uppercase">
              {usage?.plan_name ?? "…"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {usage
                ? usage.limits.daily_lessons === null
                  ? uiText("dashboard:unlimited_lessons_and_field_tests_per_day_8a1e5d")
                  : uiText("dashboard:value_lessons_and_value_field_tests_per_543f67", { value0: uiValue(usage.limits.daily_lessons), value1: uiValue(usage.limits.daily_quizzes) })
                : " "}
            </p>
          </div>
          <Link
            to="/plans"
            className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
          >{uiText("dashboard:compare_8d105c")}</Link>
        </div>
      </section>
      </section>

      {/* Next mission — the dominant action (first on mobile) */}
      <section className={styles.nextMission} aria-label={uiText("dashboard:next_mission_f2974d")}>
        {progressQuery.isError ? (
          <ErrorState error={progressQuery.error} onRetry={() => void progressQuery.refetch()} />
        ) : heroPending ? (
          <div className="panel h-64 animate-pulse" aria-hidden="true" />
        ) : recommendedGone ? (
          // The recommendation resolved to a module the backend no longer
          // serves: fall back to discovery rather than offering a dead CTA.
          <DiscoveryHero
            firstCategory={
              categoriesQuery.data?.categories[0]
                ? categoryCardModel(categoriesQuery.data.categories[0])
                : undefined
            }
          />
        ) : !nextMission ? (
          <CurriculumCompleteHero />
        ) : (
          <MissionHero mission={nextMission} ctaLabel={nextMission.ctaLabel} className={styles.missionHero} />
        )}
      </section>

      {/* Expedition path */}
      <section className={styles.expedition} aria-label={uiText("dashboard:your_expedition_dbe444")}>
        <img src={campArt} alt="" width={1920} height={640} loading="lazy" className={styles.campArt} />
        <div className={styles.expeditionHeading}>
        <Mountain aria-hidden="true" />
        <SectionHeader
          title={uiText("dashboard:your_expedition_0fe6b2")}
          description={uiText("dashboard:the_route_you_re_currently_walking_7f0ffe")}
          action={
            <Link
              to="/progress"
              className="text-xs font-semibold tracking-wide text-primary uppercase"
            >{uiText("dashboard:full_record_f58bcd")}</Link>
          }
        />
        </div>
        {timeline.length > 0 ? (
          <ol className={styles.timeline}>
            {timeline.map((m, i) => {
              const color = catColorForCode(m.categoryCode);
              return (
                <li key={m.moduleId} className={`relative grid grid-cols-[auto_minmax(0,1fr)] gap-4 p-3 ${styles.trailRow}`}>
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
                    <div className={styles.trailProgress}>
                    <ProgressBar
                      value={m.progress}
                      color={color}
                      label={uiText("dashboard:value_progress_8196fd", { value0: uiValue(m.title) })}
                    />
                    {m.status === "complete" ? <span className={styles.completedMark} aria-hidden="true"><Check className="size-3.5" /></span> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            title={uiText("dashboard:your_expedition_starts_here_947e88")}
            description={uiText("dashboard:complete_a_lesson_or_field_test_and_fcdca1")}
            action={
              <Link
                to="/categories"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >{uiText("dashboard:explore_regions_93f848")}</Link>
            }
          />
        )}
      </section>

      {/* Regions */}
      <section className="mb-12">
        <SectionHeader
          eyebrow={uiText("dashboard:learn_b04837")}
          title={uiText("dashboard:explore_regions_9be4e2")}
          description={uiText("dashboard:choose_a_region_and_begin_your_expedition_19d6d3")}
          action={
            <Link to="/categories" className="text-xs font-semibold tracking-wide text-primary uppercase">{uiText("dashboard:view_all_fe48df")}</Link>
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
          <SectionHeader eyebrow={uiText("dashboard:recommended_9ef937")} title={uiText("dashboard:continue_training_7af7f1")} />
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
          <SectionHeader eyebrow={uiText("dashboard:rewards_2f4f4b")} title={uiText("dashboard:xp_achievements_5fefc2")} />
          {summary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label={uiText("dashboard:level_7c7f5d")} value={summary.level} hint={rankTitle(summary.level, summary.level_title)} />
                <Stat label={uiText("dashboard:xp_53af63")} value={formatXp(summary.total_xp)} hint={uiText("dashboard:total_xp_de22fa")} color="var(--ember)" />
                <Stat
                  label={uiText("dashboard:streak_ac4792")}
                  value={`${summary.current_streak}d`}
                  hint={uiText("dashboard:personal_best_valued_be4da7", { value0: uiValue(summary.longest_streak) })}
                />
              </div>
              <Link
                to="/gamification"
                className="panel-2 mt-4 flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
              >
                <Trophy className="size-5 text-primary" />
                <span className="text-sm">
                  {achievements
                    ? uiText("dashboard:value_of_value_achievements_earned_d853c2", { value0: uiValue(achievements.earned.length), value1: uiValue(achievements.earned.length + achievements.unearned.length) })
                    : uiText("dashboard:value_achievements_earned_237cf2", { value0: uiValue(summary.achievements_earned) })}
                </span>
                <span className="ml-auto text-xs text-primary uppercase">{uiText("dashboard:open_6f4789")}</span>
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
          <SectionHeader eyebrow={uiText("dashboard:community_bfd58e")} title={uiText("dashboard:latest_from_the_field_28bbdd")} />
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
                >{uiText("dashboard:open_community_3acafd")}</Link>
              </>
            ) : postsQuery.isPending ? (
              <div className="grid gap-3" aria-hidden="true">
                <div className="panel h-28 animate-pulse" />
                <div className="panel h-28 animate-pulse" />
              </div>
            ) : (
              <EmptyState
                title={uiText("dashboard:no_discussions_yet_803034")}
                description={uiText("dashboard:be_the_first_to_share_a_field_d5f0df")}
              />
            )
          ) : (
            <Link
              to="/plans"
              className="panel-2 flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
            >
              <Lock className="size-5 text-muted-foreground" />
              <span className="text-sm">{uiText("dashboard:community_access_requires_a_paid_plan_4c1c5e")}</span>
              <span className="ml-auto text-xs text-primary uppercase">{uiText("dashboard:explore_plans_836ed2")}</span>
            </Link>
          )}
        </div>
      </section>
    </div>
    </>
  );
}
