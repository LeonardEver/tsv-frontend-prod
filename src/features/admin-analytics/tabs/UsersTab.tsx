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
import { useTr, type Tr } from "../i18n";

/** ISO alpha-2 → display name; the raw stored code when the list is
 * silent (the column is validated on write, so this is a fallback, not
 * an expected case). */
function countryLabel(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

function planColumns({ t }: Tr): Array<Column<AdminPlanRow>> {
  return [
    {
      key: "plan",
      header: t("tabs.users.colPlan"),
      render: (row) => <span className="font-medium capitalize">{row.plan}</span>,
    },
    {
      key: "users",
      header: t("tabs.users.colUsers"),
      align: "right",
      render: (row) => <MaybeNum value={row.users} />,
    },
    {
      key: "share",
      header: t("tabs.users.colShareOfUsers"),
      align: "right",
      render: (row) => <MaybeNum value={row.percentage_of_users} format={formatPct} />,
    },
    {
      key: "active",
      header: t("tabs.users.colActiveUsers"),
      align: "right",
      render: (row) => <MaybeNum value={row.active_users} />,
    },
    {
      key: "active_rate",
      header: t("tabs.users.colActiveRate"),
      align: "right",
      render: (row) => <MaybeNum value={row.active_rate} format={formatPct} />,
    },
    {
      key: "trial",
      header: t("tabs.users.colTrialUsers"),
      align: "right",
      render: (row) => <MaybeNum value={row.trial_users} />,
    },
    {
      key: "lessons",
      header: t("tabs.users.colLessonsCompleted"),
      align: "right",
      render: (row) => <MaybeNum value={row.lessons_completed} />,
    },
    {
      key: "lessons_distinct",
      header: t("tabs.users.colDistinctLessons"),
      align: "right",
      render: (row) => <MaybeNum value={row.lessons_completed_distinct} />,
    },
    {
      key: "quizzes",
      header: t("tabs.users.colQuizSubmissions"),
      align: "right",
      render: (row) => <MaybeNum value={row.quiz_submissions} />,
    },
    {
      key: "active_days",
      header: t("tabs.users.colActiveDays"),
      align: "right",
      render: (row) => <MaybeNum value={row.active_days} />,
    },
    {
      key: "xp",
      header: t("tabs.users.colXpAwarded"),
      align: "right",
      render: (row) => <MaybeNum value={row.xp_awarded} format={formatXp} />,
    },
    {
      key: "lessons_per_active",
      header: t("tabs.users.colLessonsPerActive"),
      align: "right",
      render: (row) => <MaybeNum value={row.lessons_completed_per_active_user} format={formatAverage} />,
    },
    {
      key: "xp_per_active",
      header: t("tabs.users.colXpPerActive"),
      align: "right",
      render: (row) => <MaybeNum value={row.xp_per_active_user} format={formatAverage} />,
    },
  ];
}

function countryColumns({ t }: Tr): Array<Column<AdminTopCountryRow>> {
  return [
    {
      key: "country",
      header: t("tabs.users.colCountry"),
      render: (row) => (
        <>
          <span>{countryLabel(row.country)}</span>
          <span className="block">
            <Num muted>{row.country}</Num>
          </span>
        </>
      ),
    },
    {
      key: "users",
      header: t("tabs.users.colUsers"),
      align: "right",
      render: (row) => <MaybeNum value={row.users} />,
    },
    {
      key: "paying",
      header: t("tabs.users.colPayingUsers"),
      align: "right",
      render: (row) => <MaybeNum value={row.paying_users} />,
    },
  ];
}

function kpiTiles({ t }: Tr): ReadonlyArray<{ label: string; key: string; hint?: string }> {
  return [
    { label: t("tabs.users.kpiTotalUsers"), key: "total_users" },
    { label: t("tabs.users.kpiNewUsers"), key: "new_users", hint: t("tabs.users.hintSignedUpInRange") },
    { label: t("tabs.users.kpiPayingUsers"), key: "paying_users", hint: t("tabs.users.hintEffectiveNotFree") },
    { label: t("tabs.users.kpiFreeUsers"), key: "free_users", hint: t("tabs.users.hintEffectiveFree") },
    { label: t("tabs.users.kpiChurnedUsers"), key: "churned_users", hint: t("tabs.users.hintChurned") },
  ];
}

export default function UsersTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t } = tr;

  const users = useQuery({
    queryKey: queryKeys.admin.analytics("users", seriesParams),
    queryFn: () => fetchUsers(seriesParams),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRange")}</p>;
  }

  if (users.isError) {
    return (
      <ErrorState
        error={users.error}
        onRetry={() => void users.refetch()}
        explain={tr.errorCopy}
        labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
      />
    );
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

  const kpis = kpiTiles(tr).map((kpi) => ({
    label: kpi.label,
    hint: kpi.hint,
    value: totals[kpi.key as keyof typeof totals],
  }));

  return (
    <div>
      <SectionCard
        title={t("tabs.users.keyMetricsTitle")}
        description={t("tabs.users.keyMetricsDescription")}
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
        title={t("tabs.users.newUsersTitle")}
        description={t("tabs.users.newUsersDescription")}
      >
        <BarSeries
          data={newUserSeries}
          valueOf={(row) => row.new_users}
          labelOf={(row) => formatDate(row.bucket)}
          ariaLabel={t("tabs.users.newUsersAria")}
        />
      </SectionCard>

      <SectionCard
        title={t("tabs.users.planBreakdownTitle")}
        description={t("tabs.users.planBreakdownDescription")}
      >
        <DataTable
          columns={planColumns(tr)}
          rows={byPlan}
          getRowKey={(row) => row.plan}
          caption={t("tabs.users.planBreakdownCaption")}
          emptyLabel={t("tabs.users.planBreakdownEmpty")}
          minWidth={1400}
        />
      </SectionCard>

      <SectionCard
        title={t("tabs.users.statusTitle")}
        description={t("tabs.users.statusDescription")}
      >
        <HBars
          rows={byStatus}
          labelOf={(row) => row.status}
          valueOf={(row) => row.users}
          ariaLabel={t("tabs.users.statusAria")}
          color="var(--cat-water)"
        />
      </SectionCard>

      <SectionCard
        title={t("tabs.users.topCountriesTitle")}
        description={t("tabs.users.topCountriesDescription")}
      >
        <DataTable
          columns={countryColumns(tr)}
          rows={topCountries}
          getRowKey={(row) => row.country}
          caption={t("tabs.users.topCountriesCaption")}
          emptyLabel={t("tabs.users.topCountriesEmpty")}
          minWidth={560}
        />
      </SectionCard>

      <div className="panel p-5">
        <MetricNotes notes={notes} />
      </div>
    </div>
  );
}
