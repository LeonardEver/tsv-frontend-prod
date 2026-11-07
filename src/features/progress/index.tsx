/**
 * Progress surface (Phase 14 §4–§12, restyled Phase 23). The Lovable
 * reference `src/routes/progress.tsx` is the visual source of truth:
 * PageHeader with the overall-completion ring, stat tiles, region
 * breakdown, recent activity log — plus the production module rows and
 * LO-performance sections, rendered in the same panel language.
 *
 * Every value is rendered from authoritative backend state. The module
 * rows come from the /modules inventory (completed/progress_pct are
 * backend-derived); per-module detail (attempt history, best score, LO
 * performance) fans out through the canonical progress/modules query
 * key. LO performance is NOT LO completion and is never labelled as
 * mastery. The header ring shows the authoritative academy completion
 * (modules completed / total) — no level-progress curve is invented.
 */
import { Link } from "react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import { catColorForCode } from "@/lib/category-visuals";
import { Chip, EmptyState, ProgressBar, ProgressRing, SectionHeader, Stat } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatActivityAction, formatRelativeTime, formatScorePct, formatXp } from "@/lib/format/format";
import { fetchGamificationSummary } from "@/features/dashboard/dashboard.api";
import { fetchCategories } from "@/features/categories/categories.api";
import { fetchProgress, fetchModuleProgress, fetchModules } from "./progress.api";

