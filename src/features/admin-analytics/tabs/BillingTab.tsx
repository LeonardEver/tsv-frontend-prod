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

const PLAN_COLUMNS: Array<Column<AdminBillingPlanRow>> = [
  {
    key: "plan",
    header: "Plan code on file",
    render: (row) => <span className="font-medium capitalize">{row.plan}</span>,
  },
  {
    key: "users",
    header: "Subscription rows",
    align: "right",
    render: (row) => <MaybeNum value={row.users} />,
  },
];

const STATUS_COLUMNS: Array<Column<AdminBillingStatusRow>> = [
  {
    key: "status",
    header: "Status",
    render: (row) => <span>{row.status}</span>,
  },
  {
    key: "users",
    header: "Subscription rows",
    align: "right",
    render: (row) => <MaybeNum value={row.users} />,
  },
];

export default function BillingTab() {
  const { seriesParams, rangeRejected } = useAnalyticsFilters();

  const billing = useQuery({
    queryKey: queryKeys.admin.analytics("billing", seriesParams),
    queryFn: () => fetchBilling(seriesParams),
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

  if (billing.isError) {
    return <ErrorState error={billing.error} onRetry={() => void billing.refetch()} />;
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
    { label: "Paying users", value: effectivePlans.paying_users, hint: "Effective plan ≠ free" },
    { label: "Free users", value: effectivePlans.free_users, hint: "Effective plan is free" },
    { label: "Trial users", value: effectivePlans.trial_users, hint: "Currently trialing" },
    {
      label: "Churned users",
      value: effectivePlans.churned_users,
      hint: "Non-free plan on file, effective free now",
    },
  ];

  const movementKpis: ReadonlyArray<{ label: string; value: number; hint: string }> = [
    { label: "New subscriptions", value: movement.new_subscriptions, hint: "Created in range" },
    { label: "Cancellations", value: movement.cancellations, hint: "Cancelled in range" },
    {
      label: "Trials",
      value: movement.trials,
      hint: "Currently trialing whose period began in range — not trials started",
    },
  ];

  return (
    <div>
      <SectionCard
        title="Effective plans"
        description="What each user's plan resolves to right now, after the stored status and period rules are applied — the plan the entitlement checks see."
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {effectiveKpis.map((kpi) => (
            <KpiTile key={kpi.label} label={kpi.label} value={formatCount(kpi.value)} hint={kpi.hint} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Subscription movement"
        description="Subscriptions created and cancelled in the selected window, and the ones trialing now."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {movementKpis.map((kpi) => (
            <KpiTile key={kpi.label} label={kpi.label} value={formatCount(kpi.value)} hint={kpi.hint} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">New subscriptions</p>
            <BarSeries
              data={movement.series}
              valueOf={(row) => row.new_subscriptions}
              labelOf={(row) => formatDate(row.bucket)}
              ariaLabel="New subscriptions per bucket"
            />
          </div>
          <div>
            <p className="eyebrow mb-2">Cancellations</p>
            <BarSeries
              data={movement.series}
              valueOf={(row) => row.cancellations}
              labelOf={(row) => formatDate(row.bucket)}
              ariaLabel="Cancellations per bucket"
              color="var(--destructive)"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Plan code on file"
        description="Every subscription row grouped by its stored subscriptions.plan_code — raw state, before the effective-plan rules are applied. A cancelled or unpaid subscription still carries its stored code here, so this view differs from the effective-plan tiles above."
      >
        <DataTable
          columns={PLAN_COLUMNS}
          rows={subscriptions.by_plan}
          getRowKey={(row) => row.plan}
          caption="Subscription rows by stored plan code"
          emptyLabel="No subscription rows."
          minWidth={520}
        />
        <p className="mt-4 text-[13px] text-muted-foreground">
          {formatCount(subscriptions.total_rows)} subscription rows in total across these plans.
        </p>
      </SectionCard>

      <SectionCard
        title="Subscription status"
        description="The stored status behind each subscription row — the input the effective-plan rules read, not their output."
      >
        <DataTable
          columns={STATUS_COLUMNS}
          rows={subscriptions.by_status}
          getRowKey={(row) => row.status}
          caption="Subscription rows by status"
          emptyLabel="No subscription rows."
          minWidth={520}
        />
      </SectionCard>

      <SectionCard
        title="Not measurable from this database"
        description="The backend reports these as unsupported rather than approximating them."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <UnsupportedBlock label="Revenue / MRR / ARR" metric={revenue} />
          <UnsupportedBlock label="Upgrades & downgrades" metric={upgradesDowngrades} />
        </div>
      </SectionCard>

      <div className="panel p-5">
        <MetricNotes notes={notes} />
      </div>
    </div>
  );
}
