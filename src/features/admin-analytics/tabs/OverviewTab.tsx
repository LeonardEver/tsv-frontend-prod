/**
 * Overview — executive KPIs with a previous-period comparison.
 *
 * The comparison window is computed by the backend as the immediately
 * preceding window of equal length, and is `null` for an all-time query
 * (there is no comparable period). We render that null as "No comparison
 * period" rather than a 0% delta, which would claim flat growth.
 *
 * Every KPI on this page uses the backend's *learning-activity*
 * definition of "active" — not visits. `activity_windows.basis` carries
 * the backend's own wording and is rendered verbatim underneath.
 */
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import { formatAverage, formatCount } from "@/lib/format/format";
import { fetchOverview } from "../analytics.api";
import { DeltaHint, KpiTile, RangeEcho, SectionCard, UnsupportedBlock } from "../charts";
import { useAnalyticsFilters } from "../filters";

export default function OverviewTab() {
  const { params, rangeRejected } = useAnalyticsFilters();

  const overview = useQuery({
    queryKey: queryKeys.admin.analytics("overview", params),
    queryFn: () => fetchOverview(params),
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

  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  }

  if (overview.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="panel-2 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const { metrics, previous, activity_windows: windows, limitations, range } = overview.data;

  const kpis: ReadonlyArray<{ label: string; key: keyof typeof metrics; hint?: string }> = [
    { label: "Total users", key: "total_users" },
    { label: "New users", key: "new_users", hint: "Signed up in range" },
    { label: "Paying users", key: "paying_users", hint: "Effective plan ≠ free" },
    { label: "Free users", key: "free_users" },
    { label: "Trial users", key: "trial_users", hint: "Currently trialing" },
    { label: "Churned users", key: "churned_users", hint: "Non-free plan on file, effective free now" },
    { label: "Active users", key: "active_users", hint: "Learning-active, not visits" },
    { label: "Active days", key: "active_days" },
    { label: "Lessons completed", key: "lessons_completed", hint: "Accepted, not retry-inflated" },
    { label: "Quiz submissions", key: "quiz_submissions" },
    { label: "XP awarded", key: "xp_awarded" },
  ];

  const ratios: ReadonlyArray<{ label: string; value: number; hint: string }> = [
    {
      label: "Lessons / active user",
      value: metrics.lessons_completed_per_active_user,
      hint: "Lessons completed ÷ active users",
    },
    {
      label: "Quiz submissions / active user",
      value: metrics.quiz_submissions_per_active_user,
      hint: "Submissions ÷ active users",
    },
    {
      label: "XP / active user",
      value: metrics.xp_per_active_user,
      hint: "Awarded XP ÷ active users (retries inflate)",
    },
    {
      label: "Active days / active user",
      value: metrics.active_days_per_active_user,
      hint: "Sessions of learning per active user",
    },
  ];

  return (
    <div>
      <SectionCard
        title="Key metrics"
        description="Totals for the selected window, with the equivalent figure from the preceding window of equal length."
        action={<RangeEcho from={range.from} to={range.to} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiTile
              key={kpi.key}
              label={kpi.label}
              value={formatCount(metrics[kpi.key])}
              hint={kpi.hint}
              delta={
                <DeltaHint current={metrics[kpi.key]} previous={previous === null ? null : previous[kpi.key]} />
              }
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Per active user"
        description="Averages across the users who were learning-active in range — the backend's ratio precision is two decimals."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ratios.map((ratio) => (
            <KpiTile
              key={ratio.label}
              label={ratio.label}
              value={formatAverage(ratio.value)}
              hint={ratio.hint}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Activity windows"
        description="Measured as of the end of the selected range."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile label="DAU" value={formatCount(windows.dau)} hint="Active on the final day" />
          <KpiTile label="WAU" value={formatCount(windows.wau)} hint="Active in the trailing 7 days" />
          <KpiTile label="MAU" value={formatCount(windows.mau)} hint="Active in the trailing 30 days" />
        </div>
        {/* The backend's own definition of "active" — shown verbatim
            because every number on this page depends on it. */}
        <p className="mt-4 rounded-lg border-l-2 border-[var(--cat-navigation)] bg-surface-2/70 px-4 py-3 text-[13px] leading-relaxed text-foreground/85">
          {windows.basis}
        </p>
      </SectionCard>

      <SectionCard
        title="Not measurable from this database"
        description="The backend reports these as unsupported rather than approximating them."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <UnsupportedBlock label="Revenue / MRR / ARR" metric={limitations.revenue} />
          <UnsupportedBlock label="Upgrades & downgrades" metric={limitations.plan_changes} />
          <UnsupportedBlock label="Visit-based DAU" metric={limitations.visit_dau} />
        </div>
      </SectionCard>

    </div>
  );
}
