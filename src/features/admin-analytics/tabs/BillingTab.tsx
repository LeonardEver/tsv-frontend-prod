/**
 * Billing — subscription state as stored, beside what it resolves to.
 *
 * Two plan views that must not be read as one: `subscriptions.by_plan`
 * reads the stored `subscriptions.plan_code` column, while
 * `effective_plans` applies the status/period matrix. A cancelled or
 * unpaid subscription still carries its stored code in the first view and
 * resolves to `free` in the second, so the two counts legitimately
 * disagree — the copy on each card says which one it is.
 *
 * `movement.trials` counts subscriptions that are CURRENTLY trialing
 * whose period began in range. There is no `trial_started_at`, so a trial
 * that ended inside the range is not counted: it is not "trials started",
 * and the tile says so rather than leaving the word to imply it. Revenue
 * and plan changes have no source in this database at all, so they are
 * rendered as unsupported instead of approximated.
 *
 * This is a series endpoint: omitting the date range makes the backend
 * substitute its documented 30-day default, and the `range` echo says
 * which window was actually used.
 */
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import type { AdminBillingPlanRow, AdminBillingStatusRow } from "@/lib/api/types";
import { formatCount, formatDate } from "@/lib/format/format";
import { fetchBilling } from "../analytics.api";
import {
  BarSeries,
  DataTable,
  KpiTile,
  MaybeNum,
  MetricNotes,
  RangeEcho,
  SectionCard,
  UnsupportedBlock,
  type Column,
} from "../charts";
import { useAnalyticsFilters } from "../filters";
import { useTr, type Tr } from "../i18n";

function planColumns({ t }: Tr): Array<Column<AdminBillingPlanRow>> {
  return [
    {
      key: "plan",
      header: t("tabs.billing.colPlanCode"),
      render: (row) => <span className="font-medium capitalize">{row.plan}</span>,
    },
    {
      key: "users",
      header: t("tabs.billing.colSubscriptionRows"),
      align: "right",
      render: (row) => <MaybeNum value={row.users} />,
    },
  ];
}

function statusColumns({ t }: Tr): Array<Column<AdminBillingStatusRow>> {
  return [
    {
      key: "status",
      header: t("tabs.billing.colStatus"),
      render: (row) => <span>{row.status}</span>,
    },
    {
      key: "users",
      header: t("tabs.billing.colSubscriptionRows"),
      align: "right",
      render: (row) => <MaybeNum value={row.users} />,
    },
  ];
}

export default function BillingTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t, tf } = tr;

  const billing = useQuery({
    queryKey: queryKeys.admin.analytics("billing", seriesParams),
    queryFn: () => fetchBilling(seriesParams),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRange")}</p>;
  }

  if (billing.isError) {
    return (
      <ErrorState
        error={billing.error}
        onRetry={() => void billing.refetch()}
        explain={tr.errorCopy}
        labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
      />
    );
  }

  if (billing.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="panel-2 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const {
    range,
    subscriptions,
    effective_plans: effectivePlans,
    movement,
    revenue,
    upgrades_downgrades: upgradesDowngrades,
    notes,
  } = billing.data;

  const effectiveKpis: ReadonlyArray<{ label: string; value: number; hint: string }> = [
    { label: t("tabs.billing.kpiPayingUsers"), value: effectivePlans.paying_users, hint: t("tabs.billing.kpiPayingUsersHint") },
    { label: t("tabs.billing.kpiFreeUsers"), value: effectivePlans.free_users, hint: t("tabs.billing.kpiFreeUsersHint") },
    { label: t("tabs.billing.kpiTrialUsers"), value: effectivePlans.trial_users, hint: t("tabs.billing.kpiTrialUsersHint") },
    {
      label: t("tabs.billing.kpiChurnedUsers"),
      value: effectivePlans.churned_users,
      hint: t("tabs.billing.kpiChurnedUsersHint"),
    },
  ];

  const movementKpis: ReadonlyArray<{ label: string; value: number; hint: string }> = [
    { label: t("tabs.billing.kpiNewSubscriptions"), value: movement.new_subscriptions, hint: t("tabs.billing.kpiNewSubscriptionsHint") },
    { label: t("tabs.billing.kpiCancellations"), value: movement.cancellations, hint: t("tabs.billing.kpiCancellationsHint") },
    {
      label: t("tabs.billing.kpiTrials"),
      value: movement.trials,
      hint: t("tabs.billing.kpiTrialsHint"),
    },
  ];

  return (
    <div>
      <SectionCard
        title={t("tabs.billing.effectiveTitle")}
        description={t("tabs.billing.effectiveDescription")}
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {effectiveKpis.map((kpi) => (
            <KpiTile key={kpi.label} label={kpi.label} value={formatCount(kpi.value)} hint={kpi.hint} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.billing.movementTitle")}
        description={t("tabs.billing.movementDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {movementKpis.map((kpi) => (
            <KpiTile key={kpi.label} label={kpi.label} value={formatCount(kpi.value)} hint={kpi.hint} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">{t("tabs.billing.newSubscriptions")}</p>
            <BarSeries
              data={movement.series}
              valueOf={(row) => row.new_subscriptions}
              labelOf={(row) => formatDate(row.bucket)}
              ariaLabel={t("tabs.billing.newSubscriptionsAria")}
            />
          </div>
          <div>
            <p className="eyebrow mb-2">{t("tabs.billing.cancellations")}</p>
            <BarSeries
              data={movement.series}
              valueOf={(row) => row.cancellations}
              labelOf={(row) => formatDate(row.bucket)}
              ariaLabel={t("tabs.billing.cancellationsAria")}
              color="var(--destructive)"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.billing.planCodeTitle")}
        description={t("tabs.billing.planCodeDescription")}
      >
        <DataTable
          columns={planColumns(tr)}
          rows={subscriptions.by_plan}
          getRowKey={(row) => row.plan}
          caption={t("tabs.billing.planCodeCaption")}
          emptyLabel={t("tabs.billing.planCodeEmpty")}
          minWidth={520}
        />
        <p className="mt-4 text-[13px] text-muted-foreground">
          {tf("tabs.billing.totalRows", { count: formatCount(subscriptions.total_rows) })}
        </p>
      </SectionCard>

      <SectionCard
        title={t("tabs.billing.statusTitle")}
        description={t("tabs.billing.statusDescription")}
      >
        <DataTable
          columns={statusColumns(tr)}
          rows={subscriptions.by_status}
          getRowKey={(row) => row.status}
          caption={t("tabs.billing.statusCaption")}
          emptyLabel={t("tabs.billing.statusEmpty")}
          minWidth={520}
        />
      </SectionCard>

      <SectionCard
        title={t("tabs.billing.unsupportedTitle")}
        description={t("tabs.billing.unsupportedDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <UnsupportedBlock label={t("tabs.billing.unsupportedRevenue")} metric={revenue} />
          <UnsupportedBlock label={t("tabs.billing.unsupportedPlanChanges")} metric={upgradesDowngrades} />
        </div>
      </SectionCard>

      <div className="panel p-5">
        <MetricNotes notes={notes} />
      </div>
    </div>
  );
}