export default function ProgressPage() {
  const overviewQuery = useQuery({
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

  const categoriesQuery = useQuery({
    queryKey: queryKeys.content.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 60_000,
  });

  const modulesQuery = useQuery({
    queryKey: queryKeys.content.modules,
    queryFn: fetchModules,
    staleTime: 5 * 60_000,
  });

  // Per-module detail (attempt history, best score, LO performance) —
  // canonical query keys; the same key is reused by any other surface.
  const moduleDetails = useQueries({
    queries: (modulesQuery.data?.modules ?? []).slice(0, 100).map((m) => ({
      queryKey: queryKeys.learning.moduleProgress(m.module_id),
      queryFn: () => fetchModuleProgress(m.module_id),
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: false,
    })),
  });

  const overview = overviewQuery.data;
  const summary = gamificationQuery.data;
  const academyPct =
    overview && overview.total_modules > 0
      ? Math.round((overview.modules_completed / overview.total_modules) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Record"
        title="Your Expedition"
        description="Everything you have covered so far, region by region."
        aside={
          overview ? (
            <ProgressRing value={academyPct} size={96} color="var(--ember)">
              <span className="font-display text-xl font-semibold">{academyPct}%</span>
              <span className="block font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                Complete
              </span>
            </ProgressRing>
          ) : null
        }
      />

      {overviewQuery.isError ? (
        <ErrorState error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} />
      ) : overview ? (
        <>
          <section className="mb-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Level"
              value={summary?.level ?? "—"}
              hint={summary?.level_title ?? " "}
            />
            <Stat label="Total XP" value={formatXp(overview.total_xp)} color="var(--ember)" hint="All time" />
            <Stat
              label="Streak"
              value={`${overview.current_streak} days`}
              hint={`Personal best: ${overview.longest_streak} days`}
            />
            <Stat
              label="Missions complete"
              value={overview.modules_completed}
              hint={`Across ${categoriesQuery.data?.categories.length ?? 0} regions`}
            />
          </section>

          {/* Region breakdown */}
          <section className="mb-12">
            <SectionHeader eyebrow="Breakdown" title="Regions" />
            {(categoriesQuery.data?.categories ?? []).length === 0 ? (
              <EmptyState title="No regions yet" description="Content is being prepared. Check back soon." />
            ) : (
              <div className="panel divide-y divide-border">
                {(categoriesQuery.data?.categories ?? []).map((c) => {
                  const pct = c.module_count > 0 ? Math.round((c.completed_count / c.module_count) * 100) : 0;
                  const color = catColorForCode(c.code);
                  return (
                    <Link
                      key={c.slug}
                      to={`/categories/${c.slug}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 transition-colors hover:bg-accent/40 sm:grid-cols-[180px_minmax(0,1fr)_120px]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                        />
                        <span className="truncate font-semibold">{c.title}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <ProgressBar value={pct} color={color} label={`${c.title} completion`} />
                      </div>
                      <div className="text-right font-mono text-[11px] text-muted-foreground">
                        {c.completed_count}/{c.module_count} · {pct}%
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Module progress (authoritative per-module state) */}
          <section className="mb-12">
            <SectionHeader eyebrow="Missions" title="Module Progress" />
            {modulesQuery.isPending ? (
              <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
                <div className="panel h-28 animate-pulse" />
                <div className="panel h-28 animate-pulse" />
              </div>
            ) : modulesQuery.isError ? (
              <ErrorState error={modulesQuery.error} onRetry={() => void modulesQuery.refetch()} />
            ) : modulesQuery.data.modules.length === 0 ? (
              <EmptyState title="No modules available" description="Content is being prepared. Check back soon." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {modulesQuery.data.modules.map((mod, index) => {
                  const detail = moduleDetails[index];
                  const detailData = detail?.data;
                  return (
                    <li key={mod.module_id}>
                      <Link
                        to={`/modules/${mod.module_id}`}
                        className="panel block h-full p-4 transition-colors hover:border-primary/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{mod.title}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                              {mod.category} · {mod.estimated_duration ?? "—"} min
                            </p>
                          </div>
                          <Chip>{mod.difficulty}</Chip>
                        </div>

                        {/* Authoritative progress_pct — rendered verbatim. */}
                        <ProgressBar
                          className="mt-3"
                          value={mod.progress_pct}
                          color={mod.completed ? "var(--success)" : undefined}
                          label={`${mod.title}: ${mod.progress_pct}% complete`}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                          {mod.completed ? (
                            <Chip color="var(--success)">Completed</Chip>
                          ) : mod.progress_pct > 0 ? (
                            <Chip color="var(--ember)">In progress</Chip>
                          ) : (
                            <Chip>Not started</Chip>
                          )}
                          {detail?.isPending ? (
                            <span aria-hidden="true">…</span>
                          ) : detailData ? (
                            <span>
                              Quiz: {detailData.quiz_best_score === null ? "—" : formatScorePct(detailData.quiz_best_score)} ·{" "}
                              {detailData.quiz_attempts} attempt{detailData.quiz_attempts === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Recent activity (authoritative event log) */}
          <section className="mb-12">
            <SectionHeader eyebrow="Log" title="Recent Activity" />
            {overview.recent_activity.length === 0 ? (
              <EmptyState
                title="No learning activity yet"
                description="Complete a lesson or take a quiz to see your activity here."
              />
            ) : (
              <ul className="panel divide-y divide-border">
                {overview.recent_activity.map((event, i) => {
                  const moduleTitle = modulesQuery.data?.modules.find(
                    (m) => m.module_id === event.module_id,
                  )?.title;
                  return (
                    <li key={`${event.at}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip>{formatActivityAction(event.action)}</Chip>
                          <span className="truncate font-medium">{moduleTitle ?? "—"}</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {event.score !== null ? `Score ${formatScorePct(event.score)}` : event.at}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatRelativeTime(event.at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {overview.current_streak > 0 ? (
              <p className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] text-primary">
                <Flame className="size-3.5" /> Train today to keep your {overview.current_streak} day streak.
              </p>
            ) : null}
          </section>

          {/* Learning objective performance (authoritative only) */}
          <LearningObjectiveSection details={moduleDetails} />
        </>
      ) : (
        <div className="panel h-64 animate-pulse" aria-hidden="true" />
      )}
    </div>
  );
}

/** LO performance across modules — rendered only when the backend
 * provides it; missing data is NOT zero. */
interface ModuleDetailQueryLike {
  data?: import("@/lib/api/types").ModuleProgressResponse | undefined;
  isPending: boolean;
}

function LearningObjectiveSection({ details }: { details: ModuleDetailQueryLike[] }) {
  const loRows = details
    .map((d) => d.data?.lo_performance ?? [])
    .flat()
    .filter((lo) => lo.pct > 0);

  return (
    <section>
      <SectionHeader eyebrow="Objectives" title="Learning Objective Performance" />
      {loRows.length === 0 ? (
        <EmptyState
          title="No objective performance yet"
          description="Objective performance appears after you take quizzes."
        />
      ) : (
        <div className="panel divide-y divide-border">
          {loRows.map((lo) => (
            <div key={lo.lo_global_id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
              <p className="min-w-0 text-sm">{lo.lo_label}</p>
              <div className="flex items-center gap-3">
                <ProgressBar value={lo.pct} label={lo.lo_label} />
                <span className="w-10 shrink-0 text-right font-mono text-xs">{lo.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
