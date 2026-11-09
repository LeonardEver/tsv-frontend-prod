import { rankTitle } from "@/features/gamification/rewards-presenter";
/**
 * Progress is a scenic record of server-reported learning progress.
 * Lesson cards show each module's best quiz score, never relabel objective
 * percentages or infer a lesson score from unweighted objective averages.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Activity, ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, Check, ChevronDown, CircleHelp, Crosshair, Flame, Layers, LockKeyhole, Map as RegionMap, Mountain, type LucideIcon } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import type { ModuleListResponse, ModuleProgressResponse } from "@/lib/api/types";
import { catColorForCode, codeFromSlug } from "@/lib/category-visuals";
import { sortModulesByCurriculum } from "@/lib/curriculum";
import { Chip, EmptyState, ProgressBar, ProgressRing, Stat, cn } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatActivityAction, formatDate, formatRelativeTime, formatScorePct, formatXp } from "@/lib/format/format";
import { fetchGamificationSummary } from "@/features/dashboard/dashboard.api";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchProgress, fetchModuleProgress, fetchModules } from "./progress.api";
import panorama from "@/assets/progress-panorama.jpg";
import styles from "./progress.module.css";

type ModuleRow = ModuleListResponse["modules"][number];
interface DetailState {
  data?: ModuleProgressResponse | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

export default function ProgressPage() {
  useInterfaceLocale();
  const [allActivity, setAllActivity] = useState(false);
  const overviewQuery = useQuery({
    queryKey: queryKeys.learning.progress, queryFn: fetchProgress,
    staleTime: 30_000, refetchOnWindowFocus: true,
  });
  const gamificationQuery = useQuery({
    queryKey: queryKeys.gamification.summary, queryFn: fetchGamificationSummary,
    staleTime: 30_000, refetchOnWindowFocus: true,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.content.categories, queryFn: fetchCategories, staleTime: 30 * 60_000,
  });
  const modulesQuery = useQuery({
    queryKey: queryKeys.content.modules, queryFn: fetchModules, staleTime: 5 * 60_000,
  });
  const modules = modulesQuery.data?.modules ?? [];
  const moduleDetails = useQueries({
    queries: modules.slice(0, 100).map((m) => ({
      queryKey: queryKeys.learning.moduleProgress(m.module_id),
      queryFn: () => fetchModuleProgress(m.module_id),
      staleTime: 30_000, refetchOnWindowFocus: true, retry: false,
    })),
  });
  const details = new Map<string, DetailState>();
  moduleDetails.forEach((detail, index) => {
    const mod = modules.at(index);
    if (mod) details.set(mod.module_id, detail);
  });
  const categories = categoriesQuery.data?.categories ?? [];
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const orderedModules = sortModulesByCurriculum(modules, (slug) => categoryBySlug.get(slug)?.code ?? codeFromSlug(slug) ?? undefined);
  const overview = overviewQuery.data;
  const summary = gamificationQuery.data;
  const academyPct = overview && overview.total_modules > 0
    ? Math.round((overview.modules_completed / overview.total_modules) * 100) : 0;
  const startedRegions = categories.filter((c) => c.completed_count > 0).length;
  const completedRegions = categories.filter((c) => c.module_count > 0 && c.completed_count >= c.module_count).length;
  const activity = overview?.recent_activity ?? [];
  const visibleActivity = allActivity ? activity : activity.slice(0, 6);
  const milestones = [
    { get label() { return uiText("progress:start_your_journey_cdb6f2"); }, icon: Mountain, done: Boolean(overview && (overview.modules_completed > 0 || activity.length > 0 || modules.some((m) => m.progress_pct > 0))), get hint() { return uiText("progress:begin_a_lesson_or_field_test_f25cbe"); } },
    { get label() { return uiText("progress:complete_3_missions_2ee2ac"); }, icon: Crosshair, done: (overview?.modules_completed ?? 0) >= 3, get hint() { return uiText("progress:value_3_missions_3ba134", { value0: uiValue(overview?.modules_completed ?? 0) }); } },
    { get label() { return uiText("progress:finish_1_region_eb8239"); }, icon: RegionMap, done: completedRegions > 0, get hint() { return uiText("progress:value_complete_732282", { value0: uiValue(completedRegions) }); } },
    { get label() { return uiText("progress:reach_level_2_cd78d9"); }, icon: Layers, done: summary !== undefined && summary.level >= 2, hint: summary ? uiText("progress:currentLevel", { level: summary.level }) : uiText("progress:levelUnavailable") },
    { get label() { return uiText("progress:build_a_3_day_streak_c4ad05"); }, icon: Flame, done: (overview?.longest_streak ?? 0) >= 3, get hint() { return uiText("progress:personal_best_value_days_b3ddaf", { value0: uiValue(overview?.longest_streak ?? 0) }); } },
  ];
  const nextMilestone = milestones.findIndex((m) => !m.done);

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label={uiText("progress:expedition_overview_ae4e01")}>
        <div className={styles.heroBanner}>
        <img src={panorama} alt="" width={1920} height={640} className={styles.panorama} fetchPriority="high" />
        <div className={styles.heading}>
          <PageHeader
            eyebrow={uiText("progress:progress_1b9027")} title={uiText("progress:your_expedition_0fe6b2")}
            description={uiText("progress:track_your_journey_build_essential_survival_skills_0f890d")}
            aside={overview ? (
              <div className={styles.completionRing}><ProgressRing value={academyPct} size={124} stroke={7} color="var(--ember)">
                <span className="font-display text-3xl font-semibold">{academyPct}%</span>
                <span className="mt-1 block font-mono text-[9px] tracking-widest text-muted-foreground uppercase">{uiText("progress:complete_1f5a1a")}</span>
              </ProgressRing></div>
            ) : null}
          />
        </div>
        </div>
        {overview && (
          <section className={styles.stats} aria-label={uiText("progress:expedition_statistics_68b330")}>
            <ScenicStat icon={Mountain}><Stat label={uiText("progress:level_7c7f5d")} value={summary?.level ?? "—"} hint={summary ? rankTitle(summary.level, summary.level_title) : uiText("progress:level_unavailable_a44218")} /></ScenicStat>
            <ScenicStat icon={Layers}><Stat label={uiText("progress:total_xp_de22fa")} value={formatXp(overview.total_xp)} color="var(--ember)" hint={uiText("progress:all_time_dbad49")} /></ScenicStat>
            <ScenicStat icon={Flame}><Stat label={uiText("progress:streak_ac4792")} value={uiText("common:days", { count: overview.current_streak })} hint={uiText("progress:personal_best_value_value_e02b1f", { value0: uiValue(overview.longest_streak), value1: uiValue(overview.longest_streak === 1 ? uiText("rewards:day_a2620c") : uiText("rewards:days_5548ae")) })} /></ScenicStat>
            <ScenicStat icon={Crosshair}><Stat label={uiText("progress:missions_complete_ad4f8c")} value={overview.modules_completed} hint={categoriesQuery.data ? uiText("progress:across_value_regions_57df3a", { value0: uiValue(categories.length) }) : uiText("progress:across_the_academy_cdc8f0")} /></ScenicStat>
          </section>
        )}
      </section>

      {overviewQuery.isError ? (
        <ErrorState error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} />
      ) : overview ? (
        <>
          <div className={styles.mainGrid}>
            <section className={cn(styles.panel, styles.regions)} aria-labelledby="regions-heading">
              <PanelHeading id="regions-heading" icon={RegionMap} title={uiText("progress:regions_progress_395017")}>
                {categoriesQuery.data && <span>{uiText("progress:value_of_value_regions_with_completions_value_6dd375", { value0: uiValue(startedRegions), value1: uiValue(categories.length), value2: uiValue(academyPct) })}</span>}
              </PanelHeading>
              {categoriesQuery.isPending ? <LoadingPanel /> : categoriesQuery.isError ? (
                <ErrorState error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} />
              ) : categories.length === 0 ? (
                <EmptyState title={uiText("progress:no_regions_yet_910604")} description={uiText("progress:content_is_being_prepared_check_back_soon_beed41")} />
              ) : (
                <div className={styles.regionList}>
                  {categories.map((c) => {
                    const pct = c.module_count > 0 ? Math.round((c.completed_count / c.module_count) * 100) : 0;
                    const color = catColorForCode(c.code);
                    return (
                      <Link key={c.slug} to={`/categories/${c.slug}`} className={cn(styles.regionRow, c.completed_count > 0 && styles.startedRegion)}>
                        <span className={styles.regionName}>
                          <span className={styles.regionDot} style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                          <span>{c.title}</span>
                        </span>
                        <ProgressBar value={pct} color={color} label={uiText("progress:value_completion_c5bebd", { value0: uiValue(c.title) })} />
                        <span className={styles.regionCount}>{c.completed_count}/{c.module_count} · {pct}%</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section className={cn(styles.panel, styles.activity)} aria-labelledby="activity-heading">
              <PanelHeading id="activity-heading" icon={Activity} title={uiText("progress:recent_activity_8aebf3")}>
                {activity.length > 6 && (
                  <button type="button" className={styles.textAction} onClick={() => { setAllActivity(!allActivity); }} aria-expanded={allActivity}>
                    {allActivity ? uiText("progress:show_less_4c852b") : uiText("progress:view_all_931e1a")} <ArrowRight size={14} />
                  </button>
                )}
              </PanelHeading>
              {activity.length === 0 ? (
                <EmptyState title={uiText("progress:no_learning_activity_yet_6389ec")} description={uiText("progress:complete_a_lesson_or_take_a_quiz_bb2f46")} />
              ) : (
                <ol className={styles.activityList}>
                  {visibleActivity.map((event, i) => {
                    const moduleTitle = modules.find((m) => m.module_id === event.module_id)?.title;
                    const isComplete = event.action.endsWith("_completed");
                    const Icon = isComplete ? Check : event.action.startsWith("quiz") ? CircleHelp : BookOpen;
                    return (
                      <li key={`${event.at}-${i}`} className={styles.activityItem}>
                        <span className={cn(styles.activityIcon, isComplete && styles.activityComplete)}><Icon aria-hidden="true" /></span>
                        <div className={styles.activityContent}>
                          <Chip color={isComplete ? "var(--success)" : undefined}>{formatActivityAction(event.action)}</Chip>
                          <p title={moduleTitle}>{moduleTitle ?? (event.action.startsWith("quiz") ? uiText("progress:field_test_c7b676") : uiText("progress:learning_session_89c8e4"))}</p>
                          <span>{event.score !== null ? uiText("progress:score_value_63e540", { value0: uiValue(formatScorePct(event.score)) }) : formatDate(event.at)}</span>
                        </div>
                        <time dateTime={event.at} title={formatDate(event.at)}>{formatRelativeTime(event.at)}</time>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section className={cn(styles.panel, styles.expedition)} aria-labelledby="milestones-heading">
              <PanelHeading id="milestones-heading" icon={Mountain} title={uiText("progress:expedition_progress_80dc37")}>
                <Link to="/categories" className={styles.streakMessage}>{overview.current_streak > 0 ? uiText("progress:keep_going_maintain_your_value_day_streak_f03d60", { value0: uiValue(overview.current_streak) }) : uiText("progress:start_your_expedition_3cf0db")} <ArrowRight size={14} /></Link>
              </PanelHeading>
              <ol className={styles.milestones}>
                {milestones.map((milestone, index) => {
                  const Icon = index === 0 ? Mountain : milestone.done ? Check : index === nextMilestone ? milestone.icon : LockKeyhole;
                  return (
                    <li key={milestone.label} className={cn(styles.milestone, milestone.done && styles.milestoneDone, index === nextMilestone && styles.milestoneCurrent)}>
                      <span className={styles.milestoneIcon}><Icon aria-hidden="true" /></span>
                      <span className={styles.milestoneLabel}>{milestone.label}</span>
                      <span className="sr-only">{milestone.done ? uiText("progress:achieved_bc86ed") : uiText("progress:in_progress_8f9fba")} {milestone.hint}</span>
                    </li>
                  );
                })}
              </ol>
            </section>

            <LessonPerformance modules={orderedModules} details={details} isPending={modulesQuery.isPending} inventoryError={modulesQuery.isError} onRetryInventory={() => void modulesQuery.refetch()} />
          </div>

          <details className={styles.inventory}>
            <summary><BookOpen size={20} aria-hidden="true" /><h2>{uiText("progress:mission_details_bc6c95")}</h2><span>{uiText("progress:progress_quiz_scores_and_attempts_128a27")}</span><ChevronDown className={styles.inventoryChevron} size={18} /></summary>
            {modulesQuery.isPending ? <LoadingPanel /> : modulesQuery.isError ? (
              <ErrorState error={modulesQuery.error} onRetry={() => void modulesQuery.refetch()} />
            ) : modules.length === 0 ? (
              <EmptyState title={uiText("progress:no_modules_available_cfa957")} description={uiText("progress:content_is_being_prepared_check_back_soon_beed41")} />
            ) : (
              <ul className={styles.moduleGrid}>
                {modules.map((mod) => {
                  const detail = details.get(mod.module_id);
                  const data = detail?.data;
                  return (
                    <li key={mod.module_id}>
                      <Link to={`/modules/${mod.module_id}`} className="panel block h-full p-4 transition-colors hover:border-primary/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{mod.title}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{uiText("progress:value_value_min_12198f", { value0: uiValue(categoryBySlug.get(mod.category)?.title ?? mod.category), value1: uiValue(mod.estimated_duration ?? "—") })}</p>
                          </div>
                          <Chip>{mod.difficulty}</Chip>
                        </div>
                        <ProgressBar className="mt-3" value={mod.progress_pct} color={mod.completed ? "var(--success)" : undefined} label={uiText("progress:value_value_complete_34abd4", { value0: uiValue(mod.title), value1: uiValue(mod.progress_pct) })} />
                        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                          <Chip color={mod.completed ? "var(--success)" : mod.progress_pct > 0 ? "var(--ember)" : undefined}>{mod.completed ? uiText("progress:completed_1798b3") : mod.progress_pct > 0 ? uiText("progress:in_progress_b6bd42") : uiText("progress:not_started_db2c45")}</Chip>
                          {detail?.isPending ? <span>{uiText("progress:loading_quiz_results_df024c")}</span> : data ? (
                            <span>{uiText("progress:quizAttempts", { score: data.quiz_best_score === null ? "—" : formatScorePct(data.quiz_best_score), attempts: uiText("common:attempts", { count: data.quiz_attempts }) })}</span>
                          ) : <span>{uiText("progress:quiz_results_unavailable_f5dc0b")}</span>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        </>
      ) : <LoadingPanel />}
    </div>
  );
}

function ScenicStat({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  useInterfaceLocale();
  return <div className={styles.statTile}><Icon className={styles.statIcon} aria-hidden="true" />{children}</div>;
}

function PanelHeading({ id, icon: Icon, title, children }: { id: string; icon: LucideIcon; title: string; children?: ReactNode }) {
  useInterfaceLocale();
  return <div className={styles.panelHeading}><div><Icon aria-hidden="true" /><h2 id={id}>{title}</h2></div>{children && <div className={styles.panelMeta}>{children}</div>}</div>;
}

function LoadingPanel() {
  useInterfaceLocale();
  return <div className="panel h-28 animate-pulse" role="status"><span className="sr-only">{uiText("progress:loading_progress_56afd5")}</span></div>;
}

function LessonPerformance({ modules, details, isPending, inventoryError, onRetryInventory }: {
  modules: ModuleRow[]; details: Map<string, DetailState>; isPending: boolean; inventoryError: boolean; onRetryInventory: () => void;
}) {
  useInterfaceLocale();
  const [showAll, setShowAll] = useState(false);
  // Preserve curriculum position even when a learner takes lessons out of order.
  // A real zero score remains visible; null/missing scores never become zero.
  const rows = modules.map((mod, index) => ({ mod, number: index + 1, data: details.get(mod.module_id)?.data }))
    .filter((row): row is typeof row & { data: ModuleProgressResponse & { quiz_best_score: number } } => row.data?.quiz_best_score !== null && row.data?.quiz_best_score !== undefined);
  const pending = isPending || [...details.values()].some((d) => d.isPending);
  const failed = [...details.values()].filter((d) => d.isError);
  const visibleRows = showAll ? rows : rows.slice(0, 5);

  return (
    <section className={cn(styles.panel, styles.performance)} aria-labelledby="performance-heading" aria-describedby="performance-description">
      <PanelHeading id="performance-heading" icon={ChartNoAxesColumnIncreasing} title={uiText("progress:lesson_performance_b25534")}>
        {rows.length > 5 && <button type="button" className={styles.textAction} onClick={() => { setShowAll(!showAll); }} aria-expanded={showAll}>{showAll ? uiText("progress:show_less_4c852b") : uiText("progress:view_all_931e1a")} <ArrowRight size={14} /></button>}
      </PanelHeading>
      <p id="performance-description" className="sr-only">{uiText("progress:your_best_quiz_score_for_each_lesson_249b53")}</p>
      {inventoryError ? <div className={styles.unavailable}>{uiText("progress:lesson_results_unavailable_0574fb")}{" "}<button type="button" onClick={onRetryInventory}>{uiText("progress:retry_9f5cd8")}</button></div> : rows.length === 0 && pending ? <LoadingPanel /> : rows.length === 0 && failed.length === 0 ? (
        <EmptyState title={uiText("progress:no_lesson_results_yet_c30e98")} description={uiText("progress:take_a_lesson_quiz_to_see_your_b460df")} />
      ) : rows.length > 0 ? (
        <div className={styles.lessonGrid}>
          {visibleRows.map(({ mod, number, data }) => (
            <article key={mod.module_id} className={styles.lessonCard} aria-label={uiText("progress:lesson_value_value_eb38dc", { value0: uiValue(number), value1: uiValue(mod.title) })} title={uiText("progress:bestQuizAttempts", { title: mod.title, score: formatScorePct(data.quiz_best_score), attempts: uiText("common:attempts", { count: data.quiz_attempts }) })}>
              <span className={styles.lessonLabel}>{uiText("progress:lesson_value_288e56", { value0: uiValue(number) })}</span>
              <p className={styles.lessonTitle} title={mod.title}>{mod.title}</p>
              <strong>{formatScorePct(data.quiz_best_score)}</strong>
              <ProgressBar value={data.quiz_best_score} label={uiText("progress:lesson_value_best_quiz_score_1f1ce0", { value0: uiValue(number) })} />
              <span className="sr-only">{uiText("common:attempts", { count: data.quiz_attempts })}</span>
              <Link to={`/modules/${mod.module_id}/lesson`} className={styles.lessonReview} aria-label={uiText("progress:review_lesson_value_3db0d8", { value0: uiValue(number) })}><span className="sr-only">{uiText("progress:review_lesson_0e3fba")}</span></Link>
            </article>
          ))}
        </div>
      ) : null}
      {failed.length > 0 && <div className={styles.unavailable}>{uiText("progress:some_lesson_results_could_not_be_loaded_d01453")}{" "}<button type="button" onClick={() => { for (const d of failed) void d.refetch(); }}>{uiText("progress:retry_9f5cd8")}</button></div>}
    </section>
  );
}
