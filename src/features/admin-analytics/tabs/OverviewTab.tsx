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
import type { AdminOverviewMetrics } from "@/lib/api/types";
import { formatAverage, formatCount } from "@/lib/format/format";
import { fetchOverview } from "../analytics.api";
import { DeltaHint, KpiTile, RangeEcho, SectionCard, UnsupportedBlock } from "../charts";
import { useAnalyticsFilters } from "../filters";
import { useTr, type Tr } from "../i18n";

type MetricKey = keyof AdminOverviewMetrics;
/** The four ratios, so `formatAverage` receives a number rather than the
 * full metric union. */
type RatioKey =
  | "lessons_completed_per_active_user"
  | "quiz_submissions_per_active_user"
  | "xp_per_active_user"
  | "active_days_per_active_user";

function kpiTiles({ t }: Tr): ReadonlyArray<{ label: string; key: MetricKey; hint?: string }> {
  return [
    { label: t("tabs.overview.kpiTotalUsers"), key: "total_users" },
    { label: t("tabs.overview.kpiNewUsers"), key: "new_users", hint: t("tabs.overview.hintSignedUpInRange") },
    { label: t("tabs.overview.kpiPayingUsers"), key: "paying_users", hint: t("tabs.overview.hintEffectiveNotFree") },
    { label: t("tabs.overview.kpiFreeUsers"), key: "free_users" },
    { label: t("tabs.overview.kpiTrialUsers"), key: "trial_users", hint: t("tabs.overview.hintCurrentlyTrialing") },
    { label: t("tabs.overview.kpiChurnedUsers"), key: "churned_users", hint: t("tabs.overview.hintChurned") },
    { label: t("tabs.overview.kpiActiveUsers"), key: "active_users", hint: t("tabs.overview.hintLearningActive") },
    { label: t("tabs.overview.kpiActiveDays"), key: "active_days" },
    { label: t("tabs.overview.kpiLessonsCompleted"), key: "lessons_completed", hint: t("tabs.overview.hintAcceptedCompletions") },
    { label: t("tabs.overview.kpiQuizSubmissions"), key: "quiz_submissions" },
    { label: t("tabs.overview.kpiXpAwarded"), key: "xp_awarded" },
  ];
}

function ratioTiles({ t }: Tr): ReadonlyArray<{ label: string; key: RatioKey; hint: string }> {
  return [
    {
      label: t("tabs.overview.ratioLessonsPerActive"),
      key: "lessons_completed_per_active_user",
      hint: t("tabs.overview.ratioLessonsPerActiveHint"),
    },
    {
      label: t("tabs.overview.ratioQuizzesPerActive"),
      key: "quiz_submissions_per_active_user",
      hint: t("tabs.overview.ratioQuizzesPerActiveHint"),
    },
    {
      label: t("tabs.overview.ratioXpPerActive"),
      key: "xp_per_active_user",
      hint: t("tabs.overview.ratioXpPerActiveHint"),
    },
    {
      label: t("tabs.overview.ratioActiveDaysPerActive"),
      key: "active_days_per_active_user",
      hint: t("tabs.overview.ratioActiveDaysPerActiveHint"),
    },
  ];
}

export default function OverviewTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t } = tr;

  const overview = useQuery({
    queryKey: queryKeys.admin.analytics("overview", params),
    queryFn: () => fetchOverview(params),
    enabled: !rangeRejected,
    staleTime: 60_000,
  });

  if (rangeRejected) {
    return <p className="panel p-6 text-sm text-muted-foreground">{t("common.adjustRange")}</p>;
  }

  if (overview.isError) {
    return (
      <ErrorState
        error={overview.error}
        onRetry={() => void overview.refetch()}
        explain={tr.errorCopy}
        labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
      />
    );
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

  const kpis = kpiTiles(tr);
  const ratios = ratioTiles(tr);

  return (
    <div>
      <SectionCard
        title={t("tabs.overview.keyMetricsTitle")}
        description={t("tabs.overview.keyMetricsDescription")}
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
                <DeltaHint
                  current={metrics[kpi.key]}
                  previous={previous === null ? null : previous[kpi.key]}
                />
              }
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.overview.perActiveUserTitle")}
        description={t("tabs.overview.perActiveUserDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ratios.map((ratio) => (
            <KpiTile
              key={ratio.label}
              label={ratio.label}
              value={formatAverage(metrics[ratio.key])}
              hint={ratio.hint}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={t("tabs.overview.windowsTitle")}
        description={t("tabs.overview.windowsDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            label={t("tabs.overview.dau")}
            value={formatCount(windows.dau)}
            hint={t("tabs.overview.dauHint")}
          />
          <KpiTile
            label={t("tabs.overview.wau")}
            value={formatCount(windows.wau)}
            hint={t("tabs.overview.wauHint")}
          />
          <KpiTile
            label={t("tabs.overview.mau")}
            value={formatCount(windows.mau)}
            hint={t("tabs.overview.mauHint")}
          />
        </div>
        {/* The backend's own definition of "active" — shown verbatim
            because every number on this page depends on it. */}
        <p className="mt-4 rounded-lg border-l-2 border-[var(--cat-navigation)] bg-surface-2/70 px-4 py-3 text-[13px] leading-relaxed text-foreground/85">
          {windows.basis}
        </p>
      </SectionCard>

      <SectionCard
        title={t("tabs.overview.unsupportedTitle")}
        description={t("tabs.overview.unsupportedDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <UnsupportedBlock label={t("tabs.overview.unsupportedRevenue")} metric={limitations.revenue} />
          <UnsupportedBlock label={t("tabs.overview.unsupportedPlanChanges")} metric={limitations.plan_changes} />
          <UnsupportedBlock label={t("tabs.overview.unsupportedVisitDau")} metric={limitations.visit_dau} />
        </div>
      </SectionCard>

    </div>
  );
}
