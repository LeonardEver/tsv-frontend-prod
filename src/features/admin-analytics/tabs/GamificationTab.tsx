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
 * instead of tiles reading 0. That note is a backend string and is shown
 * verbatim; the fallback used when it is absent is frontend copy and is
 * translated.
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
import { useTr, type Tr } from "../i18n";

function xpColumns({ t }: Tr): Array<Column<AdminXpBucket>> {
  return [
    { key: "bucket", header: t("tabs.gamification.colBucket"), render: (row) => <Num>{row.bucket}</Num> },
    {
      key: "xp_awarded",
      header: t("tabs.gamification.colXpAwarded"),
      align: "right",
      render: (row) => <Num>{formatXp(row.xp_awarded)}</Num>,
    },
    {
      key: "users",
      header: t("tabs.gamification.colUsersAwarded"),
      align: "right",
      render: (row) => <Num>{formatCount(row.users)}</Num>,
    },
  ];
}

function achievementColumns({ t }: Tr): Array<Column<AdminAchievementRow>> {
  return [
    { key: "title", header: t("tabs.gamification.colAchievement"), render: (row) => row.title },
    { key: "key", header: t("tabs.gamification.colKey"), render: (row) => <Num muted>{row.achievement_key}</Num> },
    {
      key: "unlocks",
      header: t("tabs.gamification.colUnlocks"),
      align: "right",
      render: (row) => <Num>{formatCount(row.unlocks)}</Num>,
    },
  ];
}

export default function GamificationTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t } = tr;

  const gamification = useQuery({
    queryKey: queryKeys.admin.analytics("gamification", seriesParams),
    queryFn: () => fetchGamification(seriesParams),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRange")}</p>;
  }

  if (gamification.isError) {
    return (
      <ErrorState
        error={gamification.error}
        onRetry={() => void gamification.refetch()}
        explain={tr.errorCopy}
        labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
      />
    );
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
        title={t("tabs.gamification.xpTitle")}
        description={t("tabs.gamification.xpDescription")}
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiTile
            label={t("tabs.gamification.kpiXpAwarded")}
            value={formatXp(xp.total_awarded)}
            hint={t("tabs.gamification.kpiXpAwardedHint")}
          />
          <KpiTile
            label={t("tabs.gamification.kpiXpPerActive")}
            value={formatAverage(xp.per_active_user)}
            hint={t("tabs.gamification.kpiXpPerActiveHint")}
          />
        </div>
        <div className="mt-5">
          <BarSeries
            data={xp.series}
            valueOf={(row) => row.xp_awarded}
            labelOf={(row) => row.bucket}
            ariaLabel={t("tabs.gamification.xpPerBucketAria")}
            formatValue={formatXp}
          />
        </div>
        <div className="mt-5">
          <DataTable
            columns={xpColumns(tr)}
            rows={xp.series}
            getRowKey={(row) => row.bucket}
            caption={t("tabs.gamification.xpCaption")}
            emptyLabel={t("tabs.gamification.xpEmpty")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.gamification.streaksTitle")}
        description={t("tabs.gamification.streaksDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiTile
            label={t("tabs.gamification.kpiUsersWithStreak")}
            value={formatCount(streaks.users_with_active_streak)}
            hint={t("tabs.gamification.kpiUsersWithStreakHint")}
          />
          <KpiTile
            label={t("tabs.gamification.kpiAvgCurrentStreak")}
            value={formatAverage(streaks.avg_current_streak)}
          />
          <KpiTile
            label={t("tabs.gamification.kpiAvgLongestStreak")}
            value={formatAverage(streaks.avg_longest_streak)}
          />
          <KpiTile
            label={t("tabs.gamification.kpiMaxCurrentStreak")}
            value={formatCount(streaks.max_current_streak)}
          />
          <KpiTile
            label={t("tabs.gamification.kpiMaxLongestStreak")}
            value={formatCount(streaks.max_longest_streak)}
          />
          <KpiTile
            label={t("tabs.gamification.kpiStreakRows")}
            value={formatCount(streaks.streak_rows)}
            hint={t("tabs.gamification.kpiStreakRowsHint")}
          />
        </div>
        <div className="mt-5">
          <p className="eyebrow mb-3">{t("tabs.gamification.distributionLabel")}</p>
          <HBars
            rows={streaks.distribution}
            labelOf={(row) => row.bucket}
            valueOf={(row) => row.users}
            ariaLabel={t("tabs.gamification.distributionAria")}
            color="var(--cat-fire)"
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.gamification.achievementsTitle")}
        description={
          definitionsMissing
            ? t("tabs.gamification.achievementsDescriptionEmpty")
            : t("tabs.gamification.achievementsDescription")
        }
      >
        {definitionsMissing ? (
          <div className="panel-2 border-dashed p-5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-3 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {t("tabs.gamification.nothingCanUnlock")}
            </span>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              {achievementsEmptyNote ?? t("tabs.gamification.achievementsFallback")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiTile
                label={t("tabs.gamification.kpiUnlockedInRange")}
                value={formatCount(achievements.unlocked_in_range)}
              />
              <KpiTile
                label={t("tabs.gamification.kpiUsersWithUnlocks")}
                value={formatCount(achievements.users_with_unlocks)}
                hint={t("tabs.gamification.kpiUsersWithUnlocksHint")}
              />
              <KpiTile
                label={t("tabs.gamification.kpiDefinedAchievements")}
                value={formatCount(achievements.definition_count)}
                hint={t("tabs.gamification.kpiDefinedAchievementsHint")}
              />
            </div>
            <div className="mt-5">
              <DataTable
                columns={achievementColumns(tr)}
                rows={achievements.top}
                getRowKey={(row) => row.achievement_key}
                caption={t("tabs.gamification.achievementsCaption")}
                emptyLabel={t("tabs.gamification.achievementsEmpty")}
              />
            </div>
          </>
        )}
      </SectionCard>

      <MetricNotes notes={gamification.data.notes} />
    </div>
  );
}
