/**
 * Engagement — per-bucket activity counters for the selected window.
 *
 * Three rules shape this page:
 *
 * 1. `totals` carries two DIFFERENT populations. `learning_active_users`
 *    counts users who completed a lesson or submitted a quiz;
 *    `community_active_users` counts users who posted, commented or voted.
 *    The two overlap, so they sit in separate tiles and are never added
 *    into one "active users" figure.
 * 2. `lessons_started` only has rows from the moment the lesson-start
 *    instrumentation shipped. Buckets older than that undercount it, so
 *    the column is labelled rather than silently read as a trend.
 * 3. A bucket is dense — all thirteen counters are present on every row,
 *    zero where that source recorded nothing. The charts above pick a
 *    handful; the table below renders every column so the choice hides
 *    nothing.
 *
 * The endpoint's own definitions are rendered verbatim at the bottom —
 * this file writes no caveat copy of its own.
 */
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import { formatCount } from "@/lib/format/format";
import type { AdminEngagementBucket, AdminGranularity } from "@/lib/api/types";
import { fetchEngagement } from "../analytics.api";
import {
  BarSeries,
  DataTable,
  KpiTile,
  MetricNotes,
  Num,
  RangeEcho,
  SectionCard,
  Sparkline,
  type Column,
} from "../charts";
import { useAnalyticsFilters } from "../filters";
import { useTr, type Tr } from "../i18n";

type CounterKey = keyof Omit<AdminEngagementBucket, "bucket">;

/** Every counter the endpoint pivots into a bucket, in the contract's own
 * order. The table renders all of them; the charts above deliberately
 * show a subset, so the table is what keeps the rest from being hidden. */
function counters({ t }: Tr): ReadonlyArray<{ key: CounterKey; header: string }> {
  return [
    { key: "active_users", header: t("tabs.engagement.counterActiveUsers") },
    { key: "lesson_completions", header: t("tabs.engagement.counterLessonCompletions") },
    { key: "quiz_submissions", header: t("tabs.engagement.counterQuizSubmissions") },
    { key: "lessons_started", header: t("tabs.engagement.counterLessonStarts") },
    { key: "lessons_completed_events", header: t("tabs.engagement.counterCompletionEvents") },
    { key: "quizzes_started", header: t("tabs.engagement.counterQuizzesStarted") },
    { key: "quizzes_completed", header: t("tabs.engagement.counterQuizzesCompleted") },
    { key: "resource_downloads", header: t("tabs.engagement.counterDownloads") },
    { key: "community_posts", header: t("tabs.engagement.counterPosts") },
    { key: "community_comments", header: t("tabs.engagement.counterComments") },
    { key: "community_votes", header: t("tabs.engagement.counterVotes") },
    { key: "xp_awarded", header: t("tabs.engagement.counterXpAwarded") },
  ];
}

function columns(tr: Tr): Array<Column<AdminEngagementBucket>> {
  const { t } = tr;
  return [
    { key: "bucket", header: t("tabs.community.colBucket"), render: (row) => <Num>{row.bucket}</Num> },
    ...counters(tr).map(
      (counter): Column<AdminEngagementBucket> => ({
        key: counter.key,
        header: counter.header,
        align: "right",
        render: (row) => <Num>{formatCount(row[counter.key])}</Num>,
      }),
    ),
  ];
}

/** The counters worth looking at as a trend. Learning counters share the
 * ember accent; XP and the community counter keep their own. */
function trends({ t }: Tr): ReadonlyArray<{ key: CounterKey; label: string; color: string }> {
  return [
    { key: "active_users", label: t("tabs.engagement.counterActiveUsers"), color: "var(--ember)" },
    { key: "lesson_completions", label: t("tabs.engagement.counterLessonCompletions"), color: "var(--ember)" },
    { key: "lessons_started", label: t("tabs.engagement.counterLessonStarts"), color: "var(--ember)" },
    { key: "quiz_submissions", label: t("tabs.engagement.counterQuizSubmissions"), color: "var(--ember)" },
    { key: "xp_awarded", label: t("tabs.engagement.counterXpAwarded"), color: "var(--cat-food)" },
    { key: "community_posts", label: t("tabs.engagement.trendCommunityPosts"), color: "var(--cat-water)" },
  ];
}

