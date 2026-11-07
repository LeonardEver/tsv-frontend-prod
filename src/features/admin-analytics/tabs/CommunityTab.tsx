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
import { useTr, type Tr } from "../i18n";

function seriesColumns({ t }: Tr): Array<Column<AdminCommunityBucket>> {
  return [
    { key: "bucket", header: t("tabs.community.colBucket"), render: (row) => <Num>{row.bucket}</Num> },
    {
      key: "posts",
      header: t("tabs.community.colPosts"),
      align: "right",
      render: (row) => <Num>{formatCount(row.posts)}</Num>,
    },
    {
      key: "comments",
      header: t("tabs.community.colComments"),
      align: "right",
      render: (row) => <Num>{formatCount(row.comments)}</Num>,
    },
    {
      key: "votes",
      header: t("tabs.community.colVotes"),
      align: "right",
      render: (row) => <Num>{formatCount(row.votes)}</Num>,
    },
  ];
}

function planColumns({ t }: Tr): Array<Column<AdminCommunityPlanRow>> {
  return [
    { key: "plan", header: t("tabs.community.colPlan"), render: (row) => <Num>{row.plan}</Num> },
    {
      key: "authors",
      header: t("tabs.community.colAuthors"),
      align: "right",
      render: (row) => <Num>{formatCount(row.authors)}</Num>,
    },
    {
      key: "posts",
      header: t("tabs.community.colPosts"),
      align: "right",
      render: (row) => <Num>{formatCount(row.posts)}</Num>,
    },
    {
      key: "comments",
      header: t("tabs.community.colComments"),
      align: "right",
      render: (row) => <Num>{formatCount(row.comments)}</Num>,
    },
  ];
}

export default function CommunityTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t } = tr;

  const community = useQuery({
    queryKey: queryKeys.admin.analytics("community", seriesParams),
    queryFn: () => fetchCommunity(seriesParams),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRange")}</p>;
  }

  if (community.isError) {
    return (
      <ErrorState
        error={community.error}
        onRetry={() => void community.refetch()}
        explain={tr.errorCopy}
        labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
      />
    );
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
        title={t("tabs.community.activityTitle")}
        description={t("tabs.community.activityDescription")}
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiTile label={t("tabs.community.kpiPosts")} value={formatCount(totals.posts)} />
          <KpiTile label={t("tabs.community.kpiComments")} value={formatCount(totals.comments)} />
          <KpiTile
            label={t("tabs.community.kpiVotes")}
            value={formatCount(totals.votes)}
            hint={t("tabs.community.kpiVotesHint")}
          />
          <KpiTile
            label={t("tabs.community.kpiReports")}
            value={formatCount(totals.reports)}
            hint={t("tabs.community.kpiReportsHint")}
          />
          <KpiTile
            label={t("tabs.community.kpiActiveUsers")}
            value={formatCount(totals.active_users)}
            hint={t("tabs.community.kpiActiveUsersHint")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.community.authorsTitle")}
        description={t("tabs.community.authorsDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            label={t("tabs.community.kpiPostAuthors")}
            value={formatCount(authors.posts)}
            hint={t("tabs.community.distinctPeople")}
          />
          <KpiTile
            label={t("tabs.community.kpiCommentAuthors")}
            value={formatCount(authors.comments)}
            hint={t("tabs.community.distinctPeople")}
          />
          <KpiTile
            label={t("tabs.community.kpiVoteAuthors")}
            value={formatCount(authors.votes)}
            hint={t("tabs.community.distinctPeople")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.community.byBucketTitle")}
        description={t("tabs.community.byBucketDescription")}
      >
        <BarSeries
          data={series}
          valueOf={(row) => row.posts}
          labelOf={(row) => row.bucket}
          ariaLabel={t("tabs.community.byBucketAria")}
          color="var(--cat-water)"
        />
        <div className="mt-5">
          <DataTable
            columns={seriesColumns(tr)}
            rows={series}
            getRowKey={(row) => row.bucket}
            caption={t("tabs.community.byBucketCaption")}
            emptyLabel={t("tabs.community.byBucketEmpty")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.community.byPlanTitle")}
        description={t("tabs.community.byPlanDescription")}
      >
        <HBars
          rows={byPlan}
          labelOf={(row) => row.plan}
          valueOf={(row) => row.posts}
          ariaLabel={t("tabs.community.byPlanAria")}
          color="var(--cat-water)"
        />
        <div className="mt-5">
          <DataTable
            columns={planColumns(tr)}
            rows={byPlan}
            getRowKey={(row) => row.plan}
            caption={t("tabs.community.byPlanCaption")}
            emptyLabel={t("tabs.community.byPlanEmpty")}
          />
        </div>
      </SectionCard>

      <MetricNotes notes={community.data.notes} />
    </div>
  );
}
