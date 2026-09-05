/**
 * Gamification surface (Phase 14 §13–§21, §35; restyled Phase 23). The
 * Lovable reference `src/routes/gamification.tsx` is the visual source
 * of truth: PageHeader with XPBadge, hero panel (level + title), stat
 * tiles, achievement wall, XP transaction ledger.
 *
 * Everything here is rendered from authoritative backend state: XP,
 * level, next-level threshold, streak, achievements and the transaction
 * history are server values. No XP/streak/achievement logic exists in
 * the frontend. Missing achievement progress is rendered as "Not earned"
 * — never fabricated as a percentage.
 *
 * NOTE (Phase 14 §15): no level-progress ring or bar is drawn — the
 * backend exposes no level-threshold value, and inventing a progression
 * curve is forbidden. The hero shows level/title textually.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/keys";
import { AchievementCard } from "@/components/sa/cards";
import {
  Eyebrow,
  LevelBadge,
  SectionHeader,
  Stat,
  XPBadge,
} from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatXp } from "@/lib/format/format";
import { fetchGamificationSummary } from "@/features/dashboard/dashboard.api";
import { fetchAchievements } from "./gamification.api";

const XP_SOURCE_LABELS: Record<string, string> = {
  lesson_completed: "Lesson completed",
  quiz_completed: "Quiz completed",
  quiz_passed: "Quiz passed",
  module_completed: "Module completed",
  achievement: "Achievement",
  streak_milestone: "Streak milestone",
};

export default function GamificationPage() {
  const summaryQuery = useQuery({
    queryKey: queryKeys.gamification.summary,
    queryFn: fetchGamificationSummary,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const achievementsQuery = useQuery({
    queryKey: queryKeys.gamification.achievements,
    queryFn: fetchAchievements,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const summary = summaryQuery.data;
  const achievements = achievementsQuery.data;

  const earnedCount = achievements?.earned.length ?? summary?.achievements_earned ?? 0;
  const totalCount = achievements
    ? achievements.earned.length + achievements.unearned.length
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Rewards"
        title="Progression"
        description="XP, level and achievements are awarded by the academy — this page renders them."
        aside={summary ? <XPBadge xp={summary.total_xp} pulse /> : null}
      />

      {summaryQuery.isError ? (
        <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : summary ? (
        <section className="rise panel mb-10 grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-8">
          <div className="grid size-[130px] shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10">
            <span className="text-center">
              <span className="block font-display text-3xl font-semibold text-primary">
                {summary.level}
              </span>
              <span className="block font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                Level
              </span>
            </span>
          </div>
          <div className="min-w-0">
            <Eyebrow>Current title</Eyebrow>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-wide uppercase">
              {summary.level_title}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <LevelBadge level={summary.level} />
              <p className="font-mono text-[11px] text-muted-foreground">
                {summary.xp_to_next_level === null
                  ? "Maximum level reached"
                  : `${formatXp(summary.xp_to_next_level)} XP toward Level ${summary.level + 1}`}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="panel mb-10 h-40 animate-pulse" aria-hidden="true" />
      )}

      {summary ? (
        <section className="mb-12 grid gap-4 sm:grid-cols-3">
          <Stat label="Total XP" value={formatXp(summary.total_xp)} color="var(--ember)" />
          <Stat
            label="Streak"
            value={`${summary.current_streak} days`}
            hint={`Personal best: ${summary.longest_streak} days · keep it alive today`}
          />
          <Stat
            label="Achievements"
            value={totalCount > 0 ? `${earnedCount} / ${totalCount}` : earnedCount}
          />
        </section>
      ) : null}

      <section className="mb-12">
        <SectionHeader eyebrow="Wall" title="Achievements" />
        {achievementsQuery.isError ? (
          <ErrorState
            error={achievementsQuery.error}
            onRetry={() => void achievementsQuery.refetch()}
          />
        ) : achievementsQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            <div className="panel-2 h-44 animate-pulse" />
            <div className="panel-2 h-44 animate-pulse" />
            <div className="panel-2 h-44 animate-pulse" />
          </div>
        ) : achievements && achievements.earned.length === 0 && achievements.unearned.length === 0 ? (
          <EmptyState
            title="No achievements yet"
            description="Your achievements will appear here as you learn."
          />
        ) : achievements ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {achievements.earned.map((a) => (
              <AchievementCard
                key={a.achievement_key}
                achievement={{
                  id: a.achievement_key,
                  name: a.title,
                  description: a.description,
                  earned: true,
                  earnedAt: formatDate(a.earned_at),
                }}
              />
            ))}
            {achievements.unearned.map((a) => (
              <AchievementCard
                key={a.achievement_key}
                achievement={{
                  id: a.achievement_key,
                  name: a.title,
                  description: a.description,
                  earned: false,
                }}
                progressPct={a.progress?.pct}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <SectionHeader eyebrow="Ledger" title="XP Transactions" />
        {summary && summary.recent_transactions.length > 0 ? (
          <ul className="panel divide-y divide-border">
            {summary.recent_transactions.map((tx, i) => (
              <li key={`${tx.at}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {XP_SOURCE_LABELS[tx.source] ?? tx.source.replaceAll("_", " ")}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">{formatDate(tx.at)}</p>
                </div>
                <span className="font-mono text-sm text-primary">+{formatXp(tx.amount)} XP</span>
              </li>
            ))}
          </ul>
        ) : summary ? (
          <EmptyState
            title="No XP earned yet"
            description="Complete a lesson or take a quiz to earn XP."
          />
        ) : null}
      </section>
    </div>
  );
}