/** The backend's bucket size, as a word the trend labels can use. */
const GRANULARITY_LABEL: Record<
  AdminGranularity,
  "filters.granularityDay" | "filters.granularityWeek" | "filters.granularityMonth"
> = {
  day: "filters.granularityDay",
  week: "filters.granularityWeek",
  month: "filters.granularityMonth",
};

export default function EngagementTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t, tf } = tr;

  const engagement = useQuery({
    queryKey: queryKeys.admin.analytics("engagement", seriesParams),
    queryFn: () => fetchEngagement(seriesParams),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRange")}</p>;
  }

  if (engagement.isError) {
    return (
      <ErrorState
        error={engagement.error}
        onRetry={() => void engagement.refetch()}
        explain={tr.errorCopy}
        labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
      />
    );
  }

  if (engagement.isPending) {
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

  const { range, granularity, totals, windows, series } = engagement.data;

  return (
    <div>
      <SectionCard
        title={t("tabs.engagement.activeUsersTitle")}
        description={t("tabs.engagement.activeUsersDescription")}
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiTile
            label={t("tabs.engagement.kpiLearningActiveUsers")}
            value={formatCount(totals.learning_active_users)}
            hint={t("tabs.engagement.kpiLearningActiveHint")}
          />
          <KpiTile
            label={t("tabs.engagement.kpiCommunityActiveUsers")}
            value={formatCount(totals.community_active_users)}
            hint={t("tabs.engagement.kpiCommunityActiveHint")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.engagement.activityTotalsTitle")}
        description={t("tabs.engagement.activityTotalsDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            label={t("tabs.engagement.kpiActiveDays")}
            value={formatCount(totals.active_days)}
            hint={t("tabs.engagement.kpiActiveDaysHint")}
          />
          <KpiTile
            label={t("tabs.engagement.kpiLessonsCompleted")}
            value={formatCount(totals.lesson_completions)}
            hint={t("tabs.engagement.kpiLessonsCompletedHint")}
          />
          <KpiTile
            label={t("tabs.engagement.kpiQuizSubmissions")}
            value={formatCount(totals.quiz_submissions)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.engagement.windowsTitle")}
        description={t("tabs.engagement.windowsDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            label={t("tabs.engagement.dau")}
            value={formatCount(windows.dau)}
            hint={t("tabs.engagement.dauHint")}
          />
          <KpiTile
            label={t("tabs.engagement.wau")}
            value={formatCount(windows.wau)}
            hint={t("tabs.engagement.wauHint")}
          />
          <KpiTile
            label={t("tabs.engagement.mau")}
            value={formatCount(windows.mau)}
            hint={t("tabs.engagement.mauHint")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.engagement.byBucketTitle")}
        description={t("tabs.engagement.byBucketDescription")}
      >
        <BarSeries
          data={series}
          valueOf={(row) => row.active_users}
          labelOf={(row) => row.bucket}
          ariaLabel={tf("tabs.engagement.activePerBucketAria", {
            granularity: t(GRANULARITY_LABEL[granularity as AdminGranularity]),
          })}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trends(tr).map((trend) => (
            <div key={trend.key} className="panel-2 p-4">
              <p className="eyebrow">{trend.label}</p>
              <div className="mt-2">
                <Sparkline
                  data={series}
                  valueOf={(row) => row[trend.key]}
                  ariaLabel={tf("tabs.engagement.trendPerBucketAria", { label: trend.label })}
                  color={trend.color}
                  width={220}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.engagement.allCountersTitle")}
        description={t("tabs.engagement.allCountersDescription")}
      >
        <DataTable
          columns={columns(tr)}
          rows={series}
          getRowKey={(row) => row.bucket}
          caption={t("tabs.engagement.allCountersCaption")}
          emptyLabel={t("tabs.engagement.allCountersEmpty")}
          minWidth={1240}
        />
        {/* Orientation for one column only: starts are a younger signal
            than completions, and the endpoint's notes do not carry a
            per-column label for it. */}
        <p className="mt-4 text-[13px] text-muted-foreground">
          {t("tabs.engagement.lessonStartsNote")}
        </p>
      </SectionCard>

      <MetricNotes notes={engagement.data.notes} />
    </div>
  );
}
