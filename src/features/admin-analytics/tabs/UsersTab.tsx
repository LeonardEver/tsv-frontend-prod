/**
 * Users — who is on the platform, how they arrive and where they are.
 *
 * Three numbers on this page are easy to collapse into one, so the page
 * keeps them apart. `by_plan` reports the EFFECTIVE plan (the resolution
 * matrix is in the notes below), not the stored subscription row.
 * `lessons_completed` counts accepted completions in range from
 * `daily_usage`; `lessons_completed_distinct` counts distinct lessons
 * from progress rows. They answer different questions — how much learning
 * happened versus how much material was covered — so they are rendered as
 * separate columns rather than a single "lessons" figure.
 *
 * `top_countries` is hard-limited to 20 rows server-side; the caption says
 * so, because a truncated list read as a complete one would understate the
 * long tail. This is a series endpoint: omitting the date range makes the
 * backend substitute its documented 30-day default, and the `range` echo
 * above the tiles says which window was actually used.
 */
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import type { AdminPlanRow, AdminTopCountryRow } from "@/lib/api/types";
import { formatAverage, formatCount, formatDate, formatPct, formatXp } from "@/lib/format/format";
import { COUNTRIES } from "@/lib/geo/countries";
import { fetchUsers } from "../analytics.api";
import {
  BarSeries,
  DataTable,
  HBars,
  KpiTile,
  MaybeNum,
  MetricNotes,
  Num,
  RangeEcho,
  SectionCard,
  type Column,
} from "../charts";
import { useAnalyticsFilters } from "../filters";

/** ISO alpha-2 → display name; the raw stored code when the list is
 * silent (the column is validated on write, so this is a fallback, not
 * an expected case). */
function countryLabel(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

const PLAN_COLUMNS: Array<Column<AdminPlanRow>> = [
  {
    key: "plan",
    header: "Plan",
    render: (row) => <span className="font-medium capitalize">{row.plan}</span>,
  },
  { key: "users", header: "Users", align: "right", render: (row) => <MaybeNum value={row.users} /> },
  {
    key: "share",
    header: "Share of users",
    align: "right",
    render: (row) => <MaybeNum value={row.percentage_of_users} format={formatPct} />,
  },
  {
    key: "active",
    header: "Active users",
    align: "right",
    render: (row) => <MaybeNum value={row.active_users} />,
  },
  {
    key: "active_rate",
    header: "Active rate",
    align: "right",
    render: (row) => <MaybeNum value={row.active_rate} format={formatPct} />,
  },
  {
    key: "trial",
    header: "Trial users",
    align: "right",
    render: (row) => <MaybeNum value={row.trial_users} />,
  },
  {
    key: "lessons",
    header: "Lessons completed",
    align: "right",
    render: (row) => <MaybeNum value={row.lessons_completed} />,
  },
  {
    key: "lessons_distinct",
    header: "Distinct lessons",
    align: "right",
    render: (row) => <MaybeNum value={row.lessons_completed_distinct} />,
  },
  {
    key: "quizzes",
    header: "Quiz submissions",
    align: "right",
    render: (row) => <MaybeNum value={row.quiz_submissions} />,
  },
  {
    key: "active_days",
    header: "Active days",
    align: "right",
    render: (row) => <MaybeNum value={row.active_days} />,
  },
  {
    key: "xp",
    header: "XP awarded",
    align: "right",
    render: (row) => <MaybeNum value={row.xp_awarded} format={formatXp} />,
  },
  {
    key: "lessons_per_active",
    header: "Lessons / active user",
    align: "right",
    render: (row) => <MaybeNum value={row.lessons_completed_per_active_user} format={formatAverage} />,
  },
  {
    key: "xp_per_active",
    header: "XP / active user",
    align: "right",
    render: (row) => <MaybeNum value={row.xp_per_active_user} format={formatAverage} />,
  },
];

const COUNTRY_COLUMNS: Array<Column<AdminTopCountryRow>> = [
  {
    key: "country",
    header: "Country",
    render: (row) => (
      <>
        <span>{countryLabel(row.country)}</span>
        <span className="block">
          <Num muted>{row.country}</Num>
        </span>
      </>
    ),
  },
  { key: "users", header: "Users", align: "right", render: (row) => <MaybeNum value={row.users} /> },
  {
    key: "paying",
    header: "Paying users",
    align: "right",
    render: (row) => <MaybeNum value={row.paying_users} />,
  },
];

export default function UsersTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();

  const users = useQuery({
    queryKey: queryKeys.admin.analytics("users", seriesParams),
    queryFn: () => fetchUsers(seriesParams),
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

  if (users.isError) {
    return <ErrorState error={users.error} onRetry={() => void users.refetch()} />;
  }

  if (users.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="panel-2 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const {
    range,
    totals,
    by_plan: byPlan,
    by_subscription_status: byStatus,
    new_users_series: newUserSeries,
    top_countries: topCountries,
    notes,
  } = users.data;

  const kpis: ReadonlyArray<{ label: string; value: number; hint?: string }> = [
    { label: "Total users", value: totals.total_users },
    { label: "New users", value: totals.new_users, hint: "Signed up in range" },
    { label: "Paying users", value: totals.paying_users, hint: "Effective plan ≠ free" },
    { label: "Free users", value: totals.free_users, hint: "Effective plan is free" },
    {
      label: "Churned users",
      value: totals.churned_users,
      hint: "Non-free plan on file, effective free now",
    },
  ];

  return (
    <div>
      <SectionCard
        title="Key metrics"
        description="Who the platform holds, as of the end of the selected window."
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiTile
              key={kpi.label}
              label={kpi.label}
              value={formatCount(kpi.value)}
              hint={kpi.hint}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="New users"
        description="Signups per bucket across the selected window."
      >
        <BarSeries
          data={newUserSeries}
          valueOf={(row) => row.new_users}
          labelOf={(row) => formatDate(row.bucket)}
          ariaLabel="New users per bucket"
        />
      </SectionCard>

      <SectionCard
        title="Plan breakdown"
        description="Always three rows — one per plan code, zero-filled. Lessons completed counts accepted completions in range; distinct lessons counts distinct lessons from progress rows."
      >
        <DataTable
          columns={PLAN_COLUMNS}
          rows={byPlan}
          getRowKey={(row) => row.plan}
          caption="Users by effective plan"
          emptyLabel="No plan rows in this range."
          minWidth={1400}
        />
      </SectionCard>

      <SectionCard
        title="Subscription status"
        description="The stored status on each subscription row — the input the effective-plan rules read, not their output. Users with no subscription row at all are absent here."
      >
        <HBars
          rows={byStatus}
          labelOf={(row) => row.status}
          valueOf={(row) => row.users}
          ariaLabel="Users by subscription status"
          color="var(--cat-water)"
        />
      </SectionCard>

      <SectionCard
        title="Top countries"
        description="Ranked by users. The server caps this list at 20 rows, so it is the head of the distribution and not the whole of it."
      >
        <DataTable
          columns={COUNTRY_COLUMNS}
          rows={topCountries}
          getRowKey={(row) => row.country}
          caption="Top countries by users"
          emptyLabel="No country rows in this range."
          minWidth={560}
        />
      </SectionCard>

      <div className="panel p-5">
        <MetricNotes notes={notes} />
      </div>
    </div>
  );
}
