/**
 * Gamification — XP, streaks and achievements.
 *
 * Three things on this page are structurally easy to misread, so each is
 * labelled where it appears as well as in the endpoint's own notes:
 *
 * 1. XP is an AWARDED total, not XP earned once. A repeated lesson
 *    completion writes a fresh event and a fresh transaction, so a retry
 *    adds to the number. The tile says "awarded" and the backend's
 *    wording is rendered underneath.
 * 2. `streaks.distribution` is sparse: a streak length that nobody is on
 *    has no bucket at all, so the chart draws only the lengths that
 *    exist and never a zero bar for a missing one.
 * 3. `streak_rows` is not an engagement signal — a row is created lazily
 *    by any gamification read.
 *
 * The one state that must not be drawn as a bare zero is an unseeded
 * achievement catalogue: when `definition_count` is 0 nothing can unlock,
 * so the section renders the backend's `achievements_empty` explanation
 * instead of tiles reading 0.
 */
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import { formatAverage, formatCount, formatXp } from "@/lib/format/format";
import type { AdminAchievementRow, AdminXpBucket } from "@/lib/api/types";
import { fetchGamification } from "../analytics.api";
import {
  BarSeries,
  DataTable,
  HBars,
  KpiTile,
  MetricNotes,
  Num,
  RangeEcho,
  SectionCard,
  type Column,
} from "../charts";
import { useAnalyticsFilters } from "../filters";

const XP_COLUMNS: Array<Column<AdminXpBucket>> = [
  { key: "bucket", header: "Bucket", render: (row) => <Num>{row.bucket}</Num> },
  {
    key: "xp_awarded",
    header: "XP awarded",
    align: "right",
    render: (row) => <Num>{formatXp(row.xp_awarded)}</Num>,
  },
  {
    key: "users",
    header: "Users awarded",
    align: "right",
    render: (row) => <Num>{formatCount(row.users)}</Num>,
  },
];

const ACHIEVEMENT_COLUMNS: Array<Column<AdminAchievementRow>> = [
  { key: "title", header: "Achievement", render: (row) => row.title },
  { key: "key", header: "Key", render: (row) => <Num muted>{row.achievement_key}</Num> },
  {
    key: "unlocks",
    header: "Unlocks",
    align: "right",
    render: (row) => <Num>{formatCount(row.unlocks)}</Num>,
  },
];

export default function GamificationTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();

  const gamification = useQuery({
    queryKey: queryKeys.admin.analytics("gamification", seriesParams),
    queryFn: () => fetchGamification(seriesParams),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return (
      <p className="panel p-6 text-sm text-muted-foreground">
        Adjust the date range above to load these metrics.
      </p>
    );
  }

  if (gamification.isError) {
    return <ErrorState error={gamification.error} onRetry={() => void gamification.refetch()} />;
  }

  if (gamification.isPending) {
    return (
      <div className="grid gap-4" aria-hidden="true">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="panel-2 h-24 animate-pulse" />
          <div className="panel-2 h-24 animate-pulse" />
        </div>
        <div className="panel h-56 animate-pulse" />
        <div className="panel h-64 animate-pulse" />
      </div>
    );
  }

  const { range, xp, streaks, achievements } = gamification.data;

  // The backend emits this string in exactly the "no definitions" case and
  // `null` otherwise, so its presence is the catalogue's own statement.
  const achievementsEmptyNote = gamification.data.notes["achievements_empty"] ?? null;
  const definitionsMissing = achievements.definition_count === 0;

  return (
    <div>
      <SectionCard
        title="XP"
        description="Every XP transaction in the window, summed per bucket."
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiTile
            label="XP awarded"
            value={formatXp(xp.total_awarded)}
            hint="Awarded amounts — retries can re-award"
          />
          <KpiTile
            label="XP / active user"
            value={formatAverage(xp.per_active_user)}
            hint="Awarded XP ÷ users active in the trailing 30 days"
          />
        </div>
        <div className="mt-5">
          <BarSeries
            data={xp.series}
            valueOf={(row) => row.xp_awarded}
            labelOf={(row) => row.bucket}
            ariaLabel="XP awarded per bucket"
            formatValue={formatXp}
          />
        </div>
        <div className="mt-5">
          <DataTable
            columns={XP_COLUMNS}
            rows={xp.series}
            getRowKey={(row) => row.bucket}
            caption="XP awarded per bucket"
            emptyLabel="No XP was awarded in this range."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Streaks"
        description="Streak lengths are day counts. The distribution below draws only the lengths that have users — a length nobody is on has no bar, rather than a bar at zero."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiTile
            label="Users with a streak"
            value={formatCount(streaks.users_with_active_streak)}
            hint="Current streak above zero"
          />
          <KpiTile label="Avg current streak" value={formatAverage(streaks.avg_current_streak)} />
          <KpiTile label="Avg longest streak" value={formatAverage(streaks.avg_longest_streak)} />
          <KpiTile label="Max current streak" value={formatCount(streaks.max_current_streak)} />
          <KpiTile label="Max longest streak" value={formatCount(streaks.max_longest_streak)} />
          <KpiTile
            label="Streak rows"
            value={formatCount(streaks.streak_rows)}
            hint="Not an engagement signal"
          />
        </div>
        <div className="mt-5">
          <p className="eyebrow mb-3">Users by current streak length</p>
          <HBars
            rows={streaks.distribution}
            labelOf={(row) => row.bucket}
            valueOf={(row) => row.users}
            ariaLabel="Users by current streak length, in days"
            color="var(--cat-fire)"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Achievements"
        description={
          definitionsMissing
            ? "The backend reports no achievement definitions in this database."
            : "Unlocks recorded in range, and the definition catalogue they come from."
        }
      >
        {definitionsMissing ? (
          <div className="panel-2 border-dashed p-5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-3 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              Nothing can unlock
            </span>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              {achievementsEmptyNote ??
                "No achievement definitions have been seeded in this database, so no achievement can unlock."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiTile
                label="Unlocked in range"
                value={formatCount(achievements.unlocked_in_range)}
              />
              <KpiTile
                label="Users with unlocks"
                value={formatCount(achievements.users_with_unlocks)}
                hint="Distinct people"
              />
              <KpiTile
                label="Defined achievements"
                value={formatCount(achievements.definition_count)}
                hint="Available to unlock"
              />
            </div>
            <div className="mt-5">
              <DataTable
                columns={ACHIEVEMENT_COLUMNS}
                rows={achievements.top}
                getRowKey={(row) => row.achievement_key}
                caption="Most-unlocked achievements in range"
                emptyLabel="No achievements were unlocked in this range."
              />
            </div>
          </>
        )}
      </SectionCard>

      <MetricNotes notes={gamification.data.notes} />
    </div>
  );
}
