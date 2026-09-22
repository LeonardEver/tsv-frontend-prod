/**
 * Retention — signup cohorts observed on days 1, 7, 14 and 30.
 *
 * The rule that shapes this page: a cohort younger than N days reports
 * its D-N window as `null`, never as `0`. The backend is explicit that a
 * zero would read as churn rather than as missing data, so `null` renders
 * as "not yet observable" and is never coerced into a number — and the
 * cohort's `max_observable_day` sits beside it so the reason is visible.
 *
 * `definition` is the backend's own wording for what "retained" means
 * here (learning-active on exactly day N, boundaries in UTC) and is shown
 * verbatim. This endpoint returns no `notes` object.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/ErrorState";
import { queryKeys } from "@/lib/api/keys";
import { formatCount, formatPct } from "@/lib/format/format";
import type { AdminRetentionCohort, AdminRetentionWindow } from "@/lib/api/types";
import { fetchRetention } from "../analytics.api";
import { DataTable, Num, SectionCard, type Column } from "../charts";
import { useAnalyticsFilters } from "../filters";
import { useTr, type Tr } from "../i18n";

type CohortSize = "day" | "week" | "month";

function cohortOptions({ t }: Tr): ReadonlyArray<{ value: CohortSize; label: string }> {
  return [
    { value: "day", label: t("tabs.retention.cohortDay") },
    { value: "week", label: t("tabs.retention.cohortWeek") },
    { value: "month", label: t("tabs.retention.cohortMonth") },
  ];
}

const LIMIT_OPTIONS = [6, 12, 24, 52] as const;

/** D1/D7/D14/D30 are window names, not copy — identical in both languages. */
const WINDOWS: ReadonlyArray<"d1" | "d7" | "d14" | "d30"> = ["d1", "d7", "d14", "d30"];

const controlClass =
  "h-9 rounded-lg border border-border bg-surface-2/70 px-2 text-[13px] text-foreground outline-none focus:border-primary/50";

function RetentionCell({ value, tr }: { value: AdminRetentionWindow | null; tr: Tr }) {
  const { t, tf } = tr;
  if (value === null) {
    return (
      <span className="text-[11px] text-muted-foreground italic">{t("charts.notYetObservable")}</span>
    );
  }
  return (
    <>
      <Num>{formatPct(value.rate, 2)}</Num>
      <span className="block text-[11px] text-muted-foreground">
        {tf("tabs.retention.usersCount", { count: formatCount(value.users) })}
      </span>
    </>
  );
}

function columns(tr: Tr): Array<Column<AdminRetentionCohort>> {
  const { t, tf } = tr;
  return [
    { key: "cohort", header: t("tabs.retention.colCohort"), render: (row) => <Num>{row.cohort}</Num> },
    {
      key: "size",
      header: t("tabs.retention.colSize"),
      align: "right",
      render: (row) => <Num>{formatCount(row.cohort_size)}</Num>,
    },
    {
      key: "observable",
      header: t("tabs.retention.colObservable"),
      align: "right",
      render: (row) => <Num muted>{tf("tabs.retention.observableDay", { day: row.max_observable_day })}</Num>,
    },
    ...WINDOWS.map(
      (window): Column<AdminRetentionCohort> => ({
        key: window,
        header: window.toUpperCase(),
        align: "right",
        render: (row) => <RetentionCell value={row[window]} tr={tr} />,
      }),
    ),
  ];
}

export default function RetentionTab() {
  const { params, rangeRejected } = useAnalyticsFilters();
  const tr = useTr();
  const { t } = tr;
  const [cohort, setCohort] = useState<CohortSize>("week");
  const [limit, setLimit] = useState<number>(24);

  const retention = useQuery({
    queryKey: queryKeys.admin.analytics("retention", { ...params, cohort, limit }),
    queryFn: () => fetchRetention({ ...params, cohort, limit }),
    enabled: !rangeRejected,
    staleTime: 5 * 60_000,
  });

  return (
    <div>
      <SectionCard
        title={t("tabs.retention.title")}
        description={t("tabs.retention.description")}
        action={
          <div className="flex gap-2">
            <label className="grid gap-1">
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t("tabs.retention.cohortBy")}
              </span>
              <select
                value={cohort}
                onChange={(event) => {
                  setCohort(
                    event.target.value === "day" ? "day" : event.target.value === "month" ? "month" : "week",
                  );
                }}
                className={controlClass}
              >
                {cohortOptions(tr).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t("tabs.retention.cohorts")}
              </span>
              <select
                value={String(limit)}
                onChange={(event) => { setLimit(Number(event.target.value)); }}
                className={controlClass}
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        {rangeRejected ? (
          <p className="text-sm text-muted-foreground">{t("common.adjustRangeRetention")}</p>
        ) : retention.isError ? (
          <ErrorState
            error={retention.error}
            onRetry={() => void retention.refetch()}
            explain={tr.errorCopy}
            labels={{ retry: t("errors.retry"), reference: t("errors.reference") }}
          />
        ) : retention.isPending ? (
          <div className="h-56 animate-pulse rounded-xl bg-surface-2" aria-hidden="true" />
        ) : (
          <>
            <DataTable
              columns={columns(tr)}
              rows={retention.data.cohorts}
              getRowKey={(row) => row.cohort}
              caption={t("tabs.retention.caption")}
              emptyLabel={t("tabs.retention.empty")}
              minWidth={880}
            />
            <p className="mt-4 text-[13px] text-muted-foreground">
              {retention.data.definition.activity}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {retention.data.definition.day_boundary}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {retention.data.definition.observability}
            </p>
          </>
        )}
      </SectionCard>
    </div>
  );
}
