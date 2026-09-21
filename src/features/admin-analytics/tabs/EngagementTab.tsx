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
import type { AdminEngagementBucket } from "@/lib/api/types";
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

/** Every counter the endpoint pivots into a bucket, in the contract's own
 * order. The table renders all of them; the charts above deliberately
 * show a subset, so the table is what keeps the rest from being hidden. */
const COUNTERS: ReadonlyArray<{
  key: keyof Omit<AdminEngagementBucket, "bucket">;
  header: string;
}> = [
  { key: "active_users", header: "Active users" },
  { key: "lesson_completions", header: "Lessons completed" },
  { key: "quiz_submissions", header: "Quiz submissions" },
  { key: "lessons_started", header: "Lesson starts" },
  { key: "lessons_completed_events", header: "Completion events" },
  { key: "quizzes_started", header: "Quizzes started" },
  { key: "quizzes_completed", header: "Quizzes completed" },
  { key: "resource_downloads", header: "Downloads" },
  { key: "community_posts", header: "Posts" },
  { key: "community_comments", header: "Comments" },
  { key: "community_votes", header: "Votes" },
  { key: "xp_awarded", header: "XP awarded" },
];

const COLUMNS: Array<Column<AdminEngagementBucket>> = [
  { key: "bucket", header: "Bucket", render: (row) => <Num>{row.bucket}</Num> },
  ...COUNTERS.map(
    (counter): Column<AdminEngagementBucket> => ({
      key: counter.key,
      header: counter.header,
      align: "right",
      render: (row) => <Num>{formatCount(row[counter.key])}</Num>,
    }),
  ),
];

/** The counters worth looking at as a trend. Learning counters share the
 * ember accent; XP and the community counter keep their own. */
const TRENDS: ReadonlyArray<{
  key: keyof Omit<AdminEngagementBucket, "bucket">;
  label: string;
  color: string;
}> = [
  { key: "active_users", label: "Active users", color: "var(--ember)" },
  { key: "lesson_completions", label: "Lessons completed", color: "var(--ember)" },
  { key: "lessons_started", label: "Lesson starts", color: "var(--ember)" },
  { key: "quiz_submissions", label: "Quiz submissions", color: "var(--ember)" },
  { key: "xp_awarded", label: "XP awarded", color: "var(--cat-food)" },
  { key: "community_posts", label: "Community posts", color: "var(--cat-water)" },
];

export default function EngagementTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();

  const engagement = useQuery({
    queryKey: queryKeys.admin.analytics("engagement", seriesParams),
    queryFn: () => fetchEngagement(seriesParams),
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

  if (engagement.isError) {
    return <ErrorState error={engagement.error} onRetry={() => void engagement.refetch()} />;
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
        title="Active users"
        description="Two different populations, counted independently. They overlap, so the two figures are not added together."
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiTile
            label="Learning-active users"
            value={formatCount(totals.learning_active_users)}
            hint="Completed a lesson or submitted a quiz"
          />
          <KpiTile
            label="Community-active users"
            value={formatCount(totals.community_active_users)}
            hint="Posted, commented or voted"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Activity totals"
        description="Totals for the selected window. All three come from learning activity — none of them describe the community."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            label="Active days"
            value={formatCount(totals.active_days)}
            hint="User-days with learning activity"
          />
          <KpiTile
            label="Lessons completed"
            value={formatCount(totals.lesson_completions)}
            hint="Accepted completions, not retry-inflated"
          />
          <KpiTile label="Quiz submissions" value={formatCount(totals.quiz_submissions)} />
        </div>
      </SectionCard>

      <SectionCard title="Activity windows" description="Measured as of the end of the selected range.">
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile label="DAU" value={formatCount(windows.dau)} hint="Active on the final day" />
          <KpiTile label="WAU" value={formatCount(windows.wau)} hint="Active in the trailing 7 days" />
          <KpiTile label="MAU" value={formatCount(windows.mau)} hint="Active in the trailing 30 days" />
        </div>
      </SectionCard>

      <SectionCard
        title="Activity by bucket"
        description="Active users in each bucket of the range, with the most-used counters trending beneath. A bucket with no activity is drawn as a faint stub, not as a gap."
      >
        <BarSeries
          data={series}
          valueOf={(row) => row.active_users}
          labelOf={(row) => row.bucket}
          ariaLabel={`Active users per ${granularity}`}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TRENDS.map((trend) => (
            <div key={trend.key} className="panel-2 p-4">
              <p className="eyebrow">{trend.label}</p>
              <div className="mt-2">
                <Sparkline
                  data={series}
                  valueOf={(row) => row[trend.key]}
                  ariaLabel={`${trend.label} per bucket`}
                  color={trend.color}
                  width={220}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Every counter, per bucket"
        description="All thirteen counters for every bucket, exactly as returned — including the ones the trends above do not chart."
      >
        <DataTable
          columns={COLUMNS}
          rows={series}
          getRowKey={(row) => row.bucket}
          caption="Engagement counters per bucket"
          emptyLabel="No buckets in this range."
          minWidth={1240}
        />
        {/* Orientation for one column only: starts are a younger signal
            than completions, and the endpoint's notes do not carry a
            per-column label for it. */}
        <p className="mt-4 text-[13px] text-muted-foreground">
          Lesson starts are recorded only from the date the lesson-start instrumentation shipped —
          buckets before that undercount them.
        </p>
      </SectionCard>

      <MetricNotes notes={engagement.data.notes} />
    </div>
  );
}
