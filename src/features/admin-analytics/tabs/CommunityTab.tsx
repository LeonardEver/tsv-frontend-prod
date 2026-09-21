/**
 * Community — posts, comments, votes and reports over the selected window.
 *
 * The distinction that shapes this page: `totals` counts ROWS, while
 * `unique_authors` counts PEOPLE. The same person posting five times is
 * five in one panel and one in the other, so the two never share a tile
 * or a total.
 *
 * Two of the four action counters are structurally narrower than their
 * names suggest, and both are labelled where they appear rather than left
 * to be misread:
 *
 * - votes are upvote-only. A row exists while a user's upvote stands;
 *   there is no downvote row, so this is not "reactions".
 * - reports are unique per (reporter, target) — re-reporting the same
 *   target does not add a row, so this is not "report volume".
 *
 * The endpoint's own wording for both comes back in `notes` and is shown
 * verbatim at the bottom.
 */
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import { formatCount } from "@/lib/format/format";
import type { AdminCommunityBucket, AdminCommunityPlanRow } from "@/lib/api/types";
import { fetchCommunity } from "../analytics.api";
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

const SERIES_COLUMNS: Array<Column<AdminCommunityBucket>> = [
  { key: "bucket", header: "Bucket", render: (row) => <Num>{row.bucket}</Num> },
  {
    key: "posts",
    header: "Posts",
    align: "right",
    render: (row) => <Num>{formatCount(row.posts)}</Num>,
  },
  {
    key: "comments",
    header: "Comments",
    align: "right",
    render: (row) => <Num>{formatCount(row.comments)}</Num>,
  },
  {
    key: "votes",
    header: "Votes",
    align: "right",
    render: (row) => <Num>{formatCount(row.votes)}</Num>,
  },
];

const PLAN_COLUMNS: Array<Column<AdminCommunityPlanRow>> = [
  { key: "plan", header: "Plan", render: (row) => <Num>{row.plan}</Num> },
  {
    key: "authors",
    header: "Authors",
    align: "right",
    render: (row) => <Num>{formatCount(row.authors)}</Num>,
  },
  {
    key: "posts",
    header: "Posts",
    align: "right",
    render: (row) => <Num>{formatCount(row.posts)}</Num>,
  },
  {
    key: "comments",
    header: "Comments",
    align: "right",
    render: (row) => <Num>{formatCount(row.comments)}</Num>,
  },
];

export default function CommunityTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();

  const community = useQuery({
    queryKey: queryKeys.admin.analytics("community", seriesParams),
    queryFn: () => fetchCommunity(seriesParams),
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

  if (community.isError) {
    return <ErrorState error={community.error} onRetry={() => void community.refetch()} />;
  }

  if (community.isPending) {
    return (
      <div className="grid gap-4" aria-hidden="true">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="panel-2 h-24 animate-pulse" />
          <div className="panel-2 h-24 animate-pulse" />
          <div className="panel-2 h-24 animate-pulse" />
        </div>
        <div className="panel h-56 animate-pulse" />
        <div className="panel h-64 animate-pulse" />
      </div>
    );
  }

  const { range, totals, unique_authors: authors, by_plan: byPlan, series } = community.data;

  return (
    <div>
      <SectionCard
        title="Community activity"
        description="Row counts for every action in range — one row per event, not one per person."
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiTile label="Posts" value={formatCount(totals.posts)} />
          <KpiTile label="Comments" value={formatCount(totals.comments)} />
          <KpiTile label="Votes" value={formatCount(totals.votes)} hint="Upvote only" />
          <KpiTile
            label="Reports"
            value={formatCount(totals.reports)}
            hint="Unique per reporter and target"
          />
          <KpiTile
            label="Active users"
            value={formatCount(totals.active_users)}
            hint="Posted, commented or voted"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Distinct authors"
        description="People, not rows. Someone who posted five times is one author here and five posts in the panel above."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile label="Post authors" value={formatCount(authors.posts)} hint="Distinct people" />
          <KpiTile
            label="Comment authors"
            value={formatCount(authors.comments)}
            hint="Distinct people"
          />
          <KpiTile label="Vote authors" value={formatCount(authors.votes)} hint="Distinct people" />
        </div>
      </SectionCard>

      <SectionCard
        title="Posts by bucket"
        description="Posts created in each bucket of the range, with the comments and votes recorded alongside them."
      >
        <BarSeries
          data={series}
          valueOf={(row) => row.posts}
          labelOf={(row) => row.bucket}
          ariaLabel="Community posts per bucket"
          color="var(--cat-water)"
        />
        <div className="mt-5">
          <DataTable
            columns={SERIES_COLUMNS}
            rows={series}
            getRowKey={(row) => row.bucket}
            caption="Community rows per bucket"
            emptyLabel="No buckets in this range."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="By plan"
        description="Posts and comments attributed to the plan of their author. Votes are not broken down by plan."
      >
        <HBars
          rows={byPlan}
          labelOf={(row) => row.plan}
          valueOf={(row) => row.posts}
          ariaLabel="Posts per plan"
          color="var(--cat-water)"
        />
        <div className="mt-5">
          <DataTable
            columns={PLAN_COLUMNS}
            rows={byPlan}
            getRowKey={(row) => row.plan}
            caption="Community activity by plan"
            emptyLabel="No plans to break down for this range."
          />
        </div>
      </SectionCard>

      <MetricNotes notes={community.data.notes} />
    </div>
  );
}
